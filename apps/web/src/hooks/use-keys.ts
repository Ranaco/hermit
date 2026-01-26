import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { keyService, type CreateKeyData } from "@/services/key.service";
import { toast } from "sonner";

export function useKeys(vaultId?: string) {
  return useQuery({
    queryKey: ["keys", vaultId],
    queryFn: () => keyService.getAll(vaultId!),
    enabled: !!vaultId,
  });
}

export function useKey(id: string) {
  return useQuery({
    queryKey: ["keys", id],
    queryFn: () => keyService.getById(id),
    enabled: !!id,
  });
}

export function useCreateKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateKeyData) => keyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
      toast.success("Key created successfully");
    },
    onError: () => {
      toast.error("Failed to create key");
    },
  });
}

export function useDeleteKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => keyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
      toast.success("Key deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete key");
    },
  });
}

export function useRotateKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => keyService.rotate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keys"] });
      toast.success("Key rotated successfully");
    },
    onError: () => {
      toast.error("Failed to rotate key");
    },
  });
}

export function useEncrypt() {
  return useMutation({
    mutationFn: ({ keyId, plaintext }: { keyId: string; plaintext: string }) =>
      keyService.encrypt(keyId, plaintext),
    onSuccess: () => {
      toast.success("Data encrypted successfully");
    },
    onError: () => {
      toast.error("Encryption failed");
    },
  });
}

export function useDecrypt() {
  return useMutation({
    mutationFn: ({ keyId, ciphertext }: { keyId: string; ciphertext: string }) =>
      keyService.decrypt(keyId, ciphertext),
    onSuccess: () => {
      toast.success("Data decrypted successfully");
    },
    onError: () => {
      toast.error("Decryption failed");
    },
  });
}
