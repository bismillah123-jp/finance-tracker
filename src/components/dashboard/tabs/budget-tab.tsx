"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import type { Budget, Transaction } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/lib/utils";

interface BudgetTabProps {
  userId: string;
  transactions: Transaction[];
}

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

export default function BudgetTab({ userId, transactions }: BudgetTabProps) {
  const { formatAmount } = useSettings();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
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

  function getSpent(cat: string) {
    return monthlyExpenses.filter((t) => t.category === cat).reduce((s, t) => s + t.amount, 0);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(amountRaw.replace(/[^0-9]/g, ""));
    if (!amount || !category) {
      toast({ title: "Lengkapi semua field", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await createClient().from("budgets").insert({
      user_id: userId, category, amount, month: CURRENT_MONTH,
    }).select().single();
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    } else {
      setBudgets((prev) => [...prev, data as Budget]);
      setCategory(""); setAmountRaw(""); setShowForm(false);
      toast({ title: "✅ Budget ditambahkan!" });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await createClient().from("budgets").delete().eq("id", id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "🗑️ Budget dihapus!" });
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + getSpent(b.category), 0);
  const displayAmount = amountRaw ? new Intl.NumberFormat("id-ID").format(parseInt(amountRaw)) : "";

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="heading-lg">Budget</h1>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowForm(!showForm)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "var(--accent-blue)", boxShadow: "0 4px 12px rgba(59,130,246,0.4)" }}>
          <Plus className="w-4 h-4 text-white" />
        </motion.button>
      </div>

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="hero-card hero-blue p-5">
          <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider block mb-3">Budget Bulan Ini</span>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-white/50 text-xs mb-1">Total Budget</p>
              <p className="text-white font-black text-xl tabular-nums">{formatAmount(totalBudget)}</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-white/50 text-xs mb-1">Terpakai</p>
              <p className={`font-black text-xl tabular-nums ${totalSpent > totalBudget ? "text-red-300" : "text-emerald-300"}`}>
                {formatAmount(totalSpent)}
              </p>
            </div>
          </div>
          {totalBudget > 0 && (
            <div>
              <div className="flex justify-between text-xs text-white/60 mb-1.5">
                <span>Penggunaan</span>
                <span className="font-bold text-white">{Math.round((totalSpent / totalBudget) * 100)}%</span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%` }}
                  transition={{ delay: 0.3, duration: 0.7 }}
                  className={`h-full rounded-full ${totalSpent / totalBudget > 0.9 ? "bg-red-400" : totalSpent / totalBudget > 0.7 ? "bg-amber-400" : "bg-emerald-400"}`}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={handleAdd} className="card p-4 space-y-3">
              <p className="heading-md text-sm">Tambah Budget Kategori</p>

              {/* Category select */}
              <div>
                <label className="input-label">Kategori Pengeluaran</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="input-field appearance-none pr-10"
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">Pilih kategori...</option>
                    {CATEGORIES.expense.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "var(--text-tertiary)" }} />
                </div>
              </div>

              {/* Amount input — FIXED: controlled input with direct value management */}
              <div>
                <label className="input-label">Limit Budget</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold"
                    style={{ color: "var(--text-tertiary)" }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={displayAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setAmountRaw(raw);
                    }}
                    required
                    className="input-field pl-9 text-right tabular-nums font-semibold"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowForm(false); setCategory(""); setAmountRaw(""); }}
                  className="btn-secondary flex-1">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2"
                  style={{ background: "var(--accent-blue)" }}>
                  {saving ? "Menyimpan..." : "Simpan Budget"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="card p-4 h-24 animate-pulse" style={{ background: "var(--bg-card-2)" }} />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <p className="heading-md mb-1">Belum ada budget</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Tap + untuk set limit pengeluaran per kategori</p>
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
              <motion.div key={budget.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card p-4"
                style={{
                  borderColor: isDanger ? "rgba(239,68,68,0.3)" : isWarning ? "rgba(245,158,11,0.3)" : "var(--border-default)",
                  background: isDanger ? "rgba(239,68,68,0.04)" : isWarning ? "rgba(245,158,11,0.04)" : "var(--bg-card)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="heading-md text-sm">{budget.category}</p>
                      {isDanger && <span className="pill pill-red text-[10px]">🚨 Hampir Habis</span>}
                      {isWarning && <span className="pill pill-orange text-[10px]">⚠️ 70%+</span>}
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {formatAmount(spent)} dari {formatAmount(budget.amount)}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(budget.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-red)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="progress-track mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                    className={`progress-fill ${isDanger ? "progress-red" : isWarning ? "progress-yellow" : "progress-green"}`}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: isDanger ? "var(--accent-red)" : "var(--text-secondary)" }}>
                    {pct.toFixed(0)}% terpakai
                  </span>
                  <span className="text-xs font-semibold" style={{ color: remaining < 0 ? "var(--accent-red)" : "var(--text-primary)" }}>
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
