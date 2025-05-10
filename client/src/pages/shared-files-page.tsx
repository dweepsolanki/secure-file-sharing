import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { FileCard } from "@/components/ui/file-card";
import { useFiles } from "@/hooks/use-files";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { File, SharedFileWithDetails } from "@shared/schema";
import { Search, Share2 } from "lucide-react";

export default function SharedFilesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SharedFileWithDetails | null>(null);
  
  const { 
    sharedFiles, 
    isLoadingShared, 
    downloadFileMutation,
    removeSharingMutation
  } = useFiles();
  
  const filteredFiles = sharedFiles?.filter(shared => {
    if (!shared.file) return false;
    return shared.file.name.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  const handleDownload = (file: File) => {
    downloadFileMutation.mutate({
      fileId: file.id,
      fileName: file.name
    });
  };
  
  const handleRemoveSharing = (sharedFileId: number) => {
    const sharedFile = sharedFiles?.find(sf => sf.id === sharedFileId);
    if (sharedFile) {
      setSelectedFile(sharedFile);
      setShowRemoveDialog(true);
    }
  };
  
  const confirmRemove = () => {
    if (selectedFile) {
      removeSharingMutation.mutate(selectedFile.id, {
        onSuccess: () => {
          setShowRemoveDialog(false);
          setSelectedFile(null);
        }
      });
    }
  };
  
  return (
    <AppLayout title="Shared With Me">
      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input 
            className="pl-10" 
            placeholder="Search shared files..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Shared files grid */}
      {isLoadingShared ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {filteredFiles && filteredFiles.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFiles.map(shared => (
                shared.file && (
                  <FileCard
                    key={shared.id}
                    file={shared}
                    isShared={true}
                    onDownload={handleDownload}
                    onRemoveSharing={handleRemoveSharing}
                  />
                )
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Share2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No shared files</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? "No shared files match your search criteria" 
                  : "No files have been shared with you yet"}
              </p>
            </div>
          )}
        </>
      )}
      
      {/* Remove sharing confirmation dialog */}
      <AlertDialog 
        open={showRemoveDialog} 
        onOpenChange={setShowRemoveDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove shared access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your access to <strong>{selectedFile?.file?.name}</strong>.
              You won't be able to access this file anymore unless it's shared with you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemove}
              className="bg-red-600 hover:bg-red-700"
            >
              {removeSharingMutation.isPending ? "Removing..." : "Remove Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
