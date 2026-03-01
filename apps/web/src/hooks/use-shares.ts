import { useMutation } from "@tanstack/react-query";
import { shareService, CreateSharePayload } from "../services/share.service";
import { toast } from "sonner";

export const useCreateShare = () => {
  return useMutation({
    mutationFn: (payload: CreateSharePayload) => shareService.createShare(payload),
    onSuccess: () => {
      toast.success("Share link created successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || "Failed to create share link");
    },
  });
};

export const useConsumeShare = () => {
  return useMutation({
    mutationFn: ({ token, passphrase }: { token: string; passphrase?: string }) => 
      shareService.consumeShare(token, passphrase),
  });
};
