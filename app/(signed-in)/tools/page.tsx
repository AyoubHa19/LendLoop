import type { Metadata } from "next";
import { ToolsBoard } from "./ToolsBoard";

export const metadata: Metadata = { title: "All tools" };

export default function ToolsPage() {
  return <ToolsBoard />;
}
