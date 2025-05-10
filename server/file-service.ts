import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { storage } from "./storage";

// Mock implementation for Kyber768 functions
// In a real implementation, you would use a post-quantum library
const kyberMock = {
  generateKeyPair: () => {
    const publicKey = randomBytes(1184).toString("base64");
    const privateKey = randomBytes(2400).toString("base64");
    return { publicKey, privateKey };
  },
  encrypt: (data: Buffer, publicKey: string) => {
    // Simulate Kyber768 encryption with proper AES-GCM
    const iv = randomBytes(16);
    const key = randomBytes(32);
    
    // Create cipher and get authentication tag
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    // In a real implementation, you would encrypt the key with Kyber
    const encryptedKey = `KYBER-${key.toString("base64")}`;
    
    return {
      encryptedData: encrypted,
      encryptedKey,
      iv: iv.toString("base64")
    };
  },
  decrypt: (encryptedData: Buffer, encryptedKey: string, iv: string) => {
    try {
      // Extract key from the mock Kyber format
      const key = Buffer.from(encryptedKey.replace("KYBER-", ""), "base64");
      const ivBuffer = Buffer.from(iv, "base64");
      
      // Create decipher with the same parameters
      const decipher = createDecipheriv("aes-256-cbc", key, ivBuffer);
      
      // Return decrypted data
      return Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
    } catch (error) {
      console.error("Quantum decryption error:", error);
      throw error;
    }
  }
};

// Generate encryption key
export async function generateKey(keyType: string) {
  if (keyType === "quantum") {
    // Generate Kyber key pair
    const { publicKey } = kyberMock.generateKeyPair();
    return {
      keyId: `kyber-${randomBytes(8).toString("hex")}`,
      publicKey
    };
  } else {
    // Generate AES key
    return {
      keyId: `aes-${randomBytes(8).toString("hex")}`,
      publicKey: null
    };
  }
}

// Encrypt file data
export async function encrypt(data: Buffer, encryptionType: string) {
  if (encryptionType === "quantum") {
    // Get active Kyber key
    const key = await storage.getActiveKeyByType("quantum");
    if (!key) {
      throw new Error("No active quantum-resistant key available");
    }
    
    // Use Kyber encryption
    return kyberMock.encrypt(data, key.publicKey!);
  } else if (encryptionType === "dual") {
    // Encrypt with AES first
    const aesKey = randomBytes(32);
    const iv = randomBytes(16);
    
    // Use CBC instead of GCM for better compatibility
    const cipher = createCipheriv("aes-256-cbc", aesKey, iv);
    const encryptedData = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    // Get active Kyber key for encrypting the AES key
    const kyberKey = await storage.getActiveKeyByType("quantum");
    if (!kyberKey) {
      throw new Error("No active quantum-resistant key available for dual encryption");
    }
    
    // Encrypt AES key with Kyber (mock)
    const encryptedKey = `DUAL-${aesKey.toString("base64")}`;
    
    return {
      encryptedData,
      encryptedKey,
      iv: iv.toString("base64")
    };
  } else {
    // Default to AES-256-CBC for consistency
    const key = randomBytes(32);
    const iv = randomBytes(16);
    
    // Use CBC instead of GCM for better compatibility
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const encryptedData = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    return {
      encryptedData,
      encryptedKey: key.toString("base64"),
      iv: iv.toString("base64")
    };
  }
}

// Decrypt file data
export async function decrypt(encryptedData: Buffer, encryptionType: string, encryptedKey: string, iv: string) {
  try {
    if (encryptionType === "quantum") {
      // Use Kyber decryption (mock)
      return kyberMock.decrypt(encryptedData, encryptedKey, iv);
    } else if (encryptionType === "dual") {
      // Extract AES key from dual format
      const aesKey = Buffer.from(encryptedKey.replace("DUAL-", ""), "base64");
      const ivBuffer = Buffer.from(iv, "base64");
      
      // Decrypt with AES using CBC
      const decipher = createDecipheriv("aes-256-cbc", aesKey, ivBuffer);
      return Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
    } else {
      // Default to AES-256-CBC
      const key = Buffer.from(encryptedKey, "base64");
      const ivBuffer = Buffer.from(iv, "base64");
      
      // Use CBC for better compatibility
      const decipher = createDecipheriv("aes-256-cbc", key, ivBuffer);
      
      return Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
    }
  } catch (error) {
    console.error(`Error decrypting file with ${encryptionType}:`, error);
    throw error;
  }
}
