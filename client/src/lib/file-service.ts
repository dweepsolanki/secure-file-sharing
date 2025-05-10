import { apiRequest } from "./queryClient";
import { File, SecuritySetting } from "@shared/schema";
import { formatBytes } from "./utils";

export async function uploadFile(
  file: globalThis.File,
  encryptionType: string = "aes",
  isSensitive: boolean = false
): Promise<File> {
  // Create form data
  const formData = new FormData();
  formData.append("file", file);
  formData.append("encryptionType", encryptionType);
  formData.append("isSensitive", isSensitive.toString());

  // Upload file
  const response = await fetch("/api/files/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  return await response.json();
}

export async function downloadFile(fileId: number, fileName: string): Promise<void> {
  try {
    // Request file download
    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`/api/files/${fileId}/download`, {
      credentials: "include",
      signal: controller.signal
    });
    
    // Clear timeout after response received
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to parse error message from JSON response if possible
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `Download failed: ${response.statusText}`);
      } catch (parseError) {
        // If we can't parse JSON, just use the text
        const errorText = await response.text();
        throw new Error(`Download failed: ${errorText || response.statusText}`);
      }
    }

    // Convert response to blob
    const blob = await response.blob();
    
    // Validate blob
    if (blob.size === 0) {
      throw new Error("Download failed: Empty file received");
    }

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return Promise.resolve();
  } catch (error: any) {
    console.error("Error downloading file:", error);
    
    // Check for specific types of errors
    if (error.name === 'AbortError') {
      throw new Error("Download timed out. The server took too long to respond.");
    } else if (error.message?.includes('quantum') || error.message?.includes('Quantum')) {
      throw new Error("Quantum encryption key error. Please ensure the quantum key is active.");
    } else {
      throw error;
    }
  }
}

export async function shareFile(
  fileId: number,
  userId?: number,
  permission: string = "view",
  allowReshare: boolean = false,
  expiresAt?: Date,
  email?: string
): Promise<void> {
  // Determine if we're sharing with a user ID or email
  const requestBody: any = {
    permission,
    allowReshare,
    expiresAt: expiresAt?.toISOString(),
  };

  // Add either userId or email to the request body
  if (userId) {
    requestBody.userId = userId;
  } else if (email) {
    requestBody.email = email;
  }

  await apiRequest("POST", `/api/files/${fileId}/share`, requestBody);
}

export async function deleteFile(fileId: number): Promise<void> {
  await apiRequest("DELETE", `/api/files/${fileId}`);
}

export async function removeSharing(sharedFileId: number): Promise<void> {
  await apiRequest("DELETE", `/api/shared/${sharedFileId}`);
}

export function getSecuritySettingsWithDefaults(
  settings?: SecuritySetting | null
): SecuritySetting {
  return {
    id: settings?.id || 0,
    userId: settings?.userId || 0,
    keyRotationDays: settings?.keyRotationDays || 30,
    defaultEncryption: settings?.defaultEncryption || "aes",
    enforceQuantumForSensitive: settings?.enforceQuantumForSensitive ?? true,
    autoEncrypt: settings?.autoEncrypt ?? true,
    secureDelete: settings?.secureDelete ?? true,
    updatedAt: settings?.updatedAt || new Date(),
  };
}

export function getFileTypeLabel(type: string): string {
  const mimeMap: Record<string, string> = {
    "application/pdf": "PDF",
    "application/msword": "Word",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
    "application/vnd.ms-excel": "Excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
    "application/vnd.ms-powerpoint": "PowerPoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
    "text/plain": "Text",
    "text/markdown": "Markdown",
    "application/json": "JSON",
    "application/zip": "Archive",
    "application/x-rar-compressed": "Archive",
  };

  // Images
  if (type.startsWith("image/")) {
    return "Image";
  }
  
  // Videos
  if (type.startsWith("video/")) {
    return "Video";
  }
  
  // Audio
  if (type.startsWith("audio/")) {
    return "Audio";
  }
  
  // Known MIME types
  if (mimeMap[type]) {
    return mimeMap[type];
  }
  
  // Default
  return "File";
}

export function formatFileInfo(file: File): string {
  return `${formatBytes(file.size)} · ${getFileTypeLabel(file.type)}`;
}
