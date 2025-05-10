import React from "react";
import { AuditLog, File, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EncryptBadge } from "@/components/ui/encrypt-badge";
import { formatDateTime, formatBytes } from "@/lib/utils";

interface ActivityListProps {
  files: File[];
  logs?: AuditLog[];
  users?: User[];
  limit?: number;
}

export function ActivityList({ files, logs, users, limit = 3 }: ActivityListProps) {
  // Sort files by createdAt
  const sortedFiles = [...(files || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Limit the number of files to display
  const recentFiles = sortedFiles.slice(0, limit);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-gray-200">
          {recentFiles.length === 0 ? (
            <li className="py-4 text-center text-sm text-gray-500">
              No recent activity
            </li>
          ) : (
            recentFiles.map((file) => (
              <li key={file.id} className="px-1 py-4">
                <div className="flex items-center">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-600 truncate">
                        {file.name}
                      </p>
                      <div className="mt-1 flex text-sm text-gray-500">
                        <span className="truncate">
                          Encrypted with <EncryptBadge type={file.encryptionType} />
                        </span>
                        <span className="ml-1 flex-shrink-0">· {formatBytes(file.size)}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex-shrink-0 sm:mt-0">
                      <div className="flex space-x-4">
                        <p className="text-sm text-gray-500">
                          {file.lastAccessed
                            ? `Accessed ${formatDateTime(file.lastAccessed)}`
                            : `Uploaded ${formatDateTime(file.createdAt)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
