"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WalletTabProps {
  transactions: Transaction[];
}

export default function WalletTab({ transactions }: WalletTabProps) {
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      if (!cats[t.category]) cats[t.category] = { income: 0, expense: 0 };
      cats[t.category][t.type] += t.amount;
    });
    return Object.entries(cats).map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  }, [transactions]);

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <h1 className="text-foreground text-xl font-bold">Dompet</h1>

      {/* Balance hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="trek-hero relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)" }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="p-6 relative z-10">
          <span className="trek-badge mb-4 inline-block">Total Saldo</span>
          <p className="trek-amount-lg text-white mb-1">{formatCurrency(balance)}</p>

          {/* Savings rate bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/60 font-medium">Tingkat Tabungan</span>
              <span className={cn("font-bold", savingsRate >= 0 ? "text-emerald-300" : "text-rose-300")}>{savingsRate}%</span>
            </div>
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className={cn("h-full rounded-full", savingsRate >= 0 ? "bg-emerald-300" : "bg-rose-300")} />
            </div>
          </div>
        </div>

        {/* Glassmorphism row */}
        <div className="mx-4 mb-4 p-4 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Total Masuk</p>
              <p className="text-emerald-300 font-bold tabular-nums">{formatCurrency(totalIncome)}</p>
              <p className="text-white/40 text-[10px]">{transactions.filter(t => t.type === "income").length} transaksi</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Total Keluar</p>
              <p className="text-rose-300 font-bold tabular-nums">{formatCurrency(totalExpense)}</p>
              <p className="text-white/40 text-[10px]">{transactions.filter(t => t.type === "expense").length} transaksi</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="trek-card p-4">
          <p className="trek-label mb-3">BREAKDOWN KATEGORI</p>
          <div className="space-y-4">
            {categoryBreakdown.slice(0, 6).map((cat) => (
              <div key={cat.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground font-semibold">{cat.name}</span>
                  <div className="flex gap-3">
                    {cat.income > 0 && <span className="text-emerald-500 font-medium">+{formatCurrency(cat.income)}</span>}
                    {cat.expense > 0 && <span className="text-rose-500 font-medium">-{formatCurrency(cat.expense)}</span>}
                  </div>
                </div>
                <div className="flex gap-1 h-1.5">
                  {cat.income > 0 && (
                    <div className="trek-progress-fill bg-emerald-500"
                      style={{ width: `${(cat.income / (totalIncome || 1)) * 100}%`, minWidth: 4 }} />
                  )}
                  {cat.expense > 0 && (
                    <div className="trek-progress-fill bg-rose-500"
                      style={{ width: `${(cat.expense / (totalExpense || 1)) * 100}%`, minWidth: 4 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* All transactions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="trek-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <p className="trek-label">SEMUA TRANSAKSI</p>
            <span className="trek-pill trek-pill-indigo">{transactions.length}</span>
          </div>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm">Belum ada transaksi</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-auto scrollbar-hide divide-y divide-border/40">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5">
                {tx.type === "income"
                  ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  : <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{tx.description || tx.category}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.category} · {formatShortDate(tx.date)}</p>
                </div>
                <p className={cn("text-xs font-bold tabular-nums flex-shrink-0",
                  tx.type === "income" ? "text-emerald-500" : "text-rose-500"
                )}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
