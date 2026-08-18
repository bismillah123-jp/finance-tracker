"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Globe, DollarSign, Calendar, Lock, Upload, Check, Loader2, Download, Upload as UploadIcon } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Transaction, Bill, Budget, SavingsGoal, Debt } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useTheme } from "@/contexts/theme-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SettingsTabProps {
  user: SupabaseUser;
  transactions: Transaction[];
  userId: string;
}

const CURRENCIES = [
  { code: "IDR", label: "Rupiah (Rp)", flag: "🇮🇩" },
  { code: "USD", label: "US Dollar ($)", flag: "🇺🇸" },
  { code: "EUR", label: "Euro (€)", flag: "🇪🇺" },
  { code: "SGD", label: "Singapore Dollar (S$)", flag: "🇸🇬" },
  { code: "MYR", label: "Malaysian Ringgit (RM)", flag: "🇲🇾" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-12-31)" },
];

const LANGUAGES = [
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "en", label: "English", flag: "🇺🇸" },
];

export default function SettingsTab({ user, transactions, userId }: SettingsTabProps) {
  const { toast } = useToast();
  const { settings, updateSettings, privacyMode, togglePrivacy } = useSettings();
  const { theme, toggleTheme } = useTheme();

  // Password change state
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleCurrencyChange(currency: string) {
    await updateSettings({ currency });
    toast({ title: `✅ Currency diubah ke ${currency}` });
  }

  async function handleDateFormatChange(date_format: string) {
    await updateSettings({ date_format });
    toast({ title: "✅ Format tanggal diperbarui!" });
  }

  async function handleLanguageChange(language: string) {
    await updateSettings({ language });
    toast({ title: "✅ Bahasa diperbarui!" });
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPass !== confirmPass) { toast({ title: "Password tidak cocok", variant: "destructive" }); return; }
    if (newPass.length < 6) { toast({ title: "Password minimal 6 karakter", variant: "destructive" }); return; }
    setChangingPass(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast({ title: "Gagal ubah password", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Password berhasil diubah!" }); setOldPass(""); setNewPass(""); setConfirmPass(""); setShowPassForm(false); }
    setChangingPass(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast({ title: "File terlalu besar (max 2MB)", variant: "destructive" }); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast({ title: "Format tidak didukung (JPG/PNG/WEBP)", variant: "destructive" }); return; }
    setUploadingAvatar(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `avatars/${userId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast({ title: "Gagal upload", description: uploadError.message, variant: "destructive" }); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await updateSettings({ avatar_url: publicUrl });
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
    toast({ title: "✅ Foto profil diperbarui!" });
    setUploadingAvatar(false);
  }

  // Export JSON
  async function handleExportJSON() {
    const supabase = createClient();
    const [txRes, debtsRes, budgetsRes, goalsRes, billsRes] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId),
      supabase.from("debts").select("*").eq("user_id", userId),
      supabase.from("budgets").select("*").eq("user_id", userId),
      supabase.from("savings_goals").select("*").eq("user_id", userId),
      supabase.from("bills").select("*").eq("user_id", userId),
    ]);
    const backup = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      user_email: user.email,
      data: {
        transactions: txRes.data || [],
        debts: debtsRes.data || [],
        budgets: budgetsRes.data || [],
        savings_goals: goalsRes.data || [],
        bills: billsRes.data || [],
      },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fintrack-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "📥 Backup JSON berhasil diexport!" });
  }

  // Import JSON
  async function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.data) { toast({ title: "Format file tidak valid", variant: "destructive" }); return; }
      const supabase = createClient();
      let imported = 0;
      if (backup.data.transactions?.length) {
        const items = backup.data.transactions.map((t: Transaction) => ({ ...t, user_id: userId, id: undefined }));
        const { error } = await supabase.from("transactions").insert(items);
        if (!error) imported += items.length;
      }
      if (backup.data.debts?.length) {
        const items = backup.data.debts.map((d: Debt) => ({ ...d, user_id: userId, id: undefined }));
        await supabase.from("debts").insert(items);
        imported += items.length;
      }
      if (backup.data.savings_goals?.length) {
        const items = backup.data.savings_goals.map((g: SavingsGoal) => ({ ...g, user_id: userId, id: undefined }));
        await supabase.from("savings_goals").insert(items);
        imported += items.length;
      }
      if (backup.data.bills?.length) {
        const items = backup.data.bills.map((b: Bill) => ({ ...b, user_id: userId, id: undefined }));
        await supabase.from("bills").insert(items);
        imported += items.length;
      }
      toast({ title: `✅ Import berhasil! ${imported} data diimport` });
    } catch {
      toast({ title: "Gagal import", description: "File tidak valid atau corrupt", variant: "destructive" });
    }
    e.target.value = "";
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <h1 className="text-foreground text-xl font-bold">Pengaturan</h1>

      {/* Avatar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="trek-card p-4">
        <p className="trek-label mb-3">FOTO PROFIL</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
            {settings?.avatar_url ? (
              <img src={settings.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-indigo-400">{user.email?.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/15 text-indigo-500 text-sm font-medium border border-indigo-500/20 hover:bg-indigo-600/25 transition-colors">
                {uploadingAvatar ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Foto</>}
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
            <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG, WEBP · Max 2MB</p>
          </div>
        </div>
      </motion.div>

      {/* Currency */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="trek-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-border/50">
          <p className="trek-label">MATA UANG</p>
        </div>
        {CURRENCIES.map((c) => (
          <button key={c.code} onClick={() => handleCurrencyChange(c.code)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/40 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-xl">{c.flag}</span>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.code}</p>
              </div>
            </div>
            {settings?.currency === c.code && <Check className="w-4 h-4 text-indigo-500" />}
          </button>
        ))}
      </motion.div>

      {/* Date format */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="trek-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-border/50">
          <p className="trek-label">FORMAT TANGGAL</p>
        </div>
        {DATE_FORMATS.map((f) => (
          <button key={f.value} onClick={() => handleDateFormatChange(f.value)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/40 last:border-0">
            <p className="text-sm text-foreground">{f.label}</p>
            {settings?.date_format === f.value && <Check className="w-4 h-4 text-indigo-500" />}
          </button>
        ))}
      </motion.div>

      {/* Language */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="trek-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-border/50">
          <p className="trek-label">BAHASA</p>
        </div>
        {LANGUAGES.map((l) => (
          <button key={l.code} onClick={() => handleLanguageChange(l.code)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/40 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-xl">{l.flag}</span>
              <p className="text-sm font-medium text-foreground">{l.label}</p>
            </div>
            {settings?.language === l.code && <Check className="w-4 h-4 text-indigo-500" />}
          </button>
        ))}
      </motion.div>

      {/* Privacy + theme */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="trek-card overflow-hidden divide-y divide-border/50">
        <div className="px-4 pt-4 pb-2"><p className="trek-label">TAMPILAN & PRIVASI</p></div>

        {/* Privacy mode */}
        <div onClick={togglePrivacy} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-3">
            {privacyMode ? <EyeOff className="w-4 h-4 text-rose-500" /> : <Eye className="w-4 h-4 text-indigo-500" />}
            <div>
              <p className="text-sm font-medium text-foreground">Mode Privasi</p>
              <p className="text-xs text-muted-foreground">Sembunyikan nominal jadi ••••••</p>
            </div>
          </div>
          <div className={cn("w-11 h-6 rounded-full p-0.5 transition-colors", privacyMode ? "bg-rose-500" : "bg-secondary border border-border")}>
            <div className={cn("w-5 h-5 rounded-full bg-white shadow transition-transform", privacyMode ? "translate-x-5" : "translate-x-0")} />
          </div>
        </div>
      </motion.div>

      {/* Password change */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="trek-card overflow-hidden">
        <button onClick={() => setShowPassForm(!showPassForm)}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-indigo-500" />
            <p className="text-sm font-medium text-foreground">Ganti Password</p>
          </div>
          <span className="text-xs text-muted-foreground">{showPassForm ? "Tutup" : "Ubah"}</span>
        </button>
        {showPassForm && (
          <form onSubmit={handlePasswordChange} className="px-4 pb-4 space-y-2 border-t border-border/50">
            <div className="pt-3 space-y-2">
              <input type="password" placeholder="Password baru" value={newPass} onChange={e => setNewPass(e.target.value)} required
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30" />
              <input type="password" placeholder="Konfirmasi password baru" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30" />
              <button type="submit" disabled={changingPass}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-sm text-white font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                {changingPass ? <><Loader2 className="w-4 h-4 animate-spin" />Mengubah...</> : "Ubah Password"}
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* Data portability */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="trek-card overflow-hidden divide-y divide-border/50">
        <div className="px-4 pt-4 pb-2"><p className="trek-label">DATA PORTABILITY</p></div>

        <button onClick={handleExportJSON} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
          <Download className="w-4 h-4 text-indigo-500" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Export Backup JSON</p>
            <p className="text-xs text-muted-foreground">Semua data → file .json</p>
          </div>
        </button>

        <label className="cursor-pointer">
          <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
            <UploadIcon className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Import / Restore JSON</p>
              <p className="text-xs text-muted-foreground">Restore dari file backup</p>
            </div>
          </div>
          <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
        </label>

        <button onClick={() => {
          const csv = ["id,type,amount,category,description,date",
            ...transactions.map(t => `${t.id},${t.type},${t.amount},${t.category},"${t.description || ""}",${t.date}`)
          ].join("\n");
          const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
          const a = document.createElement("a"); a.href = url; a.download = `fintrack-${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
          toast({ title: "📥 CSV exported!" });
        }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
          <Download className="w-4 h-4 text-amber-500" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Export CSV Transaksi</p>
            <p className="text-xs text-muted-foreground">{transactions.length} transaksi → .csv</p>
          </div>
        </button>
      </motion.div>
    </div>
  );
}
