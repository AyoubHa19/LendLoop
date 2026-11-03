import { Brush, Drill, Hammer, Package, Sprout, StepForward, type LucideIcon } from "lucide-react";
import type { Category } from "@/convex/lib/constants";

const ICONS: Record<Category, LucideIcon> = {
  "power-tools": Drill,
  "hand-tools": Hammer,
  garden: Sprout,
  ladders: StepForward,
  cleaning: Brush,
  other: Package,
};

/** The tool's category as a line icon in a fixed-size box, so rows align. */
export function CategoryIcon({ category, size = "md" }: { category: Category; size?: "sm" | "md" }) {
  const Icon = ICONS[category];
  const box = size === "sm" ? "size-8 rounded-md" : "size-10 rounded-lg";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-raised text-fg-2 ${box}`} aria-hidden>
      <Icon size={size === "sm" ? 16 : 18} strokeWidth={1.5} />
    </span>
  );
}
