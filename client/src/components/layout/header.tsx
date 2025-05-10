import React from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, onMenuToggle, actions }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white shadow-sm lg:hidden">
      <div className="px-4 py-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {actions}
        </div>
      </div>
    </header>
  );
}
