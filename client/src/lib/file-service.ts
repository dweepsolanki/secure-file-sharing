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
    const response = await fetch(`/api/files/${fileId}/download`, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Download failed: ${errorText}`);
    }

    // Convert response to blob
    const blob = await response.blob();

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
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
}

export async function shareFile(
  fileId: number,
  userId: number,
  permission: string = "view",
  allowReshare: boolean = false,
  expiresAt?: Date
): Promise<void> {
  await apiRequest("POST", `/api/files/${fileId}/share`, {
    userId,
    permission,
    allowReshare,
    expiresAt: expiresAt?.toISOString(),
  });
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
