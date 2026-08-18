"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Lightbulb, Brain } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AITabProps {
  transactions: Transaction[];
  displayName: string;
}

interface AIInsight {
  type: "good" | "warning" | "tip" | "info";
  title: string;
  body: string;
  icon: string;
}

export default function AITab({ transactions, displayName }: AITabProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);

  async function generateInsights() {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyTxs = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const totalIncome = monthlyTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const totalExpense = monthlyTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const allTimeBalance = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) -
        transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

      const catExpense: Record<string, number> = {};
      monthlyTxs.filter((t) => t.type === "expense").forEach((t) => {
        catExpense[t.category] = (catExpense[t.category] || 0) + t.amount;
      });

      const topExpCat = Object.entries(catExpense).sort((a, b) => b[1] - a[1])[0];
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
      const txCount = monthlyTxs.length;

      // Calculate health score
      let healthScore = 50;
      if (savingsRate >= 20) healthScore += 20;
      else if (savingsRate >= 10) healthScore += 10;
      else if (savingsRate < 0) healthScore -= 20;
      if (totalIncome > totalExpense) healthScore += 10;
      if (txCount >= 5) healthScore += 10;
      if (allTimeBalance > 0) healthScore += 10;
      healthScore = Math.max(0, Math.min(100, healthScore));
      setScore(healthScore);

      const result: AIInsight[] = [];

      // Savings rate insight
      if (savingsRate >= 20) {
        result.push({
          type: "good",
          icon: "🎉",
          title: "Tingkat Tabungan Bagus!",
          body: `Kamu berhasil menabung ${savingsRate.toFixed(1)}% dari pemasukan bulan ini. Teruskan! Target ideal adalah 20-30%.`
        });
      } else if (savingsRate > 0) {
        result.push({
          type: "warning",
          icon: "⚠️",
          title: "Tabungan Masih Rendah",
          body: `Tingkat tabungan kamu ${savingsRate.toFixed(1)}% — idealnya minimal 20%. Coba kurangi pengeluaran ${topExpCat ? `di kategori ${topExpCat[0]}` : "tidak penting"}.`
        });
      } else if (savingsRate < 0 && totalIncome > 0) {
        result.push({
          type: "warning",
          icon: "🚨",
          title: "Pengeluaran Melebihi Pemasukan!",
          body: `Bulan ini kamu boros ${formatCurrency(Math.abs(totalExpense - totalIncome))} di atas pemasukan. Ini tidak sustainable — segera kurangi pengeluaran.`
        });
      }

      // Top expense category
      if (topExpCat) {
        const pct = totalExpense > 0 ? (topExpCat[1] / totalExpense) * 100 : 0;
        result.push({
          type: pct > 40 ? "warning" : "info",
          icon: "📊",
          title: `Pengeluaran Terbesar: ${topExpCat[0]}`,
          body: `${topExpCat[0]} menyumbang ${pct.toFixed(0)}% dari total pengeluaran bulan ini (${formatCurrency(topExpCat[1])}). ${pct > 40 ? "Pertimbangkan untuk menghemat di kategori ini." : "Distribusi ini cukup wajar."}`
        });
      }

      // Balance insight
      if (allTimeBalance > 0) {
        result.push({
          type: "good",
          icon: "💰",
          title: "Saldo Positif",
          body: `Total saldo kamu ${formatCurrency(allTimeBalance)} — bagus! Pertimbangkan investasikan 10-20% untuk tumbuh lebih cepat.`
        });
      } else if (allTimeBalance < 0) {
        result.push({
          type: "warning",
          icon: "🔴",
          title: "Total Saldo Negatif",
          body: `Total saldo kamu minus ${formatCurrency(Math.abs(allTimeBalance))}. Fokus tingkatkan pemasukan atau kurangi pengeluaran rutin.`
        });
      }

      // Transaction frequency
      if (txCount < 3) {
        result.push({
          type: "tip",
          icon: "💡",
          title: "Catat Lebih Rutin",
          body: "Kamu baru mencatat " + txCount + " transaksi bulan ini. Semakin lengkap catatanmu, semakin akurat insight yang bisa gue berikan!"
        });
      }

      // Generic tip
      const tips = [
        { icon: "🎯", title: "Aturan 50/30/20", body: "50% kebutuhan pokok, 30% keinginan, 20% tabungan. Coba terapkan bulan depan!" },
        { icon: "📅", title: "Budget Bulanan", body: "Set budget per kategori di awal bulan. Ini cara paling efektif menghindari boros." },
        { icon: "🔄", title: "Review Mingguan", body: "Luangkan 5 menit tiap minggu untuk review pengeluaran. Catch masalah sebelum membesar." },
        { icon: "💳", title: "Bayar Cash/Transfer", body: "Hindari hutang konsumtif. Kalau harus beli, pastikan uangnya udah ada." },
      ];
      result.push({ type: "tip", ...tips[Math.floor(Math.random() * tips.length)] });

      setInsights(result);
      setGenerated(true);
    } catch (err) {
      console.error(err);
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

  const insightColors = {
    good: "border-emerald-500/20 bg-emerald-500/5",
    warning: "border-rose-500/20 bg-rose-500/5",
    tip: "border-indigo-500/20 bg-indigo-500/5",
    info: "border-blue-500/20 bg-blue-500/5",
  };

  return (
    <div className="min-h-screen px-4 pt-12 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
          <Brain className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-white text-xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground text-xs">Analisis keuangan personal kamu</p>
        </div>
      </div>

      {/* Health Score */}
      {score !== null && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-6 border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 to-purple-600/5 mb-5 text-center">
          <p className="text-muted-foreground text-sm mb-2">Skor Kesehatan Keuangan</p>
          <p className={cn("text-6xl font-black tabular-nums mb-1", scoreColor)}>{score}</p>
          <p className="text-sm font-medium text-white">{scoreLabel}</p>
          {/* Score bar */}
          <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className={cn("h-full rounded-full", score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-yellow-500" : "bg-rose-500")} />
          </div>
        </motion.div>
      )}

      {/* Generate button */}
      {!generated ? (
        <motion.button whileTap={{ scale: 0.97 }} onClick={generateInsights} disabled={loading}
          className="w-full glass rounded-2xl p-5 border border-indigo-500/30 bg-gradient-to-r from-indigo-600/15 to-purple-600/10 flex items-center justify-center gap-3 mb-5 disabled:opacity-60">
          {loading ? (
            <>
              <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
              <span className="text-white font-medium">Menganalisis keuanganmu...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span className="text-white font-medium">Analisis Keuanganku</span>
            </>
          )}
        </motion.button>
      ) : (
        <button onClick={() => { setGenerated(false); setScore(null); setInsights([]); generateInsights(); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-5 text-sm text-muted-foreground hover:text-white transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Analisis
        </button>
      )}

      {/* Insights */}
      <AnimatePresence>
        {insights.map((insight, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn("glass rounded-2xl p-4 border mb-3", insightColors[insight.type])}>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{insight.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm mb-1">{insight.title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{insight.body}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Empty state */}
      {!generated && !loading && (
        <div className="text-center py-8">
          <p className="text-5xl mb-4">🤖</p>
          <p className="text-white font-medium mb-1">AI Siap Menganalisis!</p>
          <p className="text-muted-foreground text-sm">Tekan tombol di atas untuk mendapatkan insight personal berdasarkan transaksimu.</p>
        </div>
      )}
    </div>
  );
}
