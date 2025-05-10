import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityList } from "@/components/dashboard/activity-list";
import { useFiles } from "@/hooks/use-files";
import { useKeys } from "@/hooks/use-keys";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { UploadDialog } from "@/components/dialogs/upload-dialog";
import { Database, FileText, Shield, Upload } from "lucide-react";

export default function DashboardPage() {
  const [showUploadDialog, setShowUploadDialog] = React.useState(false);
  const { files, isLoadingFiles } = useFiles();
  const { keys, isLoadingKeys } = useKeys();
  const { user } = useAuth();

  // Calculate storage usage
  const totalSize = files?.reduce((sum, file) => sum + file.size, 0) || 0;
  const totalSizeMB = totalSize / (1024 * 1024);
  const storageLimit = 5 * 1024; // 5 GB in MB
  const storageUsagePercent = Math.min((totalSizeMB / storageLimit) * 100, 100);

  // Get encryption key status
  const aesKey = keys?.find(k => k.keyType === "aes" && k.isActive);
  const quantumKey = keys?.find(k => k.keyType === "quantum" && k.isActive);

  return (
    <AppLayout 
      title="Dashboard" 
      actions={
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      }
    >
      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Storage Used */}
        <StatsCard
          title="Storage Used"
          value={formatBytes(totalSize)}
          subvalue={`of ${storageLimit} MB`}
          icon={<Database className="h-6 w-6" />}
          progress={storageUsagePercent}
        />
        
        {/* Total Files */}
        <StatsCard
          title="Total Files"
          value={files?.length.toString() || "0"}
          icon={<FileText className="h-6 w-6" />}
          iconBgColor="bg-secondary-100"
          iconColor="text-secondary-600"
        />
        
        {/* Encryption Status */}
        <StatsCard
          title="Encryption Keys"
          value="Active"
          icon={<Shield className="h-6 w-6" />}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
        >
          <div className="mt-3">
            <div className="flex items-center mb-1">
              <span className="text-sm text-gray-700 w-32">AES-256</span>
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                {aesKey ? "Active" : "Not configured"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 w-32">Kyber768</span>
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                {quantumKey ? "Active" : "Not configured"}
              </span>
            </div>
          </div>
        </StatsCard>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <ActivityList files={files || []} />
      </div>

      {/* Upload Dialog */}
      <UploadDialog 
        open={showUploadDialog} 
        onOpenChange={setShowUploadDialog} 
      />
    </AppLayout>
  );
}
