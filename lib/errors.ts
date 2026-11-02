import { ConvexError } from "convex/values";

/**
 * Text to show the user for a failed Convex call. Our functions throw
 * ConvexError with a readable message; anything else is unexpected, so we
 * show a generic line instead of internal details.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") return error.data;
  return "Something went wrong. Please try again.";
}
