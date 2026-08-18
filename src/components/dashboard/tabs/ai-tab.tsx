"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Brain, CheckCircle, AlertTriangle, Info, X } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AITabProps {
  transactions: Transaction[];
  displayName: string;
}

interface AIInsight {
  type: "good" | "warning" | "tip" | "info";
  icon: string;
  title: string;
  body: string;
}

// FIX: all text uses text-foreground/text-muted-foreground, no hardcoded text-white
const insightStyles = {
  good: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    titleColor: "text-foreground",
    iconBg: "bg-emerald-500/20",
  },
  warning: {
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    titleColor: "text-foreground",
    iconBg: "bg-rose-500/20",
  },
  tip: {
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/10",
    titleColor: "text-foreground",
    iconBg: "bg-indigo-500/20",
  },
  info: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    titleColor: "text-foreground",
    iconBg: "bg-blue-500/20",
  },
};

export default function AITab({ transactions, displayName }: AITabProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);

  function generateInsights() {
    setLoading(true);
    try {
      const now = new Date();
      const cm = now.getMonth(), cy = now.getFullYear();
      const mTxs = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === cm && d.getFullYear() === cy;
      });

      const inc = mTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const exp = mTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const allBal = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) -
        transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

      const catExp: Record<string, number> = {};
      mTxs.filter((t) => t.type === "expense").forEach((t) => {
        catExp[t.category] = (catExp[t.category] || 0) + t.amount;
      });
      const topCat = Object.entries(catExp).sort((a, b) => b[1] - a[1])[0];
      const savRate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;

      let health = 50;
      if (savRate >= 20) health += 20;
      else if (savRate >= 10) health += 10;
      else if (savRate < 0) health -= 20;
      if (inc > exp) health += 10;
      if (mTxs.length >= 5) health += 10;
      if (allBal > 0) health += 10;
      health = Math.max(0, Math.min(100, health));
      setScore(health);

      const result: AIInsight[] = [];

      if (savRate >= 20) {
        result.push({ type: "good", icon: "🎉", title: "Tingkat Tabungan Bagus!", body: `Kamu menabung ${savRate.toFixed(1)}% dari pemasukan. Target ideal 20-30% — kamu udah di jalur yang benar!` });
      } else if (savRate > 0) {
        result.push({ type: "warning", icon: "⚠️", title: "Tabungan Masih Rendah", body: `Tabungan kamu ${savRate.toFixed(1)}%. Minimal target 20%. Coba kurangi pengeluaran${topCat ? ` di ${topCat[0]}` : ""}.` });
      } else if (savRate < 0 && inc > 0) {
        result.push({ type: "warning", icon: "🚨", title: "Pengeluaran Melebihi Pemasukan!", body: `Boros ${formatCurrency(Math.abs(exp - inc))} di atas pemasukan bulan ini. Segera evaluasi!` });
      }

      if (topCat) {
        const pct = exp > 0 ? (topCat[1] / exp) * 100 : 0;
        result.push({ type: pct > 40 ? "warning" : "info", icon: "📊", title: `Pengeluaran Terbesar: ${topCat[0]}`, body: `${topCat[0]} = ${pct.toFixed(0)}% dari total pengeluaran (${formatCurrency(topCat[1])}). ${pct > 40 ? "Pertimbangkan hemat di sini." : "Distribusi cukup wajar."}` });
      }

      if (allBal > 0) {
        result.push({ type: "good", icon: "💰", title: "Saldo Positif", body: `Total saldo ${formatCurrency(allBal)}. Pertimbangkan investasikan 10-20% untuk tumbuh lebih cepat.` });
      } else if (allBal < 0) {
        result.push({ type: "warning", icon: "🔴", title: "Total Saldo Negatif", body: `Saldo minus ${formatCurrency(Math.abs(allBal))}. Fokus tingkatkan pemasukan atau kurangi pengeluaran rutin.` });
      }

      if (mTxs.length < 3) {
        result.push({ type: "tip", icon: "📝", title: "Catat Lebih Rutin", body: `Baru ${mTxs.length} transaksi bulan ini. Makin lengkap catatan, makin akurat analisisnya!` });
      }

      const tips: AIInsight[] = [
        { type: "tip", icon: "🎯", title: "Aturan 50/30/20", body: "50% kebutuhan, 30% keinginan, 20% tabungan. Coba terapkan bulan depan!" },
        { type: "tip", icon: "📅", title: "Budget Bulanan", body: "Set budget per kategori di awal bulan — cara paling efektif hindari boros." },
        { type: "tip", icon: "🔄", title: "Review Mingguan", body: "5 menit tiap minggu review pengeluaran. Catch masalah sebelum membesar." },
      ];
      result.push(tips[Math.floor(Math.random() * tips.length)]);

      setInsights(result);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  const scoreColor = score !== null
    ? score >= 70 ? "text-emerald-400" : score >= 40 ? "text-yellow-400" : "text-rose-400"
    : "text-muted-foreground";

  const scoreLabel = score !== null
    ? score >= 70 ? "Sehat 🟢" : score >= 40 ? "Perlu Perhatian 🟡" : "Kritis 🔴"
    : "";

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
          <Brain className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-foreground text-xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground text-xs">Analisis keuangan personal kamu</p>
        </div>
      </div>

      {/* Health Score */}
      {score !== null && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-6 border border-indigo-500/20 mb-5 text-center">
          <p className="text-muted-foreground text-sm mb-2">Skor Kesehatan Keuangan</p>
          <p className={cn("text-6xl font-black tabular-nums mb-1", scoreColor)}>{score}</p>
          <p className="text-sm font-medium text-foreground">{scoreLabel}</p>
          <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className={cn("h-full rounded-full", score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-yellow-500" : "bg-rose-500")} />
          </div>
        </motion.div>
      )}

      {/* Generate / Refresh button */}
      {!generated ? (
        <motion.button whileTap={{ scale: 0.97 }} onClick={generateInsights} disabled={loading}
          className="w-full glass rounded-2xl p-5 border border-indigo-500/30 flex items-center justify-center gap-3 mb-5 disabled:opacity-60 hover:border-indigo-500/50 transition-colors">
          {loading ? (
            <><RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" /><span className="text-foreground font-medium">Menganalisis...</span></>
          ) : (
            <><Sparkles className="w-5 h-5 text-indigo-400" /><span className="text-foreground font-medium">Analisis Keuanganku</span></>
          )}
        </motion.button>
      ) : (
        <button onClick={() => { setGenerated(false); setScore(null); setInsights([]); generateInsights(); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Analisis
        </button>
      )}

      {/* Insights list */}
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const style = insightStyles[insight.type];
          return (
            <motion.div key={i}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn("rounded-2xl p-4 border", style.border, style.bg)}>
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg", style.iconBg)}>
                  {insight.icon}
                </div>
                <div className="flex-1 min-w-0">
                  {/* FIX: text-foreground not text-white */}
                  <p className={cn("text-sm font-semibold mb-1", style.titleColor)}>{insight.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {!generated && !loading && (
        <div className="text-center py-8">
          <p className="text-5xl mb-4">🤖</p>
          <p className="text-foreground font-medium mb-1">AI Siap Menganalisis!</p>
          <p className="text-muted-foreground text-sm">Tekan tombol di atas untuk insight personal.</p>
        </div>
      )}
    </div>
  );
}
