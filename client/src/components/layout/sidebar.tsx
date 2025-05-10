import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderClosed,
  Share2,
  Key,
  Shield,
  Users,
  Clock,
  LogOut,
  Menu,
  X,
  UserCircle,
} from "lucide-react";

interface SidebarProps {
  onMenuToggle?: () => void;
  isMobile?: boolean;
  showMobileMenu?: boolean;
}

export function Sidebar({
  onMenuToggle,
  isMobile = false,
  showMobileMenu = false,
}: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const sidebarClass = cn(
    "fixed top-0 left-0 z-30 w-64 h-full bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col",
    {
      "translate-x-0": showMobileMenu,
      "-translate-x-full": !showMobileMenu,
    }
  );

  return (
    <>
      {/* Mobile menu backdrop */}
      {isMobile && showMobileMenu && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden"
          onClick={onMenuToggle}
        ></div>
      )}

      {/* Sidebar */}
      <div className={sidebarClass}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary-600" />
              <span className="text-primary-600 font-bold text-xl">SecureShare</span>
            </div>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={onMenuToggle}>
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            <NavLink href="/" active={location === "/"} icon={<LayoutDashboard />} label="Dashboard" />
            <NavLink href="/files" active={location === "/files"} icon={<FolderClosed />} label="My Files" />
            <NavLink href="/shared" active={location === "/shared"} icon={<Share2 />} label="Shared With Me" />
            <NavLink href="/keys" active={location === "/keys"} icon={<Key />} label="Key Management" />
            <NavLink href="/security" active={location === "/security"} icon={<Shield />} label="Security Settings" />

            {/* Admin section */}
            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</h3>
                <NavLink
                  href="/users"
                  active={location === "/users"}
                  icon={<Users />}
                  label="User Management"
                  className="mt-2"
                />
                <NavLink
                  href="/logs"
                  active={location === "/logs"}
                  icon={<Clock />}
                  label="Audit Logs"
                />
              </div>
            )}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 text-primary-700 rounded-full p-2">
                <UserCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{user?.username}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

interface NavLinkProps {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  className?: string;
}

function NavLink({ href, active, icon, label, className }: NavLinkProps) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center w-full px-4 py-2 text-left rounded-md",
          active ? "bg-primary-50 text-primary-600" : "text-gray-700 hover:bg-gray-100",
          className
        )}
      >
        <span className="h-5 w-5 mr-3">{icon}</span>
        {label}
      </a>
    </Link>
  );
}
