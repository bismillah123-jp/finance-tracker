"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserSettings } from "@/types/database";

interface SettingsContextType {
  settings: UserSettings | null;
  privacyMode: boolean;
  togglePrivacy: () => void;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  formatAmount: (amount: number) => string;
  isLoading: boolean;
}

const DEFAULT_SETTINGS: Omit<UserSettings, "id" | "user_id" | "created_at" | "updated_at"> = {
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
  isLoading: true,
});

export function SettingsProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        // Auto-create default settings
        const { data: created } = await supabase
          .from("user_settings")
          .insert({ user_id: userId, ...DEFAULT_SETTINGS })
          .select()
          .single();
        if (created) setSettings(created as UserSettings);
      } else {
        setSettings(data as UserSettings);
      }
      setIsLoading(false);
    }
    load();
  }, [userId]);

  const togglePrivacy = useCallback(() => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, privacy_mode: !prev.privacy_mode };
      // persist async
      createClient().from("user_settings").update({ privacy_mode: next.privacy_mode }).eq("user_id", userId);
      return next;
    });
  }, [userId]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single();
    if (!error && data) setSettings(data as UserSettings);
  }, [userId]);

  const formatAmount = useCallback((amount: number): string => {
    const currency = settings?.currency ?? "IDR";
    if (settings?.privacy_mode) return "••••••";
    if (currency === "IDR") {
      return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
    }
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, privacyMode: settings?.privacy_mode ?? false, togglePrivacy, updateSettings, formatAmount, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
