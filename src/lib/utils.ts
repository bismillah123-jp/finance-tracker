import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "IDR"): string {
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateString: string, format = "DD/MM/YYYY"): string {
  const date = new Date(dateString);
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  if (format === "MM/DD/YYYY") return `${m}/${d}/${y}`;
  if (format === "YYYY-MM-DD") return `${y}-${m}-${d}`;
  return `${d}/${m}/${y}`;
}

export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export const CATEGORIES = {
  income: ["Gaji", "Freelance", "Investasi", "Bisnis", "Bonus", "Hadiah", "Lainnya"],
  expense: ["Makanan", "Transportasi", "Belanja", "Tagihan", "Kesehatan", "Hiburan", "Pendidikan", "Lainnya"],
} as const;
