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
      // Persist async
      createClient()
        .from("user_settings")
        .update({ privacy_mode: newPrivacy })
        .eq("user_id", userId)
        .then(() => {});
      return next;
    });
  }, [userId]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
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

  const formatAmount = useCallback((amount: number): string => {
    // Privacy mode: show dots
    if (settings?.privacy_mode) return "••••••";
    const currency = settings?.currency ?? "IDR";
    try {
      if (currency === "IDR") {
        return new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `Rp ${amount.toLocaleString("id-ID")}`;
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{
      settings,
      privacyMode: settings?.privacy_mode ?? false,
      togglePrivacy,
      updateSettings,
      formatAmount,
      isLoading,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
