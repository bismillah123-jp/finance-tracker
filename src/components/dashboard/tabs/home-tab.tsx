"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { useSettings } from "@/contexts/settings-context";

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

function getDateLabel(d: string) {
  const date = new Date(d), today = new Date(), yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hari Ini";
  if (date.toDateString() === yest.toDateString()) return "Kemarin";
  return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

export default function HomeTab({ displayName, totalBalance, totalIncome, totalExpense, transactions, onEdit, onDelete }: HomeTabProps) {
  const { formatAmount } = useSettings();

  const recent = transactions.slice(0, 20);
  const grouped: Record<string, Transaction[]> = {};
  recent.forEach((t) => {
    const lbl = getDateLabel(t.date);
    if (!grouped[lbl]) grouped[lbl] = [];
    grouped[lbl].push(t);
  });

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* Balance hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="hero-card hero-navy relative overflow-hidden"
        style={{ minHeight: 180 }}
      >
        {/* Decorative */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-5">
            <span className="glass-chip px-3 py-1.5">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Total Saldo</span>
            </span>
            <span className="text-white/50 text-xs">
              {new Date().toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
            </span>
          </div>
          {/* FIX: use formatAmount for privacy mode support */}
          <p className="text-white font-black tabular-nums mb-1"
            style={{ fontSize: "clamp(1.5rem, 7vw, 2.25rem)", letterSpacing: "-0.03em" }}>
            {formatAmount(totalBalance)}
          </p>
          <p className="text-white/50 text-sm">Selamat datang, {displayName} 👋</p>
        </div>

        {/* Income/expense glass row */}
        <div className="mx-4 mb-4 p-4 rounded-2xl relative z-10"
          style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.18)" }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Pemasukan</p>
              </div>
              <p className="text-emerald-300 font-black tabular-nums text-base">{formatAmount(totalIncome)}</p>
            </div>
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: "1rem" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-300" />
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Pengeluaran</p>
              </div>
              <p className="text-red-300 font-black tabular-nums text-base">{formatAmount(totalExpense)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Transaksi", value: `${transactions.length}`, color: "var(--accent-blue)" },
          { label: "Masuk", value: `${transactions.filter(t => t.type === "income").length}`, color: "var(--accent-green)" },
          { label: "Keluar", value: `${transactions.filter(t => t.type === "expense").length}`, color: "var(--accent-red)" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
            className="card p-3 text-center">
            <p className="font-black tabular-nums text-xl" style={{ color: s.color }}>{s.value}</p>
            <p className="label-xs mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent transactions */}
      <div>
        <div className="section-header">
          <span className="section-title">Transaksi Terbaru</span>
          <span className="pill pill-blue">{transactions.length} total</span>
        </div>

        {transactions.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-2">💸</p>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Belum ada transaksi</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Tekan + untuk menambahkan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([label, txs]) => (
              <div key={label}>
                <p className="label-xs mb-2">{label}</p>
                <div className="card overflow-hidden">
                  {txs.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="tx-item group"
                      style={{ borderBottom: i < txs.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    >
                      {/* Icon */}
                      <div className={`tx-icon ${tx.type === "income" ? "tx-icon-income" : "tx-icon-expense"}`}>
                        {CATEGORY_EMOJI[tx.category] || "📝"}
                      </div>

                      {/* Info — FIX: single description, no duplicate */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {tx.description && tx.description.trim() !== "" ? tx.description : tx.category}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {tx.category} · {formatShortDate(tx.date)}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="text-sm font-bold tabular-nums"
                          style={{ color: tx.type === "income" ? "var(--accent-green)" : "var(--accent-red)" }}>
                          {tx.type === "income" ? "+" : "-"}{formatAmount(tx.amount)}
                        </p>
                        {/* Actions on hover */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onEdit(tx)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
                            style={{ color: "var(--text-tertiary)" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-blue)"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}>
                            ✏️
                          </button>
                          <button onClick={() => onDelete(tx.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
                            style={{ color: "var(--text-tertiary)" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-red)"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}>
                            🗑️
                          </button>
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
