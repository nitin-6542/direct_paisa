import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ENUMS
export const ROLES = {
  MD: "MD",
  AM: "AM",
  TL: "TL",
  EMPLOYEE: "EMPLOYEE"
} as const;

export const LEAD_STATUS = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  CONVERTED: "Converted",
  LOST: "Lost"
} as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // MD, AM, TL, EMPLOYEE
  phone: text("phone"),
  employeeId: text("employee_id"),
  region: text("region"),
  // optional profile image URL
  avatarUrl: text("avatar_url"),
  areaManagerId: integer("area_manager_id"),
  teamLeaderId: integer("team_leader_id"),
  isActive: boolean("is_active").default(true),
  lastLocationLat: numeric("last_location_lat"),
  lastLocationLng: numeric("last_location_lng"),
  lastLocationTimestamp: timestamp("last_location_timestamp"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  company: text("company"),
  loanAmount: integer("loan_amount"),
  status: text("status").notNull().default(LEAD_STATUS.NEW),
  notes: text("notes"),
  assignedToId: integer("assigned_to_id"),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  screenshotUrl: text("screenshot_url"),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  checkInTime: timestamp("check_in_time").notNull(),
  checkOutTime: timestamp("check_out_time"),
  checkInLat: numeric("check_in_lat"),
  checkInLng: numeric("check_in_lng"),
  checkOutLat: numeric("check_out_lat"),
  checkOutLng: numeric("check_out_lng"),
  date: text("date").notNull(), // YYYY-MM-DD
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  logoUrl: text("logo_url"),
  website: text("website"),
  // loan_support: 'personal' | 'business' | 'both'
  loanSupport: text("loan_support"),
  // additional info or eligibility notes shown on company card
  infoText: text("info_text"),
  // supported loan product types (comma-separated list): e.g. "personal,car,home,credit_card,business"
  loanTypes: text("loan_types"),
  // optional avatar/profile image for companies or users
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aboutUs = pgTable("about_us", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const homeSettings = pgTable("home_settings", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLocationLat: true,
  lastLocationLng: true,
  lastLocationTimestamp: true
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  createdById: true
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true
});

export const insertAboutUsSchema = createInsertSchema(aboutUs).omit({
  id: true,
  updatedAt: true
});

export const insertHomeSettingsSchema = createInsertSchema(homeSettings).omit({
  id: true,
  updatedAt: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type AboutUs = typeof aboutUs.$inferSelect;
export type InsertAboutUs = z.infer<typeof insertAboutUsSchema>;

export type HomeSettings = typeof homeSettings.$inferSelect;
export type InsertHomeSettings = z.infer<typeof insertHomeSettingsSchema>;

export type SafeUser = Omit<User, "password">;
