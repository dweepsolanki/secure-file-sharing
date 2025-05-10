import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { File, SharedFileWithDetails } from "@shared/schema";
import { uploadFile, downloadFile, shareFile, deleteFile, removeSharing } from "@/lib/file-service";

export function useFiles() {
  const { toast } = useToast();

  // Get all user files
  const {
    data: files,
    isLoading: isLoadingFiles,
    error: filesError,
    refetch: refetchFiles,
  } = useQuery<File[]>({
    queryKey: ["/api/files"],
  });

  // Get shared files
  const {
    data: sharedFiles,
    isLoading: isLoadingShared,
    error: sharedError,
    refetch: refetchShared,
  } = useQuery<SharedFileWithDetails[]>({
    queryKey: ["/api/shared"],
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: ({
      file,
      encryptionType,
      isSensitive,
    }: {
      file: globalThis.File;
      encryptionType: string;
      isSensitive: boolean;
    }) => uploadFile(file, encryptionType, isSensitive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "File uploaded",
        description: "Your file has been encrypted and uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    },
  });

  // Download file mutation
  const downloadFileMutation = useMutation({
    mutationFn: ({
      fileId,
      fileName,
    }: {
      fileId: number;
      fileName: string;
    }) => downloadFile(fileId, fileName),
    onSuccess: () => {
      toast({
        title: "File downloaded",
        description: "Your file has been decrypted and downloaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message || "An error occurred during download",
        variant: "destructive",
      });
    },
  });

  // Share file mutation
  const shareFileMutation = useMutation({
    mutationFn: ({
      fileId,
      userId,
      permission,
      allowReshare,
      expiresAt,
    }: {
      fileId: number;
      userId: number;
      permission: string;
      allowReshare: boolean;
      expiresAt?: Date;
    }) => shareFile(fileId, userId, permission, allowReshare, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "File shared",
        description: "The file has been shared successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sharing failed",
        description: error.message || "An error occurred while sharing the file",
        variant: "destructive",
      });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message || "An error occurred while deleting the file",
        variant: "destructive",
      });
    },
  });

  // Remove sharing mutation
  const removeSharingMutation = useMutation({
    mutationFn: (sharedFileId: number) => removeSharing(sharedFileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shared"] });
      toast({
        title: "Sharing removed",
        description: "The file is no longer shared with this user.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Action failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  return {
    files,
    isLoadingFiles,
    filesError,
    refetchFiles,
    sharedFiles,
    isLoadingShared,
    sharedError,
    refetchShared,
    uploadFileMutation,
    downloadFileMutation,
    shareFileMutation,
    deleteFileMutation,
    removeSharingMutation,
  };
}
