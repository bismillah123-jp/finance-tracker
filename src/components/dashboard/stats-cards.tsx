"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface StatsCardsProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
  }),
};

export default function StatsCards({ totalBalance, totalIncome, totalExpense }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Saldo",
      value: totalBalance,
      icon: Wallet,
      color: "indigo",
      glow: "neon-indigo",
      bg: "bg-indigo-600/10",
      iconColor: "text-indigo-400",
      valueColor: "text-indigo-400",
      border: "border-indigo-600/20",
    },
    {
      label: "Pemasukan Bulan Ini",
      value: totalIncome,
      icon: TrendingUp,
      color: "emerald",
      glow: "neon-emerald",
      bg: "bg-emerald-600/10",
      iconColor: "text-emerald-400",
      valueColor: "text-emerald-400",
      border: "border-emerald-600/20",
    },
    {
      label: "Pengeluaran Bulan Ini",
      value: totalExpense,
      icon: TrendingDown,
      color: "rose",
      glow: "neon-rose",
      bg: "bg-rose-600/10",
      iconColor: "text-rose-400",
      valueColor: "text-rose-400",
      border: "border-rose-600/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className={`glass rounded-2xl p-5 border ${card.border} hover:scale-[1.02] transition-transform duration-200`}
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 + 0.2, duration: 0.3 }}
            className={`text-2xl font-bold ${card.valueColor} tabular-nums`}
          >
            {formatCurrency(card.value)}
          </motion.p>
          <p className="text-xs text-muted-foreground mt-1">
            {card.label === "Total Saldo" ? "Akumulasi semua waktu" : new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
