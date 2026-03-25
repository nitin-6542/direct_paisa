import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  authorizeRoles,
} from "./auth";
import { ROLES, LEAD_STATUS } from "@shared/schema";
import multer from "multer";
import cloudinary from "./cloudinary";
export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Seed the MD account
  async function seedDatabase() {
    const mdEmail = "md@paisabazar247.com";
    const existingUser = await storage.getUserByEmail(mdEmail);
    if (!existingUser) {
      const hashedPassword = await hashPassword("admin123");
      await storage.createUser({
        name: "Managing Director",
        email: mdEmail,
        password: hashedPassword,
        role: ROLES.MD,
        phone: "1234567890",
        isActive: true,
      });
      console.log("Seeded MD user: md@paisabazar247.com / admin123");
    }
  }
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  });
  //UPLOAD SCREENSHOT

  app.post(
    "/api/upload",
    verifyToken,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "File required" });
        }

        if (!req.file.mimetype.startsWith("image/")) {
          return res.status(400).json({ message: "Only images allowed" });
        }

        const result = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: "leads",
                resource_type: "image",
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              },
            )
            .end(req.file!.buffer);
        });

        res.json({
          url: result.secure_url,
          publicId: result.public_id,
        });
      } catch (error: any) {
        console.error("CLOUDINARY ERROR:", error);
        res.status(500).json({
          message: "Upload failed",
          error: error?.message,
        });
      }
    },
  );
  // Auth Routes
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { email, password } = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(email);

      console.log(`Login attempt for: ${email}`);
      if (!user) {
        console.log(`User not found: ${email}`);
        return res
          .status(401)
          .json({ message: "Invalid credentials or inactive account" });
      }

      if (!user.isActive) {
        console.log(`User inactive: ${email}`);
        return res
          .status(401)
          .json({ message: "Invalid credentials or inactive account" });
      }

      const isValid = await comparePassword(password, user.password);
      console.log(`Password valid: ${isValid}`);

      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken(user.id, user.role);
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json({ token, user: userWithoutPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(401).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.auth.me.path, verifyToken, (req, res) => {
    const user = (req as any).user;
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  });

  // User Management
  app.get(api.users.list.path, verifyToken, async (req, res) => {
    const user = (req as any).user;
    let usersList = await storage.getUsers();

    // Role-based filtering
    if (user.role === ROLES.AM) {
      usersList = usersList.filter(
        (u) => u.areaManagerId === user.id || u.id === user.id,
      );
    } else if (user.role === ROLES.TL) {
      usersList = usersList.filter(
        (u) => u.teamLeaderId === user.id || u.id === user.id,
      );
    } else if (user.role === ROLES.EMPLOYEE) {
      usersList = usersList.filter((u) => u.id === user.id);
    }

    const safeUsers = usersList.map((u) => {
      const { password: _, ...rest } = u;
      return rest;
    });
    res.status(200).json(safeUsers);
  });


  app.post(
    api.users.create.path,
    verifyToken,
    authorizeRoles(ROLES.MD, ROLES.AM, ROLES.TL),
    async (req, res) => {
      try {
        const user = (req as any).user;
        const input = api.users.create.input.parse(req.body);

        // Hierarchy validation
        if (
          user.role === ROLES.AM &&
          input.role !== ROLES.TL &&
          input.role !== ROLES.EMPLOYEE
        ) {
          return res
            .status(401)
            .json({ message: "AM can only create TL or Employee" });
        }
        if (user.role === ROLES.TL && input.role !== ROLES.EMPLOYEE) {
          return res
            .status(401)
            .json({ message: "TL can only create Employee" });
        }

        // Check if email exists
        const existing = await storage.getUserByEmail(input.email);
        if (existing) {
          return res.status(400).json({ message: "Email already exists" });
        }

        const passwordToHash = input.password || "password123";
        const hashedPassword = await hashPassword(passwordToHash);

        const newUser: any = {
          ...input,
          password: hashedPassword,
          isActive: true,
        };

        // Auto-assign hierarchy based on creator
        if (user.role === ROLES.AM) {
          newUser.areaManagerId = user.id;
        } else if (user.role === ROLES.TL) {
          newUser.teamLeaderId = user.id;
          newUser.areaManagerId = user.areaManagerId;
        }

        const created = await storage.createUser(newUser);
        const { password: __, ...safeUser } = created;
        res.status(201).json(safeUser);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join("."),
          });
        }
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.put(api.users.update.path, verifyToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const targetId = Number(req.params.id);
      const input = api.users.update.input.parse(req.body);

      // Simple permission check: MD can update anyone, otherwise can only update self
      if (user.role !== ROLES.MD && user.id !== targetId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (input.password) {
        input.password = await hashPassword(input.password);
      }

      const updated = await storage.updateUser(targetId, input);
      const { password: _, ...safeUser } = updated;
      res.status(200).json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(404).json({ message: "Not found" });
    }
  });

  app.delete(
    api.users.delete.path,
    verifyToken,
    authorizeRoles(ROLES.MD),
    async (req, res) => {
      await storage.deleteUser(Number(req.params.id));
      res.status(204).send();
    },
  );

  // Leads Management
  app.get(api.leads.list.path, verifyToken, async (req, res) => {
    const user = (req as any).user;
    let leadsList = await storage.getLeads();

    // Filtering based on role hierarchy
    if (user.role === ROLES.EMPLOYEE) {
      leadsList = leadsList.filter(
        (l) => l.assignedToId === user.id || l.createdById === user.id,
      );
    } else if (user.role === ROLES.TL) {
      const teamUsers = await storage.getUsers();
      const myTeamIds = teamUsers
        .filter((u) => u.teamLeaderId === user.id)
        .map((u) => u.id);
      myTeamIds.push(user.id);
      leadsList = leadsList.filter(
        (l) =>
          myTeamIds.includes(l.assignedToId || 0) ||
          myTeamIds.includes(l.createdById),
      );
    } else if (user.role === ROLES.AM) {
      const teamUsers = await storage.getUsers();
      const myTeamIds = teamUsers
        .filter((u) => u.areaManagerId === user.id)
        .map((u) => u.id);
      myTeamIds.push(user.id);
      leadsList = leadsList.filter(
        (l) =>
          myTeamIds.includes(l.assignedToId || 0) ||
          myTeamIds.includes(l.createdById),
      );
    }

    res.status(200).json(leadsList);
  });

  app.post(api.leads.create.path, verifyToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const input = api.leads.create.input.parse(req.body);

      const payload = {
        ...input,
        createdById: user.id,
        assignedToId: input.assignedToId || user.id
      };

      const lead = await storage.createLead(payload);
      res.status(201).json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.leads.update.path, verifyToken, async (req, res) => {
    try {
      const input = api.leads.update.input.parse(req.body);
      const lead = await storage.updateLead(Number(req.params.id), input);
      res.status(200).json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(404).json({ message: "Not found" });
    }
  });

  // Delete lead
  app.delete('/api/leads/:id', verifyToken, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteLead(id); // Permanently delete lead
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Attendance
  app.get(api.attendance.list.path, verifyToken, async (req, res) => {
    const user = (req as any).user;
    let attList = await storage.getAttendance();

    if (user.role === ROLES.EMPLOYEE) {
      attList = attList.filter((a) => a.userId === user.id);
    } else if (user.role === ROLES.TL) {
      const teamUsers = await storage.getUsers();
      const myTeamIds = teamUsers
        .filter((u) => u.teamLeaderId === user.id)
        .map((u) => u.id);
      myTeamIds.push(user.id);
      attList = attList.filter((a) => myTeamIds.includes(a.userId));
    } else if (user.role === ROLES.AM) {
      const teamUsers = await storage.getUsers();
      const myTeamIds = teamUsers
        .filter((u) => u.areaManagerId === user.id)
        .map((u) => u.id);
      myTeamIds.push(user.id);
      attList = attList.filter((a) => myTeamIds.includes(a.userId));
    }

    res.status(200).json(attList);
  });

  app.post(api.attendance.checkin.path, verifyToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const { lat, lng } = api.attendance.checkin.input.parse(req.body);
      const today = new Date().toISOString().split("T")[0];

      // Prevent double check-in
      const allAtt = await storage.getAttendance();
      const existing = allAtt.find(
        (a) => a.userId === user.id && a.date === today,
      );
      if (existing) {
        return res.status(400).json({ message: "Already checked in today" });
      }

      const att = await storage.createAttendance({
        userId: user.id,
        checkInTime: new Date(),
        checkInLat: lat,
        checkInLng: lng,
        date: today,
      });
      // also update user's last known location so live location shows them as online
      try {
        await storage.updateUserLocation(user.id, lat, lng);
      } catch (e) {
        console.warn('Failed to update user location on checkin', e);
      }
      res.status(201).json(att);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.attendance.checkout.path, verifyToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const { lat, lng } = api.attendance.checkout.input.parse(req.body);
      const today = new Date().toISOString().split("T")[0];

      const allAtt = await storage.getAttendance();
      const existing = allAtt.find(
        (a) => a.userId === user.id && a.date === today,
      );

      if (!existing) {
        return res.status(404).json({ message: "No check-in found for today" });
      }

      const att = await storage.updateAttendance(existing.id, {
        checkOutTime: new Date(),
        checkOutLat: lat,
        checkOutLng: lng,
      });
      // update user's location on checkout as well
      try {
        await storage.updateUserLocation(user.id, lat, lng);
      } catch (e) {
        console.warn('Failed to update user location on checkout', e);
      }
      res.status(200).json(att);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Location
  app.post(api.location.update.path, verifyToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const { lat, lng } = api.location.update.input.parse(req.body);
      await storage.updateUserLocation(user.id, lat, lng);
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.location.team.path, verifyToken, async (req, res) => {
    const user = (req as any).user;
    let teamUsers = await storage.getUsers();

    if (user.role === ROLES.TL) {
      teamUsers = teamUsers.filter((u) => u.teamLeaderId === user.id);
    } else if (user.role === ROLES.AM) {
      teamUsers = teamUsers.filter((u) => u.areaManagerId === user.id);
    } else if (user.role === ROLES.EMPLOYEE) {
      teamUsers = []; // Employee cannot see others' locations
    }

    const locations = teamUsers
      .filter((u) => u.lastLocationLat && u.lastLocationLng)
      .map((u) => {
        // compute a simple "active" flag if last location was updated recently (e.g., within 2 minutes)
        const active = !!(
          u.lastLocationTimestamp &&
          Date.now() - new Date(u.lastLocationTimestamp).getTime() < 2 * 60 * 1000
        );
        return {
          userId: u.id,
          name: u.name,
          lat: String(u.lastLocationLat),
          lng: String(u.lastLocationLng),
          timestamp: u.lastLocationTimestamp
            ? u.lastLocationTimestamp.toISOString()
            : new Date().toISOString(),
          // include role and hierarchy ids so client can make accurate visibility decisions
          role: u.role,
          teamLeaderId: u.teamLeaderId,
          managerId: u.areaManagerId,
          isActive: !!u.isActive,
          active,
        };
      });

    res.status(200).json(locations);
  });

  // Companies Routes
  app.get(api.companies.list.path, verifyToken, async (req, res) => {
    const companiesList = await storage.getCompanies();
    res.status(200).json(companiesList);
  });

  app.post(
    api.companies.create.path,
    verifyToken,
    authorizeRoles(ROLES.MD),
    async (req, res) => {
      try {
        const input = api.companies.create.input.parse(req.body);
        const created = await storage.createCompany(input);
        res.status(201).json(created);
      } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({ message: err.errors[0].message });
        }
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put(
    api.companies.update.path,
    verifyToken,
    authorizeRoles(ROLES.MD),
    async (req, res) => {
      try {
        const input = api.companies.update.input.parse(req.body);
        const updated = await storage.updateCompany(Number(req.params.id), input);
        res.json(updated);
      } catch (err) {
        res.status(400).json({ message: "Invalid request" });
      }
    }
  );

  app.delete(
    api.companies.delete.path,
    verifyToken,
    authorizeRoles(ROLES.MD),
    async (req, res) => {
      try {
        await storage.deleteCompany(Number(req.params.id));
        res.status(204).send();
      } catch (err) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // About Us Routes
  app.get(api.aboutUs.get.path, async (req, res) => {
    const aboutUsData = await storage.getAboutUs();
    res.json(aboutUsData || null);
  });

  app.post(
    api.aboutUs.update.path,
    verifyToken,
    authorizeRoles(ROLES.MD),
    async (req, res) => {
      try {
        const { content } = req.body;
        const updated = await storage.upsertAboutUs(content);
        res.json(updated);
      } catch (err) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Home Settings Routes
  app.get(api.homeSettings.get.path, verifyToken, async (req, res) => {
    const settings = await storage.getHomeSettings();
    res.json(settings || null);
  });

  app.post(
    api.homeSettings.update.path,
    verifyToken,
    authorizeRoles(ROLES.MD),
    async (req, res) => {
      try {
        const { imageUrl } = req.body;
        const updated = await storage.upsertHomeSettings(imageUrl);
        res.json(updated);
      } catch (err) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  //Dashboard
  app.get(api.dashboard.path, verifyToken, async (req, res) => {
    const user = (req as any).user;

    const allUsers = await storage.getUsers();
    const allLeads = await storage.getLeads();
    const allAttendance = await storage.getAttendance();

    let filteredUsers = allUsers;
    let filteredLeads = allLeads;
    let filteredAttendance = allAttendance;

    // Role-based filtering
    if (user.role === ROLES.EMPLOYEE) {
      filteredLeads = allLeads.filter(
        (l) => l.createdById === user.id || l.assignedToId === user.id,
      );
      filteredAttendance = allAttendance.filter((a) => a.userId === user.id);
    } else if (user.role === ROLES.TL) {
      const teamIds = allUsers
        .filter((u) => u.teamLeaderId === user.id)
        .map((u) => u.id);

      teamIds.push(user.id);

      filteredLeads = allLeads.filter(
        (l) =>
          teamIds.includes(l.createdById) ||
          teamIds.includes(l.assignedToId || 0),
      );

      filteredAttendance = allAttendance.filter((a) =>
        teamIds.includes(a.userId),
      );

      filteredUsers = allUsers.filter((u) => teamIds.includes(u.id));
    } else if (user.role === ROLES.AM) {
      const teamIds = allUsers
        .filter((u) => u.areaManagerId === user.id)
        .map((u) => u.id);

      teamIds.push(user.id);

      filteredLeads = allLeads.filter(
        (l) =>
          teamIds.includes(l.createdById) ||
          teamIds.includes(l.assignedToId || 0),
      );

      filteredAttendance = allAttendance.filter((a) =>
        teamIds.includes(a.userId),
      );

      filteredUsers = allUsers.filter((u) => teamIds.includes(u.id));
    }

    // Stats calculation
    const today = new Date().toISOString().split("T")[0];

    const todayAttendance = filteredAttendance.filter((a) => a.date === today);

    const convertedLeads = filteredLeads.filter(
      (l) => l.status === LEAD_STATUS.CONVERTED,
    );

    const conversionRate =
      filteredLeads.length > 0
        ? ((convertedLeads.length / filteredLeads.length) * 100).toFixed(1) +
        "%"
        : "0%";

    // Generate events for both Leads and Attendance
    const leadEvents = filteredLeads.map((l) => ({
      id: `lead-${l.id}`,
      type: "lead",
      action:
        l.status === LEAD_STATUS.CONVERTED
          ? "Lead converted"
          : "New lead added",
      name: allUsers.find((u) => u.id === l.createdById)?.name || "Unknown",
      company: l.company,
      time: l.createdAt || new Date(),
    }));

    const attendanceEvents: any[] = [];
    const seenAtt = new Set();
    
    filteredAttendance.forEach((a) => {
      const inKey = `in-${a.userId}-${a.date}`;
      if (!seenAtt.has(inKey)) {
        seenAtt.add(inKey);
        attendanceEvents.push({
          id: `attendance-in-${a.id}`,
          type: "attendance",
          action: "Employee checked in",
          name: allUsers.find((u) => u.id === a.userId)?.name || "Unknown",
          location: "Checked in",
          time: a.checkInTime,
        });
      }

      if (a.checkOutTime) {
        const outKey = `out-${a.userId}-${a.date}`;
        if (!seenAtt.has(outKey)) {
          seenAtt.add(outKey);
          attendanceEvents.push({
            id: `attendance-out-${a.id}`,
            type: "attendance",
            action: "Employee checked out",
            name: allUsers.find((u) => u.id === a.userId)?.name || "Unknown",
            location: "Checked out",
            time: a.checkOutTime,
          });
        }
      }
    });

    const recentActivity = [...leadEvents, ...attendanceEvents]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 6);

    res.json({
      totalLeads: filteredLeads.length,
      todayAttendance:
        user.role === ROLES.EMPLOYEE
          ? todayAttendance.length > 0
            ? "Present"
            : "Absent"
          : `${todayAttendance.length}/${filteredUsers.length}`,
      activeEmployees:
        user.role === ROLES.EMPLOYEE ? null : filteredUsers.length,
      conversionRate,
      recentActivity,
    });
  });

  // Run seed script
  await seedDatabase();

  // Auto punch-out missing checkouts from previous days
  const runAutoCheckout = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const allAtt = await storage.getAttendance();
      const missingCheckout = allAtt.filter(
        (a) => a.date < today && a.checkOutTime === null
      );
      for (const att of missingCheckout) {
        // Set checkout time to 23:59:59 of that specific date
        const eod = new Date(`${att.date}T23:59:59`);
        await storage.updateAttendance(att.id, {
          checkOutTime: eod,
        });
        console.log(`Auto checked-out user ${att.userId} for date ${att.date}`);
      }
    } catch (err) {
      console.error("Auto checkout error", err);
    }
  };

  runAutoCheckout();
  setInterval(runAutoCheckout, 1000 * 60 * 60); // Check once an hour

  return httpServer;
}
