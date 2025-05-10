import { useQuery, useMutation } from "@tanstack/react-query";
import { EncryptionKey } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useKeys() {
  const { toast } = useToast();

  // Get all encryption keys
  const {
    data: keys,
    isLoading: isLoadingKeys,
    error: keysError,
    refetch: refetchKeys,
  } = useQuery<EncryptionKey[]>({
    queryKey: ["/api/keys"],
  });

  // Generate a new key
  const generateKeyMutation = useMutation({
    mutationFn: ({
      keyType,
      name,
    }: {
      keyType: string;
      name?: string;
    }) => apiRequest("POST", "/api/keys", { keyType, name }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({
        title: "Key generated",
        description: "New encryption key has been generated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Key generation failed",
        description: error.message || "An error occurred during key generation",
        variant: "destructive",
      });
    },
  });

  // Rotate a key
  const rotateKeyMutation = useMutation({
    mutationFn: (keyId: number) => apiRequest("PUT", `/api/keys/${keyId}/rotate`),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({
        title: "Key rotated",
        description: "Encryption key has been rotated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Key rotation failed",
        description: error.message || "An error occurred during key rotation",
        variant: "destructive",
      });
    },
  });

  return {
    keys,
    isLoadingKeys,
    keysError,
    refetchKeys,
    generateKeyMutation,
    rotateKeyMutation,
    // Helper functions
    getActiveAesKey: () => keys?.find(k => k.keyType === "aes" && k.isActive),
    getActiveQuantumKey: () => keys?.find(k => k.keyType === "quantum" && k.isActive),
    getKeysByType: (keyType: string) => keys?.filter(k => k.keyType === keyType),
  };
}
