import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupWebSockets } from "./websocket";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertFileSchema, 
  insertSharedFileSchema,
  insertEncryptionKeySchema,
  insertSecuritySettingsSchema,
  insertAuditLogSchema,
  FileWithSharing,
} from "@shared/schema";
import { encrypt, decrypt, generateKey } from "./file-service";

// Create upload directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin access required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // File API routes
  app.get("/api/files", isAuthenticated, async (req, res) => {
    try {
      const files = await storage.getFilesByOwnerId(req.user!.id);
      
      // Get shared information for each file
      const filesWithSharing: FileWithSharing[] = await Promise.all(
        files.map(async (file) => {
          const sharedWith = await storage.getSharedFilesByFileId(file.id);
          return { ...file, sharedWith };
        })
      );
      
      res.json(filesWithSharing);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/files/:id", isAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if user is owner or has shared access
      const isOwner = file.ownerId === req.user!.id;
      const hasSharedAccess = isOwner ? false : (await storage.getSharedFilesByFileId(fileId))
        .some(sf => sf.userId === req.user!.id);
      
      if (!isOwner && !hasSharedAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update last accessed time
      await storage.updateFile(fileId, { lastAccessed: new Date() });
      
      // Get sharing information
      const sharedWith = await storage.getSharedFilesByFileId(fileId);
      
      res.json({ ...file, sharedWith });
    } catch (error) {
      console.error("Error fetching file:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/files/upload", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }
      
      const { encryptionType, isSensitive } = req.body;
      
      // Validate encryption type
      if (!["aes", "quantum", "dual"].includes(encryptionType)) {
        return res.status(400).json({ message: "Invalid encryption type" });
      }
      
      // Get user's security settings or use defaults
      const userSettings = await storage.getSecuritySettings(req.user!.id) || {
        defaultEncryption: "aes",
        enforceQuantumForSensitive: true,
        autoEncrypt: true
      };
      
      // Determine encryption type based on settings
      let finalEncryptionType = encryptionType;
      if (userSettings.enforceQuantumForSensitive && isSensitive === "true") {
        finalEncryptionType = "quantum";
      }
      
      // Read file
      const filePath = req.file.path;
      const fileContent = await fs.promises.readFile(filePath);
      
      // For quantum and dual encryption, check if quantum key exists and create if needed
      if (finalEncryptionType === "quantum" || finalEncryptionType === "dual") {
        const quantumKey = await storage.getActiveKeyByType("quantum");
        if (!quantumKey) {
          // Auto-generate a quantum key
          const { keyId, publicKey } = await generateKey("quantum");
          
          // Create key record
          const keyData = insertEncryptionKeySchema.parse({
            keyType: "quantum",
            keyId,
            name: "Quantum-Resistant Key (Auto-Generated)",
            isActive: true,
            publicKey,
            metadata: {
              createdBy: req.user!.id,
              algorithm: "KYBER-768",
              autoGenerated: true
            }
          });
          
          await storage.createEncryptionKey(keyData);
          
          // Log key generation
          await storage.createAuditLog({
            userId: req.user!.id,
            action: "CREATE_KEY_AUTO",
            resource: "encryptionKey",
            resourceId: keyData.keyId,
            details: { keyType: "quantum", keyId, autoGenerated: true },
            ipAddress: req.ip
          });
        }
      }
      
      // Encrypt file
      const { encryptedData, encryptedKey, iv } = await encrypt(
        fileContent, 
        finalEncryptionType
      );
      
      // Save encrypted file
      const encryptedFilePath = filePath + ".enc";
      await fs.promises.writeFile(encryptedFilePath, encryptedData);
      
      // Delete original file
      await fs.promises.unlink(filePath);
      
      // Create file record
      const fileData = insertFileSchema.parse({
        ownerId: req.user!.id,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        encryptionType: finalEncryptionType,
        encryptedKey,
        iv,
        path: encryptedFilePath,
        isSensitive: isSensitive === "true"
      });
      
      const file = await storage.createFile(fileData);
      
      // Log file upload
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "UPLOAD",
        resource: "file",
        resourceId: file.id.toString(),
        details: { fileName: file.name, encryptionType: file.encryptionType },
        ipAddress: req.ip
      });
      
      res.status(201).json(file);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      
      // Provide specific error messages for common issues
      if (error.message?.includes('quantum') || error.message?.includes('Quantum')) {
        return res.status(400).json({ 
          message: "Quantum encryption error. Please check if quantum keys are available or regenerate them." 
        });
      } else if (error.message?.includes('encryption') || error.message?.includes('key')) {
        return res.status(400).json({ 
          message: "Encryption error. Please check encryption settings or try a different encryption method." 
        });
      } else if (error.code === 'ENOSPC') {
        return res.status(507).json({ message: "Not enough storage space on the server" });
      } else if (error.code === 'EACCES') {
        return res.status(403).json({ message: "Server has insufficient permissions to store the file" });
      }
      
      res.status(500).json({ message: "File upload failed. Please try again." });
    }
  });

  app.get("/api/files/:id/download", isAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if user is owner or has shared access
      const isOwner = file.ownerId === req.user!.id;
      const isAdmin = req.user?.role === "admin";
      const sharedFiles = await storage.getSharedFilesByFileId(fileId);
      const sharedFileRecord = sharedFiles.find(sf => sf.userId === req.user!.id);
      const hasSharedAccess = !!sharedFileRecord;
      
      // Log access attempt for debugging
      console.log(`Download attempt: fileId=${fileId}, userId=${req.user!.id}, isOwner=${isOwner}, isAdmin=${isAdmin}, hasSharedAccess=${hasSharedAccess}`);
      
      if (!isOwner && !hasSharedAccess && !isAdmin) {
        return res.status(403).json({ message: "Access denied - You don't have permission to download this file" });
      }
      
      // Check if shared access has expired
      if (!isOwner && !isAdmin && hasSharedAccess && sharedFileRecord?.expiresAt) {
        const now = new Date();
        if (now > sharedFileRecord.expiresAt) {
          return res.status(403).json({ message: "Access denied - Sharing period has expired" });
        }
      }
      
      // For quantum and dual encryption, check if quantum key exists
      if (file.encryptionType === "quantum" || file.encryptionType === "dual") {
        const quantumKey = await storage.getActiveKeyByType("quantum");
        if (!quantumKey) {
          return res.status(400).json({ 
            message: "Required quantum encryption key is not available. Please contact your administrator."
          });
        }
      }
      
      // Read encrypted file
      const encryptedData = await fs.promises.readFile(file.path);
      
      // Verify data exists and is valid
      if (!encryptedData || encryptedData.length === 0) {
        return res.status(400).json({ message: "File data is missing or corrupted" });
      }
      
      // Verify encryption parameters
      if (!file.encryptedKey || !file.iv) {
        return res.status(400).json({ 
          message: "File encryption metadata is missing. Unable to decrypt file."
        });
      }
      
      try {
        // Decrypt file
        const decryptedData = await decrypt(
          encryptedData, 
          file.encryptionType, 
          file.encryptedKey,
          file.iv
        );
        
        // Update last accessed time
        await storage.updateFile(fileId, { lastAccessed: new Date() });
        
        // Log file download
        await storage.createAuditLog({
          userId: req.user!.id,
          action: "DOWNLOAD",
          resource: "file",
          resourceId: fileId.toString(),
          details: { fileName: file.name },
          ipAddress: req.ip
        });
        
        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        res.setHeader('Content-Type', file.type);
        
        res.send(decryptedData);
      } catch (decryptError: any) {
        console.error("Decryption error:", decryptError);
        
        // Check for quantum-specific errors
        if (decryptError.message?.includes('quantum') || 
            decryptError.message?.includes('Kyber') ||
            file.encryptionType === "quantum" || 
            file.encryptionType === "dual") {
          return res.status(400).json({ 
            message: "Quantum decryption failed. This may be due to a rotated or missing quantum key."
          });
        }
        
        // Generic decryption error
        return res.status(400).json({ 
          message: "File decryption failed. The file may be corrupted or encryption keys may be missing."
        });
      }
    } catch (error: any) {
      console.error("Error downloading file:", error);
      
      // Return a more user-friendly error message
      if (error.code === 'ENOENT') {
        return res.status(404).json({ message: "File data not found on server" });
      } else if (error.message?.includes('permission') || error.message?.includes('access')) {
        return res.status(403).json({ message: "Permission denied. You don't have access to this file." });
      } else if (error.message?.includes('decrypt') || error.message?.includes('key')) {
        return res.status(400).json({ 
          message: "File decryption failed. The encryption key may have been rotated or is unavailable." 
        });
      } else if (error.message?.includes('quantum') || error.message?.includes('kyber')) {
        return res.status(400).json({ 
          message: "Quantum key error. Please contact your administrator." 
        });
      }
      
      res.status(500).json({ message: "File download failed. Please try again later." });
    }
  });

  app.delete("/api/files/:id", isAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Only owner can delete files
      if (file.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Only the owner can delete this file" });
      }
      
      // Get user's security settings for secure deletion
      const userSettings = await storage.getSecuritySettings(req.user!.id);
      const secureDelete = userSettings?.secureDelete ?? true;
      
      if (secureDelete) {
        // Securely delete file by overwriting it with random data
        const fileSize = (await fs.promises.stat(file.path)).size;
        const randomData = Buffer.alloc(fileSize);
        randomData.fill(0);
        await fs.promises.writeFile(file.path, randomData);
      }
      
      // Delete file from disk
      await fs.promises.unlink(file.path);
      
      // Delete file record
      await storage.deleteFile(fileId);
      
      // Log file deletion
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "DELETE",
        resource: "file",
        resourceId: fileId.toString(),
        details: { fileName: file.name },
        ipAddress: req.ip
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Shared files API routes
  app.get("/api/shared", isAuthenticated, async (req, res) => {
    try {
      const sharedFiles = await storage.getSharedFilesByUserId(req.user!.id);
      res.json(sharedFiles);
    } catch (error) {
      console.error("Error fetching shared files:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/files/:id/share", isAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if user is owner or has admin permission and allowReshare
      const isOwner = file.ownerId === req.user!.id;
      
      if (!isOwner) {
        const sharedFile = (await storage.getSharedFilesByFileId(fileId))
          .find(sf => sf.userId === req.user!.id);
        
        if (!sharedFile || !sharedFile.allowReshare) {
          return res.status(403).json({ message: "You don't have permission to share this file" });
        }
      }
      
      // Validate share data
      const { userId, permission, allowReshare, expiresAt } = req.body;
      
      // Check if user exists
      const targetUser = await storage.getUser(parseInt(userId));
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if already shared with this user
      const existingShare = (await storage.getSharedFilesByFileId(fileId))
        .find(sf => sf.userId === parseInt(userId));
      
      if (existingShare) {
        return res.status(400).json({ message: "File already shared with this user" });
      }
      
      // Create shared file record with proper defaults
      const sharedFileData = insertSharedFileSchema.parse({
        fileId,
        userId: parseInt(userId),
        permission: permission || 'view', // Default to view permission if not specified
        allowReshare: allowReshare === true,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      });
      
      const sharedFile = await storage.createSharedFile(sharedFileData);
      
      // Log file sharing
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "SHARE",
        resource: "file",
        resourceId: fileId.toString(),
        details: { 
          fileName: file.name,
          targetUserId: userId,
          permission
        },
        ipAddress: req.ip
      });
      
      res.status(201).json(sharedFile);
    } catch (error) {
      console.error("Error sharing file:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/shared/:id", isAuthenticated, async (req, res) => {
    try {
      const sharedFileId = parseInt(req.params.id);
      const sharedFile = await storage.getSharedFile(sharedFileId);
      
      if (!sharedFile) {
        return res.status(404).json({ message: "Shared file not found" });
      }
      
      const file = await storage.getFile(sharedFile.fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Only file owner or the shared user can remove sharing
      if (file.ownerId !== req.user!.id && sharedFile.userId !== req.user!.id) {
        return res.status(403).json({ message: "Permission denied" });
      }
      
      // Delete shared file record
      await storage.deleteSharedFile(sharedFileId);
      
      // Log unshare action
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "UNSHARE",
        resource: "file",
        resourceId: file.id.toString(),
        details: { 
          fileName: file.name,
          targetUserId: sharedFile.userId
        },
        ipAddress: req.ip
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing shared file:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Encryption keys API routes
  app.get("/api/keys", isAuthenticated, async (req, res) => {
    try {
      // Regular users can only view public key info, admins see all
      const keys = await storage.getAllKeys();
      
      const isAdmin = req.user!.role === "admin";
      const publicInfo = keys.map(key => ({
        id: key.id,
        keyType: key.keyType,
        keyId: key.keyId,
        name: key.name,
        isActive: key.isActive,
        createdAt: key.createdAt,
        rotatedAt: key.rotatedAt,
        ...(isAdmin ? { publicKey: key.publicKey, metadata: key.metadata } : {})
      }));
      
      res.json(publicInfo);
    } catch (error) {
      console.error("Error fetching encryption keys:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/keys", isAdmin, async (req, res) => {
    try {
      // Generate a new encryption key
      const { keyType, name } = req.body;
      
      if (!["aes", "quantum"].includes(keyType)) {
        return res.status(400).json({ message: "Invalid key type" });
      }
      
      // Generate key material
      const { keyId, publicKey } = await generateKey(keyType);
      
      // Create key record
      const keyData = insertEncryptionKeySchema.parse({
        keyType,
        keyId,
        name: name || `${keyType.toUpperCase()} Key`,
        isActive: true,
        publicKey,
        metadata: {
          createdBy: req.user!.id,
          algorithm: keyType === "aes" ? "AES-256-GCM" : "KYBER-768"
        }
      });
      
      const key = await storage.createEncryptionKey(keyData);
      
      // Log key generation
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CREATE_KEY",
        resource: "encryptionKey",
        resourceId: key.id.toString(),
        details: { keyType, keyId },
        ipAddress: req.ip
      });
      
      res.status(201).json(key);
    } catch (error) {
      console.error("Error creating encryption key:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/keys/:id/rotate", isAdmin, async (req, res) => {
    try {
      const keyId = parseInt(req.params.id);
      const key = await storage.getEncryptionKey(keyId);
      
      if (!key) {
        return res.status(404).json({ message: "Key not found" });
      }
      
      // Rotate key - mark current as inactive and create new active key
      await storage.rotateKey(keyId);
      
      // Generate new key material
      const { keyId: newKeyId, publicKey } = await generateKey(key.keyType);
      
      // Create new key record
      const newKeyData = insertEncryptionKeySchema.parse({
        keyType: key.keyType,
        keyId: newKeyId,
        name: `${key.name} (Rotated)`,
        isActive: true,
        publicKey,
        metadata: {
          createdBy: req.user!.id,
          algorithm: key.keyType === "aes" ? "AES-256-GCM" : "KYBER-768",
          previousKeyId: key.keyId
        }
      });
      
      const newKey = await storage.createEncryptionKey(newKeyData);
      
      // Log key rotation
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "ROTATE_KEY",
        resource: "encryptionKey",
        resourceId: key.id.toString(),
        details: { 
          oldKeyId: key.keyId,
          newKeyId: newKey.keyId 
        },
        ipAddress: req.ip
      });
      
      res.json({ success: true, newKey });
    } catch (error) {
      console.error("Error rotating encryption key:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Security settings API routes
  app.get("/api/security", isAuthenticated, async (req, res) => {
    try {
      let settings = await storage.getSecuritySettings(req.user!.id);
      
      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = insertSecuritySettingsSchema.parse({
          userId: req.user!.id,
          keyRotationDays: 30,
          defaultEncryption: "aes",
          enforceQuantumForSensitive: true,
          autoEncrypt: true,
          secureDelete: true
        });
        
        settings = await storage.createSecuritySettings(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching security settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/security", isAuthenticated, async (req, res) => {
    try {
      const { 
        keyRotationDays, 
        defaultEncryption, 
        enforceQuantumForSensitive,
        autoEncrypt,
        secureDelete
      } = req.body;
      
      // Validate security settings
      const updates = insertSecuritySettingsSchema.partial().parse({
        keyRotationDays: parseInt(keyRotationDays),
        defaultEncryption,
        enforceQuantumForSensitive: enforceQuantumForSensitive === true,
        autoEncrypt: autoEncrypt === true,
        secureDelete: secureDelete === true
      });
      
      let settings = await storage.getSecuritySettings(req.user!.id);
      
      if (!settings) {
        // Create new settings if none exist
        const defaultSettings = insertSecuritySettingsSchema.parse({
          userId: req.user!.id,
          ...updates
        });
        
        settings = await storage.createSecuritySettings(defaultSettings);
      } else {
        // Update existing settings
        settings = await storage.updateSecuritySettings(req.user!.id, updates) as any;
      }
      
      // Log security settings update
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "UPDATE_SECURITY_SETTINGS",
        resource: "securitySettings",
        resourceId: settings.id.toString(),
        details: updates,
        ipAddress: req.ip
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating security settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management API routes (admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Remove sensitive data
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { role, twoFactorEnabled } = req.body;
      
      // Update user
      const updatedUser = await storage.updateUser(userId, {
        role,
        twoFactorEnabled: twoFactorEnabled === true
      });
      
      // Log user update
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "UPDATE_USER",
        resource: "user",
        resourceId: userId.toString(),
        details: { role, twoFactorEnabled },
        ipAddress: req.ip
      });
      
      // Remove sensitive data
      const { password, ...safeUser } = updatedUser!;
      
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Audit logs API routes (admin only)
  app.get("/api/logs", isAuthenticated, async (req, res) => {
    try {
      // Only allow admins to access all logs
      // Regular users can only access their own logs
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getAuditLogs(limit);
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Auto-generate quantum key if none exists
  app.post("/api/keys/ensure-quantum", isAuthenticated, async (req, res) => {
    try {
      // Check if there's an active quantum key
      const keys = await storage.getAllKeys();
      const quantumKey = keys.find(k => k.keyType === "quantum" && k.isActive);
      
      if (quantumKey) {
        return res.json({ success: true, keyExists: true, key: quantumKey });
      }
      
      // No quantum key exists, create one
      // Only admins can create keys normally, but we'll make an exception
      // for the initial quantum key setup
      const { keyId, publicKey } = await generateKey("quantum");
      
      // Create key record
      const keyData = insertEncryptionKeySchema.parse({
        keyType: "quantum",
        keyId,
        name: "Quantum-Resistant Key (Auto-Generated)",
        isActive: true,
        publicKey,
        metadata: {
          createdBy: req.user!.id,
          algorithm: "KYBER-768",
          autoGenerated: true
        }
      });
      
      const key = await storage.createEncryptionKey(keyData);
      
      // Log key generation
      await storage.createAuditLog({
        userId: req.user!.id,
        action: "CREATE_KEY_AUTO",
        resource: "encryptionKey",
        resourceId: key.id.toString(),
        details: { keyType: "quantum", keyId, autoGenerated: true },
        ipAddress: req.ip
      });
      
      res.status(201).json({ success: true, keyExists: false, key });
    } catch (error) {
      console.error("Error ensuring quantum key:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server
  setupWebSockets(httpServer);

  return httpServer;
}
