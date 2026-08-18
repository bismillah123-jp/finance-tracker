"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface HomeTabProps {
  displayName: string;
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Gaji: "💰", Freelance: "💻", Investasi: "📈", Bisnis: "🏢", Bonus: "🎁", Hadiah: "🎀",
  Makanan: "🍜", Transportasi: "🚗", Belanja: "🛍️", Tagihan: "🧾", Kesehatan: "💊",
  Hiburan: "🎮", Pendidikan: "📚", Lainnya: "📝",
};

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hari Ini";
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

export default function HomeTab({
  displayName, totalBalance, totalIncome, totalExpense,
  transactions, onEdit, onDelete,
}: HomeTabProps) {
  const recent = transactions.slice(0, 15);
  const grouped: Record<string, Transaction[]> = {};
  recent.forEach((t) => {
    const label = getDateLabel(t.date);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(t);
  });

  return (
    <div className="min-h-screen">
      {/* Header — smooth gradient fade to background */}
      <div className="relative pt-14 pb-24 px-5 overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, hsl(239 60% 14%) 0%, hsl(239 60% 10%) 40%, transparent 100%)"
        }}>
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 -left-8 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <p className="text-indigo-200 text-sm">Selamat datang 👋</p>
            <h1 className="text-white text-xl font-bold">{displayName}</h1>
          </div>
        </div>

        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center relative z-10 mb-2"
        >
          <p className="text-indigo-200 text-sm mb-1">Total Saldo</p>
          <p className="text-white text-4xl font-bold tabular-nums drop-shadow-lg">
            {formatCurrency(totalBalance)}
          </p>
        </motion.div>
      </div>

      {/* Income / Expense cards overlapping header */}
      <div className="px-4 -mt-14 relative z-20 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="glass rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs text-muted-foreground">Pemasukan</span>
            </div>
            <p className="text-emerald-400 font-bold text-lg tabular-nums">{formatCurrency(totalIncome)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Bulan ini</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <span className="text-xs text-muted-foreground">Pengeluaran</span>
            </div>
            <p className="text-rose-400 font-bold text-lg tabular-nums">{formatCurrency(totalExpense)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Bulan ini</p>
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-semibold">Transaksi Terbaru</h2>
          <span className="text-xs text-indigo-400">{transactions.length} total</span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-muted-foreground text-sm">Belum ada transaksi</p>
            <p className="text-muted-foreground text-xs mt-1">Tekan tombol + untuk menambahkan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([label, txs]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">{label}</p>
                <div className="space-y-2">
                  {txs.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass rounded-2xl p-3.5 border border-border flex items-center gap-3 group"
                    >
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0",
                        tx.type === "income" ? "bg-emerald-500/15" : "bg-rose-500/15"
                      )}>
                        {CATEGORY_EMOJI[tx.category] || "📝"}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* FIX: text-foreground instead of text-white */}
                        <p className="text-sm font-medium text-foreground truncate">
                          {tx.description || tx.category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.category} · {formatShortDate(tx.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            {tx.type === "income"
                              ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                              : <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                            }
                            <p className={cn(
                              "text-sm font-semibold tabular-nums",
                              tx.type === "income" ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {formatCurrency(tx.amount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(tx)} className="p-1 rounded-lg hover:bg-indigo-500/20 text-muted-foreground hover:text-indigo-400 transition-colors text-[10px]">✏️</button>
                          <button onClick={() => onDelete(tx.id)} className="p-1 rounded-lg hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors text-[10px]">🗑️</button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
