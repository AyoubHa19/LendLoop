"use client";

import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";

/**
 * useQuery for pages that need a signed-in user. It waits until Convex has
 * the Clerk token before asking, so the page shows "Loading" instead of
 * briefly showing the signed-out answer (an empty list, "admins only").
 * Returns undefined while waiting, like useQuery does while loading.
 */
export function useSignedInQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: Query["_args"],
): FunctionReturnType<Query> | undefined {
  const { isAuthenticated } = useConvexAuth();
  // useQuery's rest-args typing can't follow a generic query; the call is
  // the same as useQuery(query, args) or useQuery(query, "skip").
  const skipOrArgs = (isAuthenticated ? args : "skip") as Parameters<typeof useQuery<Query>>[1];
  return useQuery(query, skipOrArgs);
}
