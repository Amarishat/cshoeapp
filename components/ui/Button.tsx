import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary";
/** md = Login "Log in" (55px, 22px text); lg = Product "Add To Bag" / "Buy Now" (60px, 19px text). */
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white",
  secondary: "border border-border bg-white text-ink",
};

const sizes: Record<Size, string> = {
  md: "h-[55px] rounded-button text-heading",
  lg: "h-[60px] rounded-button-lg text-body",
};

function buttonClasses(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex items-center justify-center px-5 py-2.5 font-semibold whitespace-nowrap transition-opacity disabled:opacity-50 aria-disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type Common = { variant?: Variant; size?: Size };

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: Common & ComponentProps<"button">) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: Common & ComponentProps<typeof Link>) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
