import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { User, File } from "@shared/schema";
import { useFiles } from "@/hooks/use-files";
import { useQuery } from "@tanstack/react-query";
import { getPermissionLabel } from "@/lib/utils";
import { Share2, User as UserIcon } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
}

export function ShareDialog({ open, onOpenChange, file }: ShareDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [permission, setPermission] = useState<string>("view");
  const [allowReshare, setAllowReshare] = useState<boolean>(false);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [hasExpiration, setHasExpiration] = useState<boolean>(false);
  
  const { toast } = useToast();
  const { shareFileMutation } = useFiles();
  
  // Fetch users for sharing using the dedicated endpoint
  const { data: users, isError: usersError } = useQuery<User[]>({
    queryKey: ["/api/users/for-sharing"],
    staleTime: 60000,
    retry: 1,
  });
  
  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setSelectedUserId("");
      setSearchTerm("");
      setPermission("view");
      setAllowReshare(false);
      setExpiresAt("");
      setHasExpiration(false);
    }
  }, [open]);
  
  const filteredUsers = users?.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });
  
  const handleShare = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to share",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedUserId) {
      toast({
        title: "No user selected",
        description: "Please select a user to share with",
        variant: "destructive"
      });
      return;
    }
    
    const parsedUserId = parseInt(selectedUserId);
    
    shareFileMutation.mutate(
      {
        fileId: file.id,
        userId: parsedUserId,
        permission,
        allowReshare,
        expiresAt: hasExpiration && expiresAt ? new Date(expiresAt) : undefined
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        }
      }
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
            <Share2 className="h-6 w-6 text-primary-600" />
          </div>
          <DialogTitle className="text-center">
            Share {file?.name}
          </DialogTitle>
          <DialogDescription className="text-center">
            Choose users and permissions for secure file sharing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="search-users">Share with</Label>
            <Input 
              id="search-users"
              placeholder="Search users by name or email" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {searchTerm && filteredUsers && filteredUsers.length > 0 ? (
            <div className="border rounded-md max-h-40 overflow-y-auto">
              {filteredUsers.map(user => (
                <div 
                  key={user.id}
                  className={`flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer ${
                    selectedUserId === user.id.toString() ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => setSelectedUserId(user.id.toString())}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{user.username}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  {selectedUserId === user.id.toString() && (
                    <div className="w-16">
                      <Select 
                        value={permission}
                        onValueChange={setPermission}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View only</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="text-center py-2 text-sm text-gray-500">
              No users found
            </div>
          ) : usersError ? (
            <div className="text-center py-2 text-sm text-red-500">
              Unable to load users. Please try again.
            </div>
          ) : null}
          
          <div className="space-y-4 pt-2">
            {selectedUserId && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="allow-reshare" 
                    checked={allowReshare}
                    onCheckedChange={(checked) => setAllowReshare(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="allow-reshare">Allow recipients to reshare</Label>
                    <p className="text-sm text-muted-foreground">
                      Recipients can share this file with others.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="expiration" 
                    checked={hasExpiration}
                    onCheckedChange={(checked) => setHasExpiration(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="expiration">Set expiration date</Label>
                    {hasExpiration && (
                      <Input 
                        type="date" 
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="mt-2"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleShare}
            disabled={!selectedUserId || shareFileMutation.isPending}
          >
            {shareFileMutation.isPending ? "Sharing..." : "Share File"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
