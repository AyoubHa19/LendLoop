import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// Bricolage Grotesque for headlines, Instrument Sans for the interface,
// Geist Mono for dates and counts.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "LendLoop", template: "%s · LendLoop" },
  description: "Borrow and lend tools with your neighbours.",
};

// Clerk's sign-in modal and user menu use the same tokens as the app, so
// they switch with light/dark mode instead of staying white.
const clerkAppearance = {
  variables: {
    colorPrimary: "var(--primary)",
    colorPrimaryForeground: "var(--on-primary)",
    colorForeground: "var(--fg)",
    colorMutedForeground: "var(--fg-2)",
    colorMuted: "var(--raised)",
    colorBackground: "var(--surface)",
    colorInput: "var(--surface)",
    colorInputForeground: "var(--fg)",
    colorBorder: "var(--line-strong)",
    colorRing: "var(--fg)",
    colorDanger: "var(--negative)",
    fontFamily: "var(--font-instrument-sans)",
    borderRadius: "0.5rem",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class before React loads, hence the warning opt-out.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${instrumentSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {/* Clerk knows who is signed in; Convex, inside it, sends that
              session's token with every request. */}
          <ClerkProvider appearance={clerkAppearance}>
            <ConvexClientProvider>
              <SiteHeader />
              <main className="flex flex-1 flex-col">{children}</main>
            </ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
