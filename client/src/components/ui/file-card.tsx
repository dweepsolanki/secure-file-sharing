import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { File, FileWithSharing, SharedFileWithDetails } from "@shared/schema";
import { EncryptBadge } from "@/components/ui/encrypt-badge";
import { formatBytes, formatDate, getFileTypeIcon } from "@/lib/utils";
import { MoreHorizontal, Download, Share, Edit, Trash2, FileText, FileImage, FileVideo, FileAudio, FilePen, FileSpreadsheet, FileCode, File as FileIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface FileCardProps {
  file: File | FileWithSharing | SharedFileWithDetails;
  isShared?: boolean;
  onDownload?: (file: File) => void;
  onShare?: (file: File) => void;
  onEdit?: (file: File) => void;
  onDelete?: (file: File) => void;
  onRemoveSharing?: (sharedFileId: number) => void;
}

export function FileCard({
  file,
  isShared = false,
  onDownload,
  onShare,
  onEdit,
  onDelete,
  onRemoveSharing,
}: FileCardProps) {
  const { user } = useAuth();
  
  // Handle shared file structure
  const fileData = "file" in file ? file.file! : file;
  const sharedFileId = "id" in file && isShared ? file.id : undefined;
  
  // Check if current user is the owner
  const isOwner = fileData.ownerId === user?.id;
  
  // Get file icon based on type
  const FileTypeIcon = getFileTypeComponent(fileData.type);
  
  return (
    <Card className="overflow-hidden border border-gray-100">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
              <FileTypeIcon className="h-8 w-8" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{fileData.name}</p>
              <p className="text-xs text-gray-500">
                {formatBytes(fileData.size)} · {formatDate(fileData.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <EncryptBadge type={fileData.encryptionType} />
          </div>
        </div>
      </CardContent>
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex justify-between">
        <div className="flex space-x-2">
          {onDownload && (
            <Button variant="ghost" size="icon" onClick={() => onDownload(fileData)} title="Download">
              <Download className="h-5 w-5" />
            </Button>
          )}
          {onShare && isOwner && (
            <Button variant="ghost" size="icon" onClick={() => onShare(fileData)} title="Share">
              <Share className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && isOwner && (
                <DropdownMenuItem onClick={() => onEdit(fileData)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {onDelete && isOwner && (
                <DropdownMenuItem 
                  onClick={() => onDelete(fileData)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
              {onRemoveSharing && isShared && sharedFileId && (
                <DropdownMenuItem 
                  onClick={() => onRemoveSharing(sharedFileId)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove access
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

function getFileTypeComponent(mimeType: string) {
  const fileType = getFileTypeIcon(mimeType);
  
  switch (fileType) {
    case "image":
      return FileImage;
    case "video":
      return FileVideo;
    case "audio":
      return FileAudio;
    case "pdf":
      return FilePen;
    case "excel":
      return FileSpreadsheet;
    case "word":
      return FileText;
    case "text":
      return FileCode;
    default:
      return FileIcon;
  }
}
