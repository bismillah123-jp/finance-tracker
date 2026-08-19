"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Upload, Loader2, Download, Upload as UploadIcon, Sun, Moon, Eye, EyeOff } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Transaction } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useTheme } from "@/contexts/theme-context";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface SettingsTabProps {
  user: SupabaseUser;
  transactions: Transaction[];
  userId: string;
}

const CURRENCIES = [
  { code: "IDR", label: "🇮🇩 Rupiah (Rp)", locale: "id-ID" },
  { code: "USD", label: "🇺🇸 US Dollar ($)", locale: "en-US" },
  { code: "EUR", label: "🇪🇺 Euro (€)", locale: "de-DE" },
  { code: "SGD", label: "🇸🇬 Singapore Dollar (S$)", locale: "en-SG" },
  { code: "MYR", label: "🇲🇾 Malaysian Ringgit (RM)", locale: "ms-MY" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY  (31/12/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY  (12/31/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD  (2026-12-31)" },
];

const LANGUAGES = [
  { code: "id", label: "🇮🇩 Bahasa Indonesia" },
  { code: "en", label: "🇺🇸 English" },
];

export default function SettingsTab({ user, transactions, userId }: SettingsTabProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { settings, updateSettings, privacyMode, togglePrivacy, formatAmount } = useSettings();
  const { theme, toggleTheme } = useTheme();

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [showPassForm, setShowPassForm] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleCurrencyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const currency = e.target.value;
    await updateSettings({ currency });
    toast({ title: `✅ Mata uang diubah ke ${currency}` });
  }

  async function handleDateFormatChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await updateSettings({ date_format: e.target.value });
    toast({ title: "✅ Format tanggal diperbarui!" });
  }

  async function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const lang = e.target.value;
    await updateSettings({ language: lang });
    toast({ title: lang === "en" ? "✅ Language updated! Reloading..." : "✅ Bahasa diperbarui! Memuat ulang..." });
    // Force full page reload so all translated labels re-render
    setTimeout(() => window.location.reload(), 800);
  }

  // ── #7 Avatar upload — fallback to profiles table if storage not available ─
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimal 2MB", variant: "destructive" });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Format tidak didukung", description: "Gunakan JPG, PNG, atau WEBP", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar.${ext}`;

      // Try upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        // Storage bucket not ready — store as base64 data URL in profiles
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result as string;
          await updateSettings({ avatar_url: dataUrl });
          await supabase.from("profiles").update({ avatar_url: dataUrl }).eq("id", userId);
          toast({ title: "✅ Foto profil diperbarui!" });
          setUploadingAvatar(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Storage upload succeeded — get public URL
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateSettings({ avatar_url: publicUrl });
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      toast({ title: "✅ Foto profil diperbarui!" });
    } catch (err) {
      toast({ title: "Gagal upload", description: "Coba lagi", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  // ── #11 Auto-logout after password change ──────────────────────────────────
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast({ title: "Password tidak cocok", variant: "destructive" });
      return;
    }
    if (newPass.length < 6) {
      toast({ title: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }
    setChangingPass(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      toast({ title: "Gagal ubah password", description: error.message, variant: "destructive" });
      setChangingPass(false);
      return;
    }
    toast({ title: "✅ Password berhasil diubah! Silakan login ulang." });
    // Auto logout for security (#11)
    setTimeout(async () => {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    }, 1500);
  }

  // ── Export JSON ────────────────────────────────────────────────────────────
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
    a.href = url;
    a.download = `fintrack-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📥 Backup JSON berhasil diexport!" });
  }

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
      toast({ title: `✅ Import berhasil! ${imported} transaksi diimport` });
    } catch {
      toast({ title: "Gagal import", description: "File tidak valid atau corrupt", variant: "destructive" });
    }
    e.target.value = "";
  }

  const avatarSrc = settings?.avatar_url;
  const initials = (user.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <h1 className="heading-lg">Pengaturan</h1>

      {/* ── Avatar ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
        <p className="label-xs mb-3">FOTO PROFIL</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: "var(--accent-blue)", border: "3px solid var(--border-default)" }}>
            {avatarSrc
              ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-xl font-black text-white">{initials}</span>
            }
          </div>
          <div>
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "rgba(59,130,246,0.12)", color: "var(--accent-blue)", border: "1px solid rgba(59,130,246,0.25)" }}>
                {uploadingAvatar
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengupload...</>
                  : <><Upload className="w-4 h-4" /> Upload Foto</>
                }
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>JPG, PNG, WEBP · Max 2MB</p>
          </div>
        </div>
      </motion.div>

      {/* ── App preferences — all dropdowns ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card overflow-hidden">
        <div className="px-4 pt-4 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <p className="label-xs">PREFERENSI APLIKASI</p>
        </div>

        {/* #6 Currency dropdown */}
        <div className="settings-row flex-col items-start gap-1.5">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Mata Uang</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Preview: {formatAmount(1850000)}
          </p>
          <select
            value={settings?.currency ?? "IDR"}
            onChange={handleCurrencyChange}
            className="input-field mt-1"
            style={{ cursor: "pointer" }}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* #6 Date format dropdown REMOVED per user request */}

        {/* #6 Language dropdown */}
        <div className="settings-row flex-col items-start gap-1.5">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Bahasa</p>
          <select
            value={settings?.language ?? "id"}
            onChange={handleLanguageChange}
            className="input-field mt-1"
            style={{ cursor: "pointer" }}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* ── Display ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card overflow-hidden">
        <div className="px-4 pt-4 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <p className="label-xs">TAMPILAN & PRIVASI</p>
        </div>

        {/* Theme toggle */}
        <div className="settings-row" onClick={toggleTheme}>
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {theme === "dark" ? "Mode Gelap" : "Mode Terang"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Tap untuk ganti tema</p>
            </div>
          </div>
          <div className={`toggle ${theme === "dark" ? "on" : ""}`}><div className="toggle-thumb" /></div>
        </div>

        {/* Privacy toggle */}
        <div className="settings-row" onClick={togglePrivacy}>
          <div className="flex items-center gap-3">
            {privacyMode ? <EyeOff className="w-4 h-4 text-rose-500" /> : <Eye className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />}
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Mode Privasi</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {privacyMode ? "Saldo tersembunyi (••••••)" : "Sembunyikan nominal jadi ••••••"}
              </p>
            </div>
          </div>
          <div className={`toggle ${privacyMode ? "on" : ""}`} style={privacyMode ? { background: "var(--accent-red)" } : {}}>
            <div className="toggle-thumb" />
          </div>
        </div>
      </motion.div>

      {/* ── Password change ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card overflow-hidden">
        <button onClick={() => setShowPassForm(!showPassForm)}
          className="settings-row w-full text-left">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4" style={{ color: "var(--accent-blue)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Ganti Password</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Setelah berhasil, kamu akan di-logout otomatis
              </p>
            </div>
          </div>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{showPassForm ? "Tutup" : "Ubah"}</span>
        </button>

        {showPassForm && (
          <form onSubmit={handlePasswordChange} className="px-4 pb-4 space-y-2"
            style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="pt-3 space-y-2">
              <div>
                <label className="input-label">Password Baru</label>
                <input type="password" placeholder="Min. 6 karakter" value={newPass}
                  onChange={e => setNewPass(e.target.value)} required className="input-field" />
              </div>
              <div>
                <label className="input-label">Konfirmasi Password</label>
                <input type="password" placeholder="Ulangi password baru" value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)} required className="input-field" />
              </div>
              <button type="submit" disabled={changingPass}
                className="btn-primary flex items-center justify-center gap-2">
                {changingPass
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Mengubah & Logout...</>
                  : "Ubah Password"}
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* ── Data portability ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card overflow-hidden">
        <div className="px-4 pt-4 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <p className="label-xs">DATA PORTABILITY</p>
        </div>

        <button onClick={handleExportJSON} className="settings-row w-full text-left">
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4" style={{ color: "var(--accent-blue)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Export Backup JSON</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Semua data → file .json</p>
            </div>
          </div>
        </button>

        <label className="cursor-pointer">
          <div className="settings-row">
            <div className="flex items-center gap-3">
              <UploadIcon className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Import / Restore JSON</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Restore dari file backup</p>
              </div>
            </div>
          </div>
          <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
        </label>

        <button onClick={() => {
          const csv = ["id,type,amount,category,description,date",
            ...transactions.map(t => `${t.id},${t.type},${t.amount},${t.category},"${t.description || ""}",${t.date}`)
          ].join("\n");
          const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
          const a = document.createElement("a");
          a.href = url; a.download = `fintrack-${new Date().toISOString().split("T")[0]}.csv`;
          a.click(); URL.revokeObjectURL(url);
          toast({ title: "📥 CSV exported!" });
        }} className="settings-row w-full text-left">
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Export CSV Transaksi</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{transactions.length} transaksi → .csv</p>
            </div>
          </div>
        </button>
      </motion.div>
    </div>
  );
}
