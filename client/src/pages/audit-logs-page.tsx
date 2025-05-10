import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AuditLog } from "@shared/schema";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { AlertCircle, FileText, Search, DownloadCloud, Upload, Clock, Key, Database, Lock, UserCog, LogOut, LogIn, FileX, Share2 } from "lucide-react";

export default function AuditLogsPage() {
  const [, navigate] = useLocation();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  
  // Redirect non-admin users
  React.useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);
  
  // Fetch audit logs
  const {
    data: logs,
    isLoading,
    error,
  } = useQuery<AuditLog[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 60000, // Refresh every minute
    enabled: currentUser?.role === "admin" // Only run the query for admin users
  });
  
  // This admin check is already handled by the useEffect above
  
  // Filter logs based on search term and action filter
  const filteredLogs = logs?.filter(log => {
    const matchesSearch = 
      (log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resourceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });
  
  // Get unique actions for filter
  const uniqueActions = logs ? 
    ["all", ...new Set(logs.map(log => log.action))] : 
    ["all"];
  
  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case "UPLOAD":
        return <Upload className="h-4 w-4" />;
      case "DOWNLOAD":
        return <DownloadCloud className="h-4 w-4" />;
      case "DELETE":
        return <FileX className="h-4 w-4" />;
      case "SHARE":
        return <Share2 className="h-4 w-4" />;
      case "UNSHARE":
        return <FileX className="h-4 w-4" />;
      case "LOGIN":
        return <LogIn className="h-4 w-4" />;
      case "LOGOUT":
        return <LogOut className="h-4 w-4" />;
      case "REGISTER":
        return <UserCog className="h-4 w-4" />;
      case "CREATE_KEY":
        return <Key className="h-4 w-4" />;
      case "ROTATE_KEY":
        return <Key className="h-4 w-4" />;
      case "UPDATE_SECURITY_SETTINGS":
        return <Lock className="h-4 w-4" />;
      case "UPDATE_USER":
        return <UserCog className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  // Get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case "UPLOAD":
      case "CREATE_KEY":
      case "REGISTER":
        return "text-green-500";
      case "DELETE":
      case "UNSHARE":
        return "text-red-500";
      case "SHARE":
      case "DOWNLOAD":
        return "text-blue-500";
      case "LOGIN":
      case "LOGOUT":
        return "text-purple-500";
      case "ROTATE_KEY":
      case "UPDATE_SECURITY_SETTINGS":
      case "UPDATE_USER":
        return "text-amber-500";
      default:
        return "text-gray-500";
    }
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
    <AppLayout title="Audit Logs">
      <div className="mb-6 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input 
            className="pl-10" 
            placeholder="Search logs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select
            value={actionFilter}
            onValueChange={setActionFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>
                  {action === "all" ? "All Actions" : action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Card className="overflow-hidden">
        <CardHeader className="bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Security Audit Logs</CardTitle>
              <CardDescription>Review all system security events</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error loading audit logs</p>
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resource</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center text-sm font-medium ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          <span className="ml-2">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.userId || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{log.resource || '-'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{log.resourceId || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.ipAddress || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>No audit logs found</p>
              {searchTerm || actionFilter !== "all" ? (
                <p className="mt-2 text-sm">Try adjusting your filters</p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
