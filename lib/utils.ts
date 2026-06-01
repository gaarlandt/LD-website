import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function asset(path: string): string {
  return `${basePath}${path}`;
}

/** Merge class names; Tailwind utilities are de-duped, .ld-* classes pass through. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
