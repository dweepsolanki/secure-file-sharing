import { 
  users, User, InsertUser, 
  files, File, InsertFile,
  sharedFiles, SharedFile, InsertSharedFile,
  encryptionKeys, EncryptionKey, InsertEncryptionKey,
  auditLogs, AuditLog, InsertAuditLog,
  securitySettings, SecuritySetting, InsertSecuritySetting,
  FileWithSharing, SharedFileWithDetails
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // File methods
  getFile(id: number): Promise<File | undefined>;
  getFilesByOwnerId(ownerId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<File>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  
  // Shared files methods
  getSharedFile(id: number): Promise<SharedFile | undefined>;
  getSharedFilesByUserId(userId: number): Promise<SharedFileWithDetails[]>;
  getSharedFilesByFileId(fileId: number): Promise<SharedFile[]>;
  createSharedFile(sharedFile: InsertSharedFile): Promise<SharedFile>;
  updateSharedFile(id: number, updates: Partial<SharedFile>): Promise<SharedFile | undefined>;
  deleteSharedFile(id: number): Promise<boolean>;
  
  // Encryption keys methods
  getEncryptionKey(id: number): Promise<EncryptionKey | undefined>;
  getActiveKeyByType(keyType: string): Promise<EncryptionKey | undefined>;
  getAllKeys(): Promise<EncryptionKey[]>;
  createEncryptionKey(key: InsertEncryptionKey): Promise<EncryptionKey>;
  updateEncryptionKey(id: number, updates: Partial<EncryptionKey>): Promise<EncryptionKey | undefined>;
  rotateKey(id: number): Promise<EncryptionKey | undefined>;
  
  // Audit logs methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  
  // Security settings methods
  getSecuritySettings(userId: number): Promise<SecuritySetting | undefined>;
  createSecuritySettings(settings: InsertSecuritySetting): Promise<SecuritySetting>;
  updateSecuritySettings(userId: number, updates: Partial<SecuritySetting>): Promise<SecuritySetting | undefined>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private sharedFiles: Map<number, SharedFile>;
  private encryptionKeys: Map<number, EncryptionKey>;
  private auditLogs: Map<number, AuditLog>;
  private securitySettings: Map<number, SecuritySetting>;
  
  userIdCounter: number;
  fileIdCounter: number;
  sharedFileIdCounter: number;
  encryptionKeyIdCounter: number;
  auditLogIdCounter: number;
  securitySettingIdCounter: number;
  
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.sharedFiles = new Map();
    this.encryptionKeys = new Map();
    this.auditLogs = new Map();
    this.securitySettings = new Map();
    
    this.userIdCounter = 1;
    this.fileIdCounter = 1;
    this.sharedFileIdCounter = 1;
    this.encryptionKeyIdCounter = 1;
    this.auditLogIdCounter = 1;
    this.securitySettingIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser, 
      id, 
      twoFactorEnabled: false,
      createdAt: new Date(),
      lastActive: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // File methods
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByOwnerId(ownerId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.ownerId === ownerId
    );
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.fileIdCounter++;
    const file: File = { 
      ...insertFile, 
      id, 
      createdAt: new Date(),
      lastAccessed: new Date()
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: number, updates: Partial<File>): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;
    
    const updatedFile = { ...file, ...updates };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    // Also delete all related shared files
    Array.from(this.sharedFiles.values())
      .filter(sf => sf.fileId === id)
      .forEach(sf => this.sharedFiles.delete(sf.id));
    
    return this.files.delete(id);
  }

  // Shared files methods
  async getSharedFile(id: number): Promise<SharedFile | undefined> {
    return this.sharedFiles.get(id);
  }

  async getSharedFilesByUserId(userId: number): Promise<SharedFileWithDetails[]> {
    const shared = Array.from(this.sharedFiles.values()).filter(
      (sf) => sf.userId === userId
    );
    
    return shared.map(sf => {
      const file = this.files.get(sf.fileId);
      const owner = file ? this.users.get(file.ownerId) : undefined;
      
      return {
        ...sf,
        file: file ? { ...file, owner } : undefined
      };
    });
  }

  async getSharedFilesByFileId(fileId: number): Promise<SharedFile[]> {
    return Array.from(this.sharedFiles.values()).filter(
      (sf) => sf.fileId === fileId
    );
  }

  async createSharedFile(insertSharedFile: InsertSharedFile): Promise<SharedFile> {
    const id = this.sharedFileIdCounter++;
    const sharedFile: SharedFile = { 
      ...insertSharedFile, 
      id, 
      createdAt: new Date()
    };
    this.sharedFiles.set(id, sharedFile);
    return sharedFile;
  }

  async updateSharedFile(id: number, updates: Partial<SharedFile>): Promise<SharedFile | undefined> {
    const sharedFile = this.sharedFiles.get(id);
    if (!sharedFile) return undefined;
    
    const updatedSharedFile = { ...sharedFile, ...updates };
    this.sharedFiles.set(id, updatedSharedFile);
    return updatedSharedFile;
  }

  async deleteSharedFile(id: number): Promise<boolean> {
    return this.sharedFiles.delete(id);
  }

  // Encryption keys methods
  async getEncryptionKey(id: number): Promise<EncryptionKey | undefined> {
    return this.encryptionKeys.get(id);
  }

  async getActiveKeyByType(keyType: string): Promise<EncryptionKey | undefined> {
    return Array.from(this.encryptionKeys.values()).find(
      (key) => key.keyType === keyType && key.isActive
    );
  }

  async getAllKeys(): Promise<EncryptionKey[]> {
    return Array.from(this.encryptionKeys.values());
  }

  async createEncryptionKey(insertKey: InsertEncryptionKey): Promise<EncryptionKey> {
    const id = this.encryptionKeyIdCounter++;
    const key: EncryptionKey = { 
      ...insertKey, 
      id, 
      createdAt: new Date(),
      rotatedAt: null
    };
    this.encryptionKeys.set(id, key);
    
    // If this is a new active key, deactivate other keys of the same type
    if (key.isActive) {
      for (const [keyId, existingKey] of this.encryptionKeys.entries()) {
        if (keyId !== id && existingKey.keyType === key.keyType && existingKey.isActive) {
          this.encryptionKeys.set(keyId, { 
            ...existingKey, 
            isActive: false, 
            rotatedAt: new Date() 
          });
        }
      }
    }
    
    return key;
  }

  async updateEncryptionKey(id: number, updates: Partial<EncryptionKey>): Promise<EncryptionKey | undefined> {
    const key = this.encryptionKeys.get(id);
    if (!key) return undefined;
    
    const updatedKey = { ...key, ...updates };
    this.encryptionKeys.set(id, updatedKey);
    return updatedKey;
  }

  async rotateKey(id: number): Promise<EncryptionKey | undefined> {
    const key = this.encryptionKeys.get(id);
    if (!key) return undefined;
    
    // Mark current key as inactive
    const updatedKey = { ...key, isActive: false, rotatedAt: new Date() };
    this.encryptionKeys.set(id, updatedKey);
    
    return updatedKey;
  }

  // Audit logs methods
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = this.auditLogIdCounter++;
    const log: AuditLog = { 
      ...insertLog, 
      id, 
      timestamp: new Date()
    };
    this.auditLogs.set(id, log);
    return log;
  }

  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    const logs = Array.from(this.auditLogs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? logs.slice(0, limit) : logs;
  }

  // Security settings methods
  async getSecuritySettings(userId: number): Promise<SecuritySetting | undefined> {
    return Array.from(this.securitySettings.values()).find(
      (settings) => settings.userId === userId
    );
  }

  async createSecuritySettings(insertSettings: InsertSecuritySetting): Promise<SecuritySetting> {
    const id = this.securitySettingIdCounter++;
    const settings: SecuritySetting = { 
      ...insertSettings, 
      id, 
      updatedAt: new Date() 
    };
    this.securitySettings.set(id, settings);
    return settings;
  }

  async updateSecuritySettings(userId: number, updates: Partial<SecuritySetting>): Promise<SecuritySetting | undefined> {
    const settings = Array.from(this.securitySettings.values()).find(
      (s) => s.userId === userId
    );
    
    if (!settings) return undefined;
    
    const updatedSettings = { 
      ...settings, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.securitySettings.set(settings.id, updatedSettings);
    return updatedSettings;
  }
}

export const storage = new MemStorage();
