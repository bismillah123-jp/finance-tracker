"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WalletTabProps {
  transactions: Transaction[];
}

const WALLET_TYPES = [
  { id: "all", label: "Semua", icon: "💼", color: "indigo" },
  { id: "income", label: "Masuk", icon: "📈", color: "emerald" },
  { id: "expense", label: "Keluar", icon: "📉", color: "rose" },
];

export default function WalletTab({ transactions }: WalletTabProps) {
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      if (!cats[t.category]) cats[t.category] = { income: 0, expense: 0 };
      cats[t.category][t.type] += t.amount;
    });
    return Object.entries(cats).map(([name, data]) => ({ name, ...data })).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  }, [transactions]);

  return (
    <div className="min-h-screen px-4 pt-12 pb-4">
      <h1 className="text-white text-xl font-bold mb-6">Dompet</h1>

      {/* Main balance card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative glass rounded-3xl p-6 border border-indigo-500/20 bg-gradient-to-br from-indigo-600/20 to-purple-600/10 mb-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-indigo-300 text-sm">Total Saldo</p>
            <p className="text-white text-2xl font-bold tabular-nums">{formatCurrency(balance)}</p>
          </div>
        </div>

        {/* Savings rate */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-indigo-300">Tingkat Tabungan</span>
            <span className={cn("font-semibold", savingsRate >= 0 ? "text-emerald-400" : "text-rose-400")}>{savingsRate}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className={cn("h-full rounded-full", savingsRate >= 0 ? "bg-emerald-500" : "bg-rose-500")}
            />
          </div>
        </div>
      </motion.div>

      {/* Income / Expense summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">Total Masuk</span>
          </div>
          <p className="text-emerald-400 font-bold text-base tabular-nums">{formatCurrency(totalIncome)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{transactions.filter(t => t.type === "income").length} transaksi</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-4 border border-rose-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <span className="text-xs text-muted-foreground">Total Keluar</span>
          </div>
          <p className="text-rose-400 font-bold text-base tabular-nums">{formatCurrency(totalExpense)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{transactions.filter(t => t.type === "expense").length} transaksi</p>
        </motion.div>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-4 border border-border mb-5">
          <p className="text-white text-sm font-semibold mb-3">Breakdown per Kategori</p>
          <div className="space-y-3">
            {categoryBreakdown.slice(0, 6).map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-medium">{cat.name}</span>
                    <div className="flex gap-2">
                      {cat.income > 0 && <span className="text-emerald-400">+{formatCurrency(cat.income)}</span>}
                      {cat.expense > 0 && <span className="text-rose-400">-{formatCurrency(cat.expense)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    {cat.income > 0 && (
                      <div className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(cat.income / (totalIncome || 1)) * 100}%`, minWidth: "4px" }} />
                    )}
                    {cat.expense > 0 && (
                      <div className="h-full rounded-full bg-rose-500 transition-all"
                        style={{ width: `${(cat.expense / (totalExpense || 1)) * 100}%`, minWidth: "4px" }} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent all transactions */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass rounded-2xl p-4 border border-border">
        <p className="text-white text-sm font-semibold mb-3">Semua Transaksi ({transactions.length})</p>
        {transactions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Belum ada transaksi</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto scrollbar-hide">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-2.5 py-1.5 border-b border-border/50 last:border-0">
                {tx.type === "income"
                  ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  : <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{tx.description || tx.category}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.category} · {formatShortDate(tx.date)}</p>
                </div>
                <p className={cn("text-xs font-semibold tabular-nums", tx.type === "income" ? "text-emerald-400" : "text-rose-400")}>
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
