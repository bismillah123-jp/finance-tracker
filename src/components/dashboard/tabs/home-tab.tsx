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
  Gaji:"💰",Freelance:"💻",Investasi:"📈",Bisnis:"🏢",Bonus:"🎁",Hadiah:"🎀",
  Makanan:"🍜",Transportasi:"🚗",Belanja:"🛍️",Tagihan:"🧾",Kesehatan:"💊",
  Hiburan:"🎮",Pendidikan:"📚",Lainnya:"📝",
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

export default function HomeTab({ displayName, totalBalance, totalIncome, totalExpense, transactions, onEdit, onDelete }: HomeTabProps) {
  const recent = transactions.slice(0, 20);
  const grouped: Record<string, Transaction[]> = {};
  recent.forEach((t) => {
    const label = getDateLabel(t.date);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(t);
  });

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* TREK Hero Card — balance */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="trek-hero relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%)",
          minHeight: "180px",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative z-10 p-6">
          {/* Badge */}
          <div className="flex items-center justify-between mb-6">
            <span className="trek-badge">Total Saldo</span>
            <span className="text-white/60 text-xs font-medium">
              {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </span>
          </div>

          {/* Balance */}
          <p className="trek-amount-lg text-white mb-1">
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-white/50 text-xs font-medium">Selamat datang, {displayName} 👋</p>
        </div>

        {/* Bottom glassmorphism card */}
        <div className="mx-4 mb-4 p-4 rounded-2xl relative z-10"
          style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Pemasukan</p>
              <p className="text-emerald-300 font-bold text-base tabular-nums">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="border-l border-white/20 pl-4">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Pengeluaran</p>
              <p className="text-rose-300 font-bold text-base tabular-nums">{formatCurrency(totalExpense)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Transaksi", value: transactions.length.toString(), color: "text-indigo-500" },
          { label: "Masuk", value: transactions.filter(t => t.type === "income").length.toString(), color: "text-emerald-500" },
          { label: "Keluar", value: transactions.filter(t => t.type === "expense").length.toString(), color: "text-rose-500" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className="trek-card p-3 text-center">
            <p className={cn("text-xl font-800 tabular-nums", stat.color)} style={{ fontWeight: 800 }}>{stat.value}</p>
            <p className="trek-label mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-foreground font-bold text-sm">Transaksi Terbaru</p>
          <span className="trek-pill trek-pill-indigo">{transactions.length} total</span>
        </div>

        {transactions.length === 0 ? (
          <div className="trek-card p-8 text-center">
            <p className="text-3xl mb-2">💸</p>
            <p className="text-foreground font-medium text-sm">Belum ada transaksi</p>
            <p className="text-muted-foreground text-xs mt-1">Tekan tombol + untuk menambahkan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([label, txs]) => (
              <div key={label}>
                <p className="trek-label mb-2">{label}</p>
                <div className="trek-card overflow-hidden">
                  {txs.map((tx, i) => (
                    <motion.div key={tx.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className={cn("flex items-center gap-3 px-4 py-3 group transition-colors", "hover:bg-secondary/50",
                        i < txs.length - 1 && "border-b border-border/50"
                      )}>
                      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-base flex-shrink-0",
                        tx.type === "income" ? "bg-emerald-500/12" : "bg-rose-500/12"
                      )}>
                        {CATEGORY_EMOJI[tx.category] || "📝"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{tx.description || tx.category}</p>
                        <p className="text-xs text-muted-foreground">{tx.category} · {formatShortDate(tx.date)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className={cn("text-sm font-bold tabular-nums",
                            tx.type === "income" ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(tx)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-500/15 text-muted-foreground hover:text-indigo-500 transition-colors text-xs">✏️</button>
                          <button onClick={() => onDelete(tx.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/15 text-muted-foreground hover:text-rose-500 transition-colors text-xs">🗑️</button>
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
