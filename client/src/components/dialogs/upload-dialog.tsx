import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useFiles } from "@/hooks/use-files";
import { useKeys } from "@/hooks/use-keys";
import { Database, Upload, Shield, AlertCircle } from "lucide-react";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UploadDialog({ open, onOpenChange, onSuccess }: UploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encryptionType, setEncryptionType] = useState<string>("aes");
  const [isSensitive, setIsSensitive] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [missingQuantumKey, setMissingQuantumKey] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadFileMutation } = useFiles();
  const { getActiveQuantumKey, ensureQuantumKey, isLoadingKeys, keys } = useKeys();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }
    
    // If encryption type is quantum or dual, or if sensitive flag is set,
    // ensure a quantum key exists before proceeding
    if (encryptionType === "quantum" || encryptionType === "dual" || isSensitive) {
      const quantumKey = getActiveQuantumKey();
      
      if (!quantumKey) {
        try {
          // Auto-generate a quantum key if missing
          await ensureQuantumKey();
          toast({
            title: "Quantum key created",
            description: "A quantum-resistant encryption key has been automatically generated.",
          });
        } catch (error) {
          toast({
            title: "Encryption failed",
            description: "Could not generate the required quantum encryption key.",
            variant: "destructive"
          });
          return;
        }
      }
    }

    uploadFileMutation.mutate(
      {
        file: selectedFile,
        encryptionType,
        isSensitive
      },
      {
        onSuccess: () => {
          setSelectedFile(null);
          setEncryptionType("aes");
          setIsSensitive(false);
          onOpenChange(false);
          if (onSuccess) onSuccess();
        }
      }
    );
  };

  // Check if a quantum key exists
  useEffect(() => {
    if (keys && (encryptionType === "quantum" || encryptionType === "dual" || isSensitive)) {
      const quantumKey = getActiveQuantumKey();
      setMissingQuantumKey(!quantumKey);
    } else {
      setMissingQuantumKey(false);
    }
  }, [keys, encryptionType, isSensitive, getActiveQuantumKey]);

  const handleClickUploadArea = () => {
    fileInputRef.current?.click();
  };
  
  // Handle generating quantum key if needed
  const handleGenerateQuantumKey = async () => {
    try {
      await ensureQuantumKey();
      setMissingQuantumKey(false);
      toast({
        title: "Quantum key created",
        description: "A quantum-resistant encryption key has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to generate quantum key",
        description: "Please try again or contact your administrator.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
            <Upload className="h-6 w-6 text-primary-600" />
          </div>
          <DialogTitle className="text-center">Upload and Encrypt Files</DialogTitle>
          <DialogDescription className="text-center">
            Files will be automatically encrypted using your preferred encryption method.
          </DialogDescription>
        </DialogHeader>

        {/* Upload area */}
        <div 
          className={`mt-4 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
            isDragging ? "border-primary-500 bg-primary-50" : "border-gray-300"
          } cursor-pointer`}
          onClick={handleClickUploadArea}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            <Database className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <Label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                <span>Upload a file</span>
                <Input 
                  id="file-upload" 
                  ref={fileInputRef}
                  name="file-upload" 
                  type="file" 
                  className="sr-only" 
                  onChange={handleFileChange}
                />
              </Label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">Files up to 10MB</p>
            {selectedFile && (
              <div className="mt-2 text-sm text-primary-600 font-medium">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>
        </div>

        {/* Encryption options */}
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="encryption-type">Encryption Method</Label>
            <Select 
              value={encryptionType} 
              onValueChange={(value) => setEncryptionType(value)}
            >
              <SelectTrigger id="encryption-type">
                <SelectValue placeholder="Select encryption method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aes">AES-256-GCM (Faster)</SelectItem>
                <SelectItem value="quantum">Kyber768 (Quantum-resistant)</SelectItem>
                <SelectItem value="dual">Dual Encryption (Most secure)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="sensitive" 
              checked={isSensitive} 
              onCheckedChange={(checked) => setIsSensitive(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label 
                htmlFor="sensitive" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Mark as sensitive
              </Label>
              <p className="text-sm text-muted-foreground">
                This will enforce quantum-resistant encryption.
              </p>
            </div>
          </div>
        </div>
        
        {/* Quantum key warning */}
        {missingQuantumKey && (
          <Alert className="mt-4 bg-amber-50 text-amber-800 border-amber-300">
            <AlertCircle className="h-5 w-5 text-amber-800" />
            <AlertDescription className="flex flex-col space-y-2">
              <p>A quantum encryption key is required for this operation but none exists.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-fit border-amber-500 hover:bg-amber-100 text-amber-800"
                onClick={handleGenerateQuantumKey}
              >
                <Shield className="mr-2 h-4 w-4" /> Generate Quantum Key
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || uploadFileMutation.isPending || missingQuantumKey}
          >
            {uploadFileMutation.isPending ? "Uploading..." : "Upload and Encrypt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
