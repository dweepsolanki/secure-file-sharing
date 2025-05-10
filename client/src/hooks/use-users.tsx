import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useUsers() {
  const { toast } = useToast();

  // Get all users (admin only)
  const {
    data: users,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Update user (admin only)
  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      role,
      twoFactorEnabled,
    }: {
      userId: number;
      role?: string;
      twoFactorEnabled?: boolean;
    }) => apiRequest("PUT", `/api/users/${userId}`, { role, twoFactorEnabled }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User updated",
        description: "User details have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "An error occurred during user update",
        variant: "destructive",
      });
    },
  });

  return {
    users,
    isLoadingUsers,
    usersError,
    refetchUsers,
    updateUserMutation,
  };
}
