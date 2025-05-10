import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SecuritySetting } from "@shared/schema";
import { getSecuritySettingsWithDefaults } from "@/lib/file-service";
import { formatDateTime } from "@/lib/utils";
import { AlertCircle, Shield, Key, Lock, History, Computer } from "lucide-react";

export default function SecurityPage() {
  const { toast } = useToast();

  // Fetch security settings
  const {
    data: securitySettings,
    isLoading,
    error,
  } = useQuery<SecuritySetting>({
    queryKey: ["/api/security"],
  });

  // Form state
  const [settings, setSettings] = useState<SecuritySetting | null>(null);

  // Update settings when data is loaded
  React.useEffect(() => {
    if (securitySettings) {
      setSettings(securitySettings);
    }
  }, [securitySettings]);

  // Save settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: Partial<SecuritySetting>) =>
      apiRequest("PUT", "/api/security", updatedSettings),
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/security"], data);
      toast({
        title: "Security settings updated",
        description: "Your security settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings) {
      updateSettingsMutation.mutate({
        keyRotationDays: settings.keyRotationDays,
        defaultEncryption: settings.defaultEncryption,
        enforceQuantumForSensitive: settings.enforceQuantumForSensitive,
        autoEncrypt: settings.autoEncrypt,
        secureDelete: settings.secureDelete,
      });
    }
  };

  // Create handlers for form fields
  const handleChange = (field: keyof SecuritySetting, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  // Default settings for display
  const displaySettings = settings || getSecuritySettingsWithDefaults(null);

  return (
    <AppLayout title="Security Settings">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center text-red-500 mb-4">
              <AlertCircle className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-medium">Error loading security settings</h3>
            </div>
            <p className="text-gray-500 dark:text-gray-400">Please try again later.</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/security"] })} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Two-Factor Authentication */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2 text-primary-500" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add additional security to your account using two-factor authentication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Enable 2FA
              </Button>
            </CardContent>
          </Card>

          {/* Login Sessions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Computer className="h-5 w-5 mr-2 text-primary-500" />
                Login Sessions
              </CardTitle>
              <CardDescription>
                You're currently logged in on these devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <div className="py-4 flex justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Current Session (This device)</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Started {formatDateTime(new Date())}</p>
                  </div>
                  <span className="px-3 py-1 h-6 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Current</span>
                </div>
              </div>
              <Button variant="destructive" className="mt-5">
                <History className="h-4 w-4 mr-2" />
                Log out of all other sessions
              </Button>
            </CardContent>
          </Card>

          {/* Encryption Preferences */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2 text-primary-500" />
                Encryption Preferences
              </CardTitle>
              <CardDescription>
                Configure your default encryption settings for new files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="quantum-sensitive">Enforce quantum-resistant encryption for sensitive data</Label>
                    <p className="text-sm text-muted-foreground">
                      Files tagged as sensitive will always use Kyber768 encryption regardless of other settings.
                    </p>
                  </div>
                  <Switch
                    id="quantum-sensitive"
                    checked={displaySettings.enforceQuantumForSensitive}
                    onCheckedChange={(checked) => handleChange("enforceQuantumForSensitive", checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-encrypt">Automatically encrypt all uploaded files</Label>
                    <p className="text-sm text-muted-foreground">
                      Turn off to selectively choose which files to encrypt upon upload.
                    </p>
                  </div>
                  <Switch
                    id="auto-encrypt"
                    checked={displaySettings.autoEncrypt}
                    onCheckedChange={(checked) => handleChange("autoEncrypt", checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="secure-delete">Secure file deletion</Label>
                    <p className="text-sm text-muted-foreground">
                      Overwrite file data multiple times when deleted to prevent recovery.
                    </p>
                  </div>
                  <Switch
                    id="secure-delete"
                    checked={displaySettings.secureDelete}
                    onCheckedChange={(checked) => handleChange("secureDelete", checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="key-rotation">Key rotation period (days)</Label>
                  <Input
                    id="key-rotation"
                    type="number"
                    min={1}
                    max={365}
                    value={displaySettings.keyRotationDays}
                    onChange={(e) => handleChange("keyRotationDays", parseInt(e.target.value) || 30)}
                  />
                  <p className="text-sm text-muted-foreground">
                    How often encryption keys should be automatically rotated.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="default-encryption">Default encryption type</Label>
                  <select
                    id="default-encryption"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={displaySettings.defaultEncryption}
                    onChange={(e) => handleChange("defaultEncryption", e.target.value)}
                  >
                    <option value="aes">AES-256-GCM (Faster)</option>
                    <option value="quantum">Kyber768 (Quantum-resistant)</option>
                    <option value="dual">Dual Encryption (Most secure)</option>
                  </select>
                  <p className="text-sm text-muted-foreground">
                    The encryption method used by default for new uploads.
                  </p>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending || !settings}
                  >
                    {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </AppLayout>
  );
}
