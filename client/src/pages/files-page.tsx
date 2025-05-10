import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileCard } from "@/components/ui/file-card";
import { UploadDialog } from "@/components/dialogs/upload-dialog";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { useFiles } from "@/hooks/use-files";
import { File } from "@shared/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Upload } from "lucide-react";

export default function FilesPage() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { 
    files, 
    isLoadingFiles, 
    downloadFileMutation, 
    deleteFileMutation 
  } = useFiles();
  
  const filteredFiles = files?.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleDownload = (file: File) => {
    downloadFileMutation.mutate({
      fileId: file.id,
      fileName: file.name
    });
  };
  
  const handleShare = (file: File) => {
    setSelectedFile(file);
    setShowShareDialog(true);
  };
  
  const handleEdit = (file: File) => {
    // Implementation for editing file name would go here
    // Not implemented in this version
  };
  
  const handleDelete = (file: File) => {
    setSelectedFile(file);
    setShowDeleteDialog(true);
  };
  
  const confirmDelete = () => {
    if (selectedFile) {
      deleteFileMutation.mutate(selectedFile.id, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          setSelectedFile(null);
        }
      });
    }
  };
  
  return (
    <AppLayout 
      title="My Files" 
      actions={
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      }
    >
      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input 
            className="pl-10" 
            placeholder="Search files..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* File grid */}
      {isLoadingFiles ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {filteredFiles && filteredFiles.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFiles.map(file => (
                <FileCard
                  key={file.id}
                  file={file}
                  onDownload={handleDownload}
                  onShare={handleShare}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No files found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? "No files match your search criteria" 
                  : "Get started by uploading your first encrypted file"}
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Dialogs */}
      <UploadDialog 
        open={showUploadDialog} 
        onOpenChange={setShowUploadDialog} 
      />
      
      <ShareDialog 
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        file={selectedFile}
      />
      
      <AlertDialog 
        open={showDeleteDialog} 
        onOpenChange={setShowDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file <strong>{selectedFile?.name}</strong>. 
              This action cannot be undone and the encrypted data will be securely wiped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteFileMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
