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

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleSaveName() {
    if (!newName.trim()) return;
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ full_name: newName.trim() }).eq("id", user.id);
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Nama diperbarui!" });
      setIsEditingName(false);
    }
    setIsSaving(false);
  }

  function handleExportCSV() {
    const header = "id,type,amount,category,description,date";
    const rows = transactions.map((t) =>
      `${t.id},${t.type},${t.amount},${t.category},"${t.description || ""}",${t.date}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fintrack-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📥 CSV berhasil diexport!" });
  }

  return (
    <div className="px-4 pt-4 pb-4">
      <h1 className="text-foreground text-xl font-bold mb-5">Profil</h1>

      {/* Avatar + name card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-5 border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 to-purple-600/5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-indigo-300">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 min-w-0 bg-secondary/50 border border-border rounded-lg px-2 py-1 text-sm text-foreground outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setIsEditingName(false); }} />
                <button onClick={handleSaveName} disabled={isSaving}
                  className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 flex-shrink-0">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingName(false)}
                  className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-foreground font-bold text-lg truncate">{displayName}</p>
                <button onClick={() => setIsEditingName(true)}
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground flex-shrink-0">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-muted-foreground text-sm truncate">{user.email}</p>
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-border/50">
          <InfoRow icon={Mail} label="Email" value={user.email || "-"} />
          <InfoRow icon={Calendar} label="Bergabung" value={formatDate(user.created_at || new Date().toISOString())} />
          <InfoRow icon={User} label="User ID" value={user.id.slice(0, 8) + "..."} />
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard icon={Wallet} label="Saldo" value={formatCurrency(balance)} color="indigo" />
        <StatCard icon={TrendingUp} label="Masuk" value={formatCurrency(totalIncome)} color="emerald" />
        <StatCard icon={TrendingDown} label="Keluar" value={formatCurrency(totalExpense)} color="rose" />
      </div>

      {/* Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 border border-border mb-4">
        <p className="text-foreground text-sm font-semibold mb-3">Preferensi</p>
        <div
          onClick={toggleTheme}
          className="flex items-center justify-between py-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            {theme === "dark"
              ? <Sun className="w-4 h-4 text-yellow-400" />
              : <Moon className="w-4 h-4 text-indigo-400" />
            }
            <div>
              <p className="text-sm text-foreground font-medium">
                {theme === "dark" ? "Mode Gelap" : "Mode Terang"}
              </p>
              <p className="text-xs text-muted-foreground">
                {theme === "dark" ? "Klik untuk mode terang" : "Klik untuk mode gelap"}
              </p>
            </div>
          </div>
          {/* Toggle switch */}
          <div className={cn("w-11 h-6 rounded-full p-0.5 transition-colors", theme === "dark" ? "bg-indigo-600" : "bg-secondary")}>
            <div className={cn("w-5 h-5 rounded-full bg-white shadow transition-transform", theme === "dark" ? "translate-x-5" : "translate-x-0")} />
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-4 border border-border mb-4">
        <p className="text-foreground text-sm font-semibold mb-3">Aksi</p>
        <button onClick={handleExportCSV}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:bg-secondary/50 transition-colors">
          <Download className="w-4 h-4 text-indigo-400" />
          <div className="text-left">
            <p className="text-sm text-foreground">Export Transaksi</p>
            <p className="text-xs text-muted-foreground">{transactions.length} transaksi → CSV</p>
          </div>
        </button>
      </motion.div>

      {/* Stats detail */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-4 border border-border mb-4">
        <p className="text-foreground text-sm font-semibold mb-3">Statistik Akun</p>
        <div className="space-y-2.5 text-sm">
          {[
            { label: "Total Transaksi", value: transactions.length.toString(), color: "text-foreground" },
            { label: "Pemasukan", value: transactions.filter(t => t.type === "income").length.toString(), color: "text-emerald-400" },
            { label: "Pengeluaran", value: transactions.filter(t => t.type === "expense").length.toString(), color: "text-rose-400" },
            {
              label: "Rata-rata/transaksi",
              value: transactions.length > 0 ? formatCurrency((totalIncome + totalExpense) / transactions.length) : "Rp 0",
              color: "text-foreground"
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-muted-foreground">{label}</span>
              <span className={cn("font-semibold tabular-nums", color)}>{value}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Logout */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={onLogout} disabled={isLoggingOut}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-rose-600/15 border border-rose-600/20 text-rose-400 hover:bg-rose-600/25 transition-colors font-medium">
        <LogOut className="w-4 h-4" />
        {isLoggingOut ? "Keluar..." : "Keluar dari Akun"}
      </motion.button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-muted-foreground text-xs w-16 flex-shrink-0">{label}</span>
      <span className="text-foreground text-xs truncate flex-1">{value}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: "indigo" | "emerald" | "rose" }) {
  const colorMap = {
    indigo: "bg-indigo-600/10 border-indigo-600/20 text-indigo-400",
    emerald: "bg-emerald-600/10 border-emerald-600/20 text-emerald-400",
    rose: "bg-rose-600/10 border-rose-600/20 text-rose-400",
  };
  return (
    <div className={cn("glass rounded-2xl p-3 border text-center", colorMap[color])}>
      <Icon className="w-4 h-4 mx-auto mb-1" />
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-bold tabular-nums mt-0.5 leading-tight">{value}</p>
    </div>
  );
}
