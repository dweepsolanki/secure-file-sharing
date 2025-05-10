import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  subvalue?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  progress?: number;
  children?: React.ReactNode;
}

export function StatsCard({
  title,
  value,
  subvalue,
  icon,
  iconBgColor = "bg-primary-100",
  iconColor = "text-primary-600",
  progress,
  children,
}: StatsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor)}>
            <div className={iconColor}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd>
              <div className="flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{value}</p>
                {subvalue && <p className="ml-2 text-sm text-gray-500">{subvalue}</p>}
              </div>
              {progress !== undefined && (
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              )}
            </dd>
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  );
}
