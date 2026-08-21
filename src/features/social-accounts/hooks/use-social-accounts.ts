"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SocialAccount,
  CreateSocialAccountInput,
  UpdateSocialAccountInput,
} from "../types";

const ACCOUNTS_QUERY_KEY = ["social-accounts"];

async function fetchSocialAccounts(): Promise<SocialAccount[]> {
  const res = await fetch("/api/social-accounts");
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch social accounts");
  }
  return res.json();
}

export function useSocialAccounts() {
  return useQuery<SocialAccount[]>({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: fetchSocialAccounts,
  });
}

export function useCreateSocialAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSocialAccountInput): Promise<SocialAccount> => {
      const res = await fetch("/api/social-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create social account");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
  });
}

export function useUpdateSocialAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSocialAccountInput;
    }): Promise<SocialAccount> => {
      const res = await fetch(`/api/social-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update social account");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteSocialAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/social-accounts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete social account");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
