import type { ButtonHTMLAttributes, ReactNode } from "react";

// Small building blocks so every page shares one spacing scale, one radius
// scale and the colour tokens from globals.css.

const BUTTON_STYLES = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-raised",
  danger: "border border-line-strong bg-surface text-negative hover:bg-raised",
  ghost: "text-fg-2 hover:bg-raised hover:text-fg",
} as const;
export type ButtonVariant = keyof typeof BUTTON_STYLES;

/** Button look, also used for links that act like buttons. */
export function buttonClass(variant: ButtonVariant = "primary", size: "md" | "lg" = "md") {
  const height = size === "lg" ? "h-11 px-5 text-[15px]" : "h-9 px-4 text-sm";
  return `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,opacity,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${height} ${BUTTON_STYLES[variant]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "md" | "lg" }) {
  return <button className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

const DOT_STYLES = {
  positive: "bg-positive",
  warning: "bg-warning",
  negative: "bg-negative",
  neutral: "bg-fg-3",
} as const;
export type Tone = keyof typeof DOT_STYLES;

/** A status as a coloured dot and a plain label, not a pill. */
export function Status({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-fg-2">
      <span className={`size-1.5 rounded-full ${DOT_STYLES[tone]}`} aria-hidden />
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-5 shadow-card ${className}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-medium leading-tight tracking-[-0.01em]">{title}</h1>
        {description && <p className="text-[15px] text-fg-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="text-sm text-fg-2">{children}</div>}
    </div>
  );
}

export function Loading() {
  return <p className="text-sm text-fg-3">Loading</p>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm text-negative">
      {children}
    </p>
  );
}

export const inputClass =
  "h-9 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-3 transition-colors duration-150 ease-out hover:border-fg-3";

export const labelClass = "flex flex-col gap-1.5 text-[13px] font-medium text-fg-2";
