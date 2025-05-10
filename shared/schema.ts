import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model and schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastActive: timestamp("last_active"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
});

// File model and schema
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(),
  encryptionType: text("encryption_type").notNull(),
  encryptedKey: text("encrypted_key"),
  iv: text("iv"),
  path: text("path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastAccessed: timestamp("last_accessed"),
  isSensitive: boolean("is_sensitive").notNull().default(false),
});

export const insertFileSchema = createInsertSchema(files).pick({
  ownerId: true,
  name: true,
  size: true,
  type: true,
  encryptionType: true,
  encryptedKey: true,
  iv: true,
  path: true,
  isSensitive: true,
});

// Shared files model and schema
export const sharedFiles = pgTable("shared_files", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull(),
  userId: integer("user_id").notNull(),
  permission: text("permission").notNull().default("view"), // view, edit, admin
  allowReshare: boolean("allow_reshare").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSharedFileSchema = createInsertSchema(sharedFiles).pick({
  fileId: true,
  userId: true,
  permission: true,
  allowReshare: true,
  expiresAt: true,
});

// Encryption keys model and schema
export const encryptionKeys = pgTable("encryption_keys", {
  id: serial("id").primaryKey(),
  keyType: text("key_type").notNull(), // aes, kyber
  keyId: text("key_id").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  rotatedAt: timestamp("rotated_at"),
  publicKey: text("public_key"),
  metadata: json("metadata"),
});

export const insertEncryptionKeySchema = createInsertSchema(encryptionKeys).pick({
  keyType: true,
  keyId: true,
  name: true,
  isActive: true,
  publicKey: true,
  metadata: true,
});

// Audit logs model and schema
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  resource: text("resource"),
  resourceId: text("resource_id"),
  details: json("details"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).pick({
  userId: true,
  action: true,
  resource: true,
  resourceId: true,
  details: true,
  ipAddress: true,
});

// Security settings model and schema
export const securitySettings = pgTable("security_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  keyRotationDays: integer("key_rotation_days").notNull().default(30),
  defaultEncryption: text("default_encryption").notNull().default("aes"),
  enforceQuantumForSensitive: boolean("enforce_quantum_for_sensitive").notNull().default(true),
  autoEncrypt: boolean("auto_encrypt").notNull().default(true),
  secureDelete: boolean("secure_delete").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSecuritySettingsSchema = createInsertSchema(securitySettings).pick({
  userId: true,
  keyRotationDays: true,
  defaultEncryption: true,
  enforceQuantumForSensitive: true,
  autoEncrypt: true,
  secureDelete: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type SharedFile = typeof sharedFiles.$inferSelect;
export type InsertSharedFile = z.infer<typeof insertSharedFileSchema>;

export type EncryptionKey = typeof encryptionKeys.$inferSelect;
export type InsertEncryptionKey = z.infer<typeof insertEncryptionKeySchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type SecuritySetting = typeof securitySettings.$inferSelect;
export type InsertSecuritySetting = z.infer<typeof insertSecuritySettingsSchema>;

// Extended types for client use
export interface FileWithSharing extends File {
  owner?: User;
  sharedWith?: SharedFile[];
}

export interface SharedFileWithDetails extends SharedFile {
  file?: File;
  user?: User;
}
