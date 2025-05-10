import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

export function AppLayout({ children, title, actions }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Close mobile menu when transitioning from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setShowMobileMenu(false);
    }
  }, [isMobile]);

  const handleMenuToggle = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar 
        onMenuToggle={handleMenuToggle} 
        isMobile={isMobile} 
        showMobileMenu={showMobileMenu} 
      />
      
      <div className="flex-1 flex flex-col">
        <Header 
          title={title} 
          onMenuToggle={handleMenuToggle} 
          actions={actions} 
        />
        
        <div className={isMobile ? "mt-14" : ""}>
          <div className="flex-1 pb-10">
            <header className="bg-white dark:bg-gray-800 shadow-sm">
              <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden lg:block">
                  {title}
                </h1>
                <div className="hidden lg:block">{actions}</div>
              </div>
            </header>
            
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
