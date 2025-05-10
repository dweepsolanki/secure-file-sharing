import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { AlertCircle, Plus, UserCircle, Shield, Mail, Calendar, Search } from "lucide-react";

export default function UsersPage() {
  const [, navigate] = useLocation();
  const { user: currentUser } = useAuth();
  const { users, isLoadingUsers, usersError, updateUserMutation } = useUsers();
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Check if current user is admin
  React.useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      navigate("/");
    }
  }, [currentUser, navigate]);
  
  // Filter users based on search term
  const filteredUsers = users?.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditUserDialog(true);
  };
  
  const handleSaveUser = () => {
    if (!selectedUser) return;
    
    updateUserMutation.mutate({
      userId: selectedUser.id,
      role: selectedUser.role,
      twoFactorEnabled: selectedUser.twoFactorEnabled
    }, {
      onSuccess: () => {
        setShowEditUserDialog(false);
        setSelectedUser(null);
      }
    });
  };
  
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <AppLayout title="Access Denied">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this page.
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout 
      title="User Management" 
      actions={
        <Button onClick={() => setShowAddUserDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
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
            placeholder="Search users by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* User table */}
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
              {isLoadingUsers ? (
                <div className="p-6 flex justify-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                  </div>
                </div>
              ) : usersError ? (
                <div className="p-6 text-center text-red-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Error loading users</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Security</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Active</th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300">
                                <UserCircle className="h-6 w-6" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white capitalize">{user.role}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.role === "admin" ? "Full access" : "Standard access"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {user.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.role === "admin" ? "Key Management Access" : "Standard Access"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {user.lastActive ? formatDateTime(user.lastActive) : "Never"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button 
                              variant="link" 
                              onClick={() => handleEditUser(user)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          {searchTerm ? "No users match your search" : "No users found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit User Dialog */}
      {selectedUser && (
        <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user role and security settings
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">Username</label>
                <Input
                  value={selectedUser.username}
                  readOnly
                  className="col-span-3 bg-gray-50"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">Email</label>
                <Input
                  value={selectedUser.email}
                  readOnly
                  className="col-span-3 bg-gray-50"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">Role</label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                  disabled={selectedUser.id === currentUser?.id}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">2FA</label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Checkbox
                    id="2fa"
                    checked={selectedUser.twoFactorEnabled}
                    onCheckedChange={(checked) => 
                      setSelectedUser({ ...selectedUser, twoFactorEnabled: checked === true })
                    }
                  />
                  <label htmlFor="2fa" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Two-factor authentication enabled
                  </label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Add User Dialog (placeholder - would use registration form) */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account
            </DialogDescription>
          </DialogHeader>
          
          <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
            Please use the registration form to create a new user account.
          </p>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setShowAddUserDialog(false); navigate("/auth"); }}>
              Go to Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
