import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "MMM dd, yyyy");
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "MMM dd, yyyy h:mm a");
}

export function getFileTypeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return "image";
  } else if (mimeType.startsWith("video/")) {
    return "video";
  } else if (mimeType.startsWith("audio/")) {
    return "audio";
  } else if (mimeType.includes("pdf")) {
    return "pdf";
  } else if (mimeType.includes("word") || mimeType.includes("document")) {
    return "word";
  } else if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) {
    return "excel";
  } else if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) {
    return "powerpoint";
  } else if (mimeType.includes("zip") || mimeType.includes("compressed")) {
    return "archive";
  } else if (mimeType.includes("text")) {
    return "text";
  } else {
    return "file";
  }
}

export function getFileTypeFromName(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension) return "file";
  
  switch (extension) {
    case "pdf":
      return "pdf";
    case "doc":
    case "docx":
      return "word";
    case "xls":
    case "xlsx":
      return "excel";
    case "ppt":
    case "pptx":
      return "powerpoint";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "bmp":
    case "svg":
      return "image";
    case "mp3":
    case "wav":
    case "ogg":
      return "audio";
    case "mp4":
    case "mov":
    case "avi":
      return "video";
    case "zip":
    case "rar":
    case "tar":
    case "gz":
      return "archive";
    case "txt":
    case "md":
      return "text";
    default:
      return "file";
  }
}

export function getEncryptionLabel(type: string) {
  switch (type) {
    case "aes":
      return "AES-256";
    case "quantum":
      return "Kyber768";
    case "dual":
      return "Dual Encrypted";
    default:
      return "Encrypted";
  }
}

export function getPermissionLabel(permission: string) {
  switch (permission) {
    case "view":
      return "View only";
    case "edit":
      return "Edit";
    case "admin":
      return "Admin";
    default:
      return "Custom";
  }
}
