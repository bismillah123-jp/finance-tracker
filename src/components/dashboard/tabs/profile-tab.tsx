"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Download, User, Mail, Calendar, TrendingUp, TrendingDown, Wallet, Edit2, Check, X, Sun, Moon } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Transaction, Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";

interface ProfileTabProps {
  user: SupabaseUser;
  profile: Profile | null;
  transactions: Transaction[];
  onLogout: () => void;
  isLoggingOut: boolean;
  displayName: string;
}

export default function ProfileTab({ user, profile, transactions, onLogout, isLoggingOut, displayName }: ProfileTabProps) {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.full_name || "");
  const [isSaving, setIsSaving] = useState(false);

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleSaveName() {
    if (!newName.trim()) return;
    setIsSaving(true);
    const { error } = await createClient().from("profiles").update({ full_name: newName.trim() }).eq("id", user.id);
    if (error) toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Nama diperbarui!" }); setIsEditingName(false); }
    setIsSaving(false);
  }

  function handleExportCSV() {
    const csv = ["id,type,amount,category,description,date",
      ...transactions.map(t => `${t.id},${t.type},${t.amount},${t.category},"${t.description || ""}",${t.date}`)
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `fintrack-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "📥 CSV exported!" });
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <h1 className="text-foreground text-xl font-bold">Profil</h1>

      {/* TREK Profile card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="trek-card overflow-hidden">
        {/* Gradient banner */}
        <div className="h-20 relative" style={{ background: "linear-gradient(135deg, #312e81, #6366f1, #818cf8)" }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        </div>
        <div className="px-5 pb-5 -mt-8 relative">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 border-4 flex items-center justify-center mb-3"
            style={{ borderColor: "var(--bg-card)" }}>
            <span className="text-xl font-black text-white">{initials}</span>
          </div>

          {/* Name editor */}
          {isEditingName ? (
            <div className="flex items-center gap-2 mb-1">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="flex-1 min-w-0 bg-secondary border border-border rounded-xl px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
                autoFocus onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setIsEditingName(false); }} />
              <button onClick={handleSaveName} disabled={isSaving} className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center"><Check className="w-4 h-4" /></button>
              <button onClick={() => setIsEditingName(false)} className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <p className="text-foreground font-bold text-lg">{displayName}</p>
              <button onClick={() => setIsEditingName(true)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <p className="text-muted-foreground text-sm">{user.email}</p>

          {/* Info rows */}
          <div className="mt-4 pt-4 border-t border-border space-y-2.5">
            {[
              { icon: Mail, label: "Email", value: user.email || "-" },
              { icon: Calendar, label: "Bergabung", value: formatDate(user.created_at || new Date().toISOString()) },
              { icon: User, label: "User ID", value: user.id.slice(0, 8) + "..." },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground text-xs w-16 flex-shrink-0">{label}</span>
                <span className="text-foreground text-xs truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Wallet, label: "Saldo", value: formatCurrency(balance), color: "text-indigo-500", bg: "bg-indigo-500/10" },
          { icon: TrendingUp, label: "Masuk", value: formatCurrency(totalIncome), color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: TrendingDown, label: "Keluar", value: formatCurrency(totalExpense), color: "text-rose-500", bg: "bg-rose-500/10" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="trek-card p-3 text-center">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5", bg)}>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
            <p className="trek-label">{label}</p>
            <p className={cn("text-xs font-bold tabular-nums mt-0.5", color)}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Preferences & Actions */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="trek-card overflow-hidden divide-y divide-border/50">
        <p className="trek-label px-4 pt-4 pb-3">PREFERENSI & AKSI</p>

        {/* Theme toggle */}
        <button onClick={toggleTheme} className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{theme === "dark" ? "Mode Gelap" : "Mode Terang"}</p>
              <p className="text-xs text-muted-foreground">Tap untuk ganti tema</p>
            </div>
          </div>
          <div className={cn("w-11 h-6 rounded-full p-0.5 transition-colors", theme === "dark" ? "bg-indigo-600" : "bg-secondary border border-border")}>
            <div className={cn("w-5 h-5 rounded-full bg-white shadow transition-transform", theme === "dark" ? "translate-x-5" : "translate-x-0")} />
          </div>
        </button>

        {/* Export CSV */}
        <button onClick={handleExportCSV} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
          <Download className="w-4 h-4 text-indigo-500" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Export Transaksi</p>
            <p className="text-xs text-muted-foreground">{transactions.length} transaksi → CSV</p>
          </div>
        </button>

        {/* Stats detail */}
        <div className="px-4 py-3 space-y-2">
          <p className="trek-label mb-2">STATISTIK</p>
          {[
            { label: "Total Transaksi", value: transactions.length.toString() },
            { label: "Pemasukan", value: transactions.filter(t => t.type === "income").length.toString() },
            { label: "Pengeluaran", value: transactions.filter(t => t.type === "expense").length.toString() },
            { label: "Rata-rata", value: transactions.length > 0 ? formatCurrency((totalIncome + totalExpense) / transactions.length) : "Rp 0" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-semibold tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Logout */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={onLogout} disabled={isLoggingOut}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-rose-500 transition-colors"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <LogOut className="w-4 h-4" />
        {isLoggingOut ? "Keluar..." : "Keluar dari Akun"}
      </motion.button>
    </div>
  );
}
