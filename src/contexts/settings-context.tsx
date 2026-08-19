"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserSettings } from "@/types/database";

// ─── Translation strings ───────────────────────────────────────────────────
const TRANSLATIONS: Record<string, Record<string, string>> = {
  id: {
    dashboard: "Dashboard",
    analytics: "Analitik",
    wallet: "Dompet",
    budget: "Budget",
    bills: "Tagihan",
    goals: "Impian & Tabungan",
    debt: "Hutang & Piutang",
    ai: "AI Insights",
    settings: "Pengaturan",
    profile: "Profil",
    income: "Pemasukan",
    expense: "Pengeluaran",
    total_balance: "Total Saldo",
    today: "Hari Ini",
    yesterday: "Kemarin",
    add_transaction: "Tambah Transaksi",
    save: "Simpan",
    cancel: "Batal",
    amount: "Jumlah",
    category: "Kategori",
    description: "Keterangan",
    date: "Tanggal",
    search: "Cari...",
    all: "Semua",
    welcome: "Selamat datang",
    net_cashflow: "Arus Kas",
  },
  en: {
    dashboard: "Dashboard",
    analytics: "Analytics",
    wallet: "Wallet",
    budget: "Budget",
    bills: "Bills",
    goals: "Savings Goals",
    debt: "Debts & Loans",
    ai: "AI Insights",
    settings: "Settings",
    profile: "Profile",
    income: "Income",
    expense: "Expense",
    total_balance: "Total Balance",
    today: "Today",
    yesterday: "Yesterday",
    add_transaction: "Add Transaction",
    save: "Save",
    cancel: "Cancel",
    amount: "Amount",
    category: "Category",
    description: "Notes",
    date: "Date",
    search: "Search...",
    all: "All",
    welcome: "Welcome",
    net_cashflow: "Net Cashflow",
  },
};

interface SettingsContextType {
  settings: UserSettings | null;
  privacyMode: boolean;
  togglePrivacy: () => void;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  formatAmount: (amount: number) => string;
  formatDate: (dateStr: string) => string;
  formatShortDate: (dateStr: string) => string;
  t: (key: string) => string;
  isLoading: boolean;
}

const DEFAULT_SETTINGS = {
  currency: "IDR",
  date_format: "DD/MM/YYYY",
  language: "id",
  privacy_mode: false,
  avatar_url: null,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  privacyMode: false,
  togglePrivacy: () => {},
  updateSettings: async () => {},
  formatAmount: (n) => `Rp ${n.toLocaleString("id-ID")}`,
  formatDate: (d) => d,
  formatShortDate: (d) => d,
  t: (k) => k,
  isLoading: true,
});

export function SettingsProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error || !data) {
          const { data: created } = await supabase
            .from("user_settings")
            .insert({ user_id: userId, ...DEFAULT_SETTINGS })
            .select()
            .single();
          if (created) setSettings(created as UserSettings);
        } else {
          setSettings(data as UserSettings);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [userId]);

  const togglePrivacy = useCallback(() => {
    setSettings((prev) => {
      if (!prev) return prev;
      const newPrivacy = !prev.privacy_mode;
      const next = { ...prev, privacy_mode: newPrivacy };
      createClient().from("user_settings").update({ privacy_mode: newPrivacy }).eq("user_id", userId).then(() => {});
      return next;
    });
  }, [userId]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      const { data, error } = await createClient()
        .from("user_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select()
        .single();
      if (!error && data) setSettings(data as UserSettings);
    } catch (e) {
      console.error("Failed to update settings:", e);
    }
  }, [userId]);

  // ─── Format amount using live settings ────────────────────────────────────
  const formatAmount = useCallback((amount: number): string => {
    if (settings?.privacy_mode) return "••••••";
    const currency = settings?.currency ?? "IDR";
    try {
      const locale = currency === "IDR" ? "id-ID" : "en-US";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `Rp ${amount.toLocaleString("id-ID")}`;
    }
  }, [settings]);

  // ─── Format date using live settings ──────────────────────────────────────
  const formatDate = useCallback((dateStr: string): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const d = date.getDate().toString().padStart(2, "0");
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      const y = date.getFullYear();
      const fmt = settings?.date_format ?? "DD/MM/YYYY";
      if (fmt === "MM/DD/YYYY") return `${m}/${d}/${y}`;
      if (fmt === "YYYY-MM-DD") return `${y}-${m}-${d}`;
      return `${d}/${m}/${y}`; // default DD/MM/YYYY
    } catch {
      return dateStr;
    }
  }, [settings]);

  // ─── Format short date ─────────────────────────────────────────────────────
  const formatShortDate = useCallback((dateStr: string): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const lang = settings?.language ?? "id";
      return date.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  }, [settings]);

  // ─── Translation function ──────────────────────────────────────────────────
  const t = useCallback((key: string): string => {
    const lang = settings?.language ?? "id";
    return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS["id"][key] ?? key;
  }, [settings]);

  return (
    <SettingsContext.Provider value={{
      settings,
      privacyMode: settings?.privacy_mode ?? false,
      togglePrivacy,
      updateSettings,
      formatAmount,
      formatDate,
      formatShortDate,
      t,
      isLoading,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
