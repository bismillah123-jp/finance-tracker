"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";
import type { Budget, Transaction } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/utils";

interface BudgetTabProps { userId: string; transactions: Transaction[]; }

const CURRENT_MONTH = new Date().toISOString().slice(0, 7); // "YYYY-MM"

export default function BudgetTab({ userId, transactions }: BudgetTabProps) {
  const { formatAmount } = useSettings();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "", amount: "" });
  const [saving, setSaving] = useState(false);

  const monthlyExpenses = transactions.filter((t) => {
    const d = new Date(t.date);
    const now = new Date();
    return t.type === "expense" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const fetchBudgets = useCallback(async () => {
    const { data } = await createClient().from("budgets").select("*").eq("user_id", userId).eq("month", CURRENT_MONTH).order("created_at");
    setBudgets((data as Budget[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount.replace(/[^0-9]/g, ""));
    if (!amount || !form.category) return;
    setSaving(true);
    const { data, error } = await createClient().from("budgets").insert({ user_id: userId, category: form.category, amount, month: CURRENT_MONTH }).select().single();
    if (error) toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    else { setBudgets(prev => [...prev, data as Budget]); setForm({ category: "", amount: "" }); setShowForm(false); toast({ title: "✅ Budget ditambahkan!" }); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await createClient().from("budgets").delete().eq("id", id);
    setBudgets(prev => prev.filter(b => b.id !== id));
    toast({ title: "🗑️ Budget dihapus!" });
  }

  function getSpent(category: string) {
    return monthlyExpenses.filter(t => t.category === category).reduce((s, t) => s + t.amount, 0);
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + getSpent(b.category), 0);

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-xl font-bold">Budget</h1>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowForm(!showForm)}
          className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center neon-indigo">
          <Plus className="w-4 h-4 text-white" />
        </motion.button>
      </div>

      {/* Summary hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="trek-hero relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #6366f1 100%)" }}>
        <div className="p-5 relative z-10">
          <span className="trek-badge mb-4 inline-block">Budget Bulan Ini</span>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Total Budget</p>
              <p className="text-white font-black text-xl tabular-nums">{formatAmount(totalBudget)}</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Terpakai</p>
              <p className={cn("font-black text-xl tabular-nums", totalSpent > totalBudget ? "text-rose-300" : "text-emerald-300")}>
                {formatAmount(totalSpent)}
              </p>
            </div>
          </div>
          {totalBudget > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/60">Penggunaan</span>
                <span className="text-white font-bold">{Math.round((totalSpent / totalBudget) * 100)}%</span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%` }}
                  transition={{ delay: 0.3, duration: 0.7 }}
                  className={cn("h-full rounded-full", totalSpent / totalBudget > 0.9 ? "bg-rose-400" : totalSpent / totalBudget > 0.7 ? "bg-amber-400" : "bg-emerald-400")} />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={handleAdd} className="trek-card p-4 space-y-3">
              <p className="text-foreground font-semibold text-sm">Tambah Budget</p>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30">
                <option value="">Pilih kategori...</option>
                {CATEGORIES.expense.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                <input type="text" inputMode="numeric" placeholder="0" required
                  value={form.amount ? new Intl.NumberFormat("id-ID").format(parseInt(form.amount.replace(/[^0-9]/g, "") || "0")) : ""}
                  onChange={e => setForm({ ...form, amount: e.target.value.replace(/[^0-9]/g, "") })}
                  className="w-full bg-secondary border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-foreground text-right tabular-nums outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm text-white font-medium disabled:opacity-60">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="trek-card p-4 animate-pulse h-20" />)}</div>
      ) : budgets.length === 0 ? (
        <div className="trek-card p-8 text-center">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-foreground font-medium text-sm">Belum ada budget</p>
          <p className="text-muted-foreground text-xs mt-1">Tap + untuk set limit pengeluaran</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget, i) => {
            const spent = getSpent(budget.category);
            const pct = Math.min(100, (spent / budget.amount) * 100);
            const remaining = budget.amount - spent;
            const isWarning = pct >= 70 && pct < 90;
            const isDanger = pct >= 90;

            return (
              <motion.div key={budget.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={cn("trek-card p-4", isDanger && "border-rose-500/30", isWarning && "border-amber-500/30")}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-semibold text-sm">{budget.category}</p>
                      {isDanger && <span className="trek-pill trek-pill-red text-[10px]">🚨 Hampir Habis</span>}
                      {isWarning && <span className="trek-pill" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>⚠️ Hampir Limit</span>}
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {formatAmount(spent)} / {formatAmount(budget.amount)}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(budget.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/15 text-muted-foreground hover:text-rose-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="trek-progress-track mb-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                    className={cn("trek-progress-fill", isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500")} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className={cn("font-medium", isDanger ? "text-rose-500" : "text-muted-foreground")}>
                    {pct.toFixed(0)}% terpakai
                  </span>
                  <span className={cn("font-semibold", remaining < 0 ? "text-rose-500" : "text-foreground")}>
                    Sisa: {formatAmount(Math.max(0, remaining))}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
