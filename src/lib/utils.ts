import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export const CATEGORIES = {
  income: [
    "Gaji",
    "Freelance",
    "Investasi",
    "Bisnis",
    "Bonus",
    "Hadiah",
    "Lainnya",
  ],
  expense: [
    "Makanan",
    "Transportasi",
    "Belanja",
    "Tagihan",
    "Kesehatan",
    "Hiburan",
    "Pendidikan",
    "Lainnya",
  ],
} as const;
