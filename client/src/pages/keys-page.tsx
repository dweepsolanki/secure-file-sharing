import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useKeys } from "@/hooks/use-keys";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Key, Shield, RefreshCw, Plus } from "lucide-react";

export default function KeysPage() {
  const { keys, isLoadingKeys, generateKeyMutation, rotateKeyMutation } = useKeys();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showRotateDialog, setShowRotateDialog] = useState(false);
  const [newKeyType, setNewKeyType] = useState("aes");
  const [newKeyName, setNewKeyName] = useState("");
  const [keyToRotate, setKeyToRotate] = useState<number | null>(null);
  
  const [keyRotationPolicy, setKeyRotationPolicy] = useState("30");
  const [defaultEncryption, setDefaultEncryption] = useState("dual");
  
  // Group keys by type
  const aesKeys = keys?.filter(key => key.keyType === "aes") || [];
  const quantumKeys = keys?.filter(key => key.keyType === "quantum") || [];
  
  const handleGenerateKey = () => {
    generateKeyMutation.mutate({
      keyType: newKeyType,
      name: newKeyName || `${newKeyType === "aes" ? "AES-256" : "Kyber768"} Key`
    }, {
      onSuccess: () => {
        setShowGenerateDialog(false);
        setNewKeyType("aes");
        setNewKeyName("");
      }
    });
  };
  
  const openRotateDialog = (keyId: number) => {
    setKeyToRotate(keyId);
    setShowRotateDialog(true);
  };
  
  const handleRotateKey = () => {
    if (keyToRotate) {
      rotateKeyMutation.mutate(keyToRotate, {
        onSuccess: () => {
          setShowRotateDialog(false);
          setKeyToRotate(null);
        }
      });
    }
  };
  
  return (
    <AppLayout 
      title="Key Management" 
      actions={
        isAdmin && (
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate New Key
          </Button>
        )
      }
    >
      {/* AES Key Section */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md mb-8">
        <div className="px-4 py-5 sm:px-6 bg-blue-50 dark:bg-blue-900/20">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white flex items-center">
            <Shield className="h-6 w-6 mr-2 text-primary-500" />
            AES-256-GCM Encryption Keys
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Classical encryption for standard security
          </p>
        </div>
        {isLoadingKeys ? (
          <div className="p-6 flex justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {aesKeys.length === 0 ? (
              <li className="p-6 text-center text-gray-500 dark:text-gray-400">
                No AES keys found. {isAdmin && "Generate a new key to get started."}
              </li>
            ) : (
              aesKeys.map(key => (
                <li key={key.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full ${key.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'} flex items-center justify-center`}>
                          <span className="font-medium">A{key.id}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{key.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Created on {formatDate(key.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${key.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {key.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {isAdmin && key.isActive && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openRotateDialog(key.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Rotate
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-0">
                          <Key className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                          <span>Key ID: {key.keyId}</span>
                        </div>
                        {key.rotatedAt && (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-0 sm:ml-6">
                            <RefreshCw className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <span>Rotated on {formatDate(key.rotatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Quantum-Resistant Key Section */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md mb-8">
        <div className="px-4 py-5 sm:px-6 bg-purple-50 dark:bg-purple-900/20">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white flex items-center">
            <Shield className="h-6 w-6 mr-2 text-purple-500" />
            Kyber768 Quantum-Resistant Keys
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Post-quantum encryption for future-proof security
          </p>
        </div>
        {isLoadingKeys ? (
          <div className="p-6 flex justify-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {quantumKeys.length === 0 ? (
              <li className="p-6 text-center text-gray-500 dark:text-gray-400">
                No quantum-resistant keys found. {isAdmin && "Generate a new key to get started."}
              </li>
            ) : (
              quantumKeys.map(key => (
                <li key={key.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full ${key.isActive ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-700'} flex items-center justify-center`}>
                          <span className="font-medium">Q{key.id}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{key.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Created on {formatDate(key.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${key.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {key.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {isAdmin && key.isActive && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openRotateDialog(key.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Rotate
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-0">
                          <Key className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                          <span>Key ID: {key.keyId}</span>
                        </div>
                        {key.rotatedAt && (
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-0 sm:ml-6">
                            <RefreshCw className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <span>Rotated on {formatDate(key.rotatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Key Management Settings */}
      <div className="mt-8 bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Key Management Settings</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Configure automatic key rotation and security policies</p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            <div>
              <label className="text-base font-medium text-gray-900 dark:text-white">Key Rotation Policy</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Determine how frequently encryption keys should be automatically rotated</p>
              <RadioGroup 
                value={keyRotationPolicy} 
                onValueChange={setKeyRotationPolicy}
                className="mt-4 space-y-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="30" id="rotation-30" />
                  <Label htmlFor="rotation-30">Every 30 days (Recommended)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="60" id="rotation-60" />
                  <Label htmlFor="rotation-60">Every 60 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="90" id="rotation-90" />
                  <Label htmlFor="rotation-90">Every 90 days</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="rotation-manual" />
                  <Label htmlFor="rotation-manual">Manual rotation only</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <label className="text-base font-medium text-gray-900 dark:text-white">Default Encryption Method</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Select which encryption method should be used by default</p>
              <RadioGroup 
                value={defaultEncryption} 
                onValueChange={setDefaultEncryption}
                className="mt-4 space-y-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="aes" id="encryption-aes" />
                  <Label htmlFor="encryption-aes">AES-256-GCM (Faster)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quantum" id="encryption-kyber" />
                  <Label htmlFor="encryption-kyber">Kyber768 (Quantum-resistant)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dual" id="encryption-dual" />
                  <Label htmlFor="encryption-dual">Dual encryption (Most secure, slower)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
              <div className="flex justify-end space-x-3">
                <Button variant="outline">Cancel</Button>
                <Button>Save Settings</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Key Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate a New Encryption Key</DialogTitle>
            <DialogDescription>
              Create a new encryption key that will be used to secure your files.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="key-type">Key Type</Label>
              <Select
                value={newKeyType}
                onValueChange={setNewKeyType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a key type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aes">AES-256-GCM (Classical)</SelectItem>
                  <SelectItem value="quantum">Kyber768 (Quantum-resistant)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name (Optional)</Label>
              <Input
                id="key-name"
                placeholder={newKeyType === "aes" ? "AES Key" : "Quantum Key"}
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateKey}
              disabled={generateKeyMutation.isPending}
            >
              {generateKeyMutation.isPending ? "Generating..." : "Generate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Key Dialog */}
      <AlertDialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate Encryption Key</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new active key and mark the current one as inactive.
              Existing files will still be accessible with the old key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRotateKey}
              disabled={rotateKeyMutation.isPending}
            >
              {rotateKeyMutation.isPending ? "Rotating..." : "Rotate Key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
