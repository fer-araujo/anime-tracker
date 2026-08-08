"use client";

import { useUserListsContext } from "@/providers/UserListsProvider";

export type { UserList } from "@/providers/UserListsProvider";

/**
 * Reads the shared list state owned by UserListsProvider.
 *
 * The fetching logic used to live here, which meant it ran once per consumer —
 * four identical Supabase queries and four identical /anime/batch POSTs on a
 * single homepage load. The hook stays as the entry point so no call site had
 * to change; what moved is who owns the data.
 */
export function useUserLists() {
  return useUserListsContext();
}
