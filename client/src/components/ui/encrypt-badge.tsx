import React from "react";
import { cn } from "@/lib/utils";
import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface EncryptBadgeProps {
  type: string;
  className?: string;
}

export function EncryptBadge({ type, className }: EncryptBadgeProps) {
  let badgeClasses = "";
  let badgeIcon = null;
  let badgeText = "";

  switch (type) {
    case "aes":
      badgeClasses = "bg-green-100 text-green-800";
      badgeIcon = <Shield className="h-3 w-3 mr-1" />;
      badgeText = "AES-256";
      break;
    case "quantum":
      badgeClasses = "bg-blue-100 text-blue-800";
      badgeIcon = <ShieldCheck className="h-3 w-3 mr-1" />;
      badgeText = "Kyber768";
      break;
    case "dual":
      badgeClasses = "bg-amber-100 text-amber-800";
      badgeIcon = <ShieldAlert className="h-3 w-3 mr-1" />;
      badgeText = "Dual Encrypted";
      break;
    default:
      badgeClasses = "bg-gray-100 text-gray-800";
      badgeIcon = <Shield className="h-3 w-3 mr-1" />;
      badgeText = "Encrypted";
  }

  return (
    <div
      className={cn(
        "inline-flex items-center text-xs px-2 py-1 rounded-full",
        badgeClasses,
        className
      )}
    >
      {badgeIcon}
      <span>{badgeText}</span>
    </div>
  );
}
