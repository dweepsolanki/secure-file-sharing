import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import FilesPage from "@/pages/files-page";
import SharedFilesPage from "@/pages/shared-files-page";
import KeysPage from "@/pages/keys-page";
import SecurityPage from "@/pages/security-page";
import UsersPage from "@/pages/users-page";
import AuditLogsPage from "@/pages/audit-logs-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/files" component={FilesPage} />
      <ProtectedRoute path="/shared" component={SharedFilesPage} />
      <ProtectedRoute path="/keys" component={KeysPage} />
      <ProtectedRoute path="/security" component={SecurityPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/logs" component={AuditLogsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <ThemeProvider defaultTheme="light" storageKey="secureshare-theme">
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </ThemeProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
