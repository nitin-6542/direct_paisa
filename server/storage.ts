import { db } from "./db";
import { users, leads, attendance, companies, aboutUs, type User, type InsertUser, type Lead, type InsertLead, type Attendance, type InsertAttendance, type Company, type InsertCompany, type AboutUs, type InsertAboutUs } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getUsers(): Promise<User[]>;

  getLeads(): Promise<Lead[]>;
  createLead(lead: InsertLead & { createdById: number }): Promise<Lead>;
  updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead>;
  deleteLead(id: number): Promise<void>;

  getAttendance(): Promise<Attendance[]>;
  createAttendance(att: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance>;

  updateUserLocation(userId: number, lat: string, lng: string): Promise<void>;

  getCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: number): Promise<void>;

  getAboutUs(): Promise<AboutUs | undefined>;
  upsertAboutUs(content: string): Promise<AboutUs>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
  }

  async createLead(lead: InsertLead & { createdById: number }): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead> {
    const [updated] = await db.update(leads).set(updates).where(eq(leads.id, id)).returning();
    return updated;
  }

  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  async getAttendance(): Promise<Attendance[]> {
    return await db.select().from(attendance);
  }

  async createAttendance(att: InsertAttendance): Promise<Attendance> {
    const [created] = await db.insert(attendance).values(att).returning();
    return created;
  }

  async updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance> {
    const [updated] = await db.update(attendance).set(updates).where(eq(attendance.id, id)).returning();
    return updated;
  }

  async updateUserLocation(userId: number, lat: string, lng: string): Promise<void> {
    await db.update(users)
      .set({ lastLocationLat: lat, lastLocationLng: lng, lastLocationTimestamp: new Date() })
      .where(eq(users.id, userId));
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company> {
    const [updated] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning();
    return updated;
  }

  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async getAboutUs(): Promise<AboutUs | undefined> {
    const result = await db.select().from(aboutUs).limit(1);
    return result[0];
  }

  async upsertAboutUs(content: string): Promise<AboutUs> {
    const existing = await this.getAboutUs();
    if (existing) {
      const [updated] = await db.update(aboutUs).set({ content, updatedAt: new Date() }).where(eq(aboutUs.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(aboutUs).values({ content }).returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();