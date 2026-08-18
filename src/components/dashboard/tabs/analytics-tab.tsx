"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { id } from "date-fns/locale";
import type { Transaction } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AnalyticsTabProps {
  transactions: Transaction[];
}

type Period = "week" | "month" | "year";

const PIE_COLORS = ["#6366f1", "#10b981", "#f43f5e", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 border border-border text-xs">
        <p className="text-muted-foreground mb-1">{label}</p>
        {payload.map((e) => (
          <p key={e.name} style={{ color: e.color }} className="font-semibold">{e.name}: {formatCurrency(e.value)}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsTab({ transactions }: AnalyticsTabProps) {
  const [period, setPeriod] = useState<Period>("month");
  const [view, setView] = useState<"income" | "expense">("expense");

  const chartData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) });
    return months.map((month) => {
      const s = startOfMonth(month), e = endOfMonth(month);
      const txs = transactions.filter((t) => { const d = new Date(t.date); return d >= s && d <= e; });
      return {
        month: format(month, "MMM", { locale: id }),
        Pemasukan: txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        Pengeluaran: txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [transactions]);

  const pieData = useMemo(() => {
    const now = new Date();
    const txs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === view;
    });
    const cats: Record<string, number> = {};
    txs.forEach((t) => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [transactions, view]);

  const totalThisMonth = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === view;
    }).reduce((s, t) => s + t.amount, 0);
  }, [transactions, view]);

  return (
    <div className="min-h-screen px-4 pt-12 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-xl font-bold">Analitik</h1>
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(["expense", "income"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={cn("px-3 py-1.5 text-xs font-medium transition-colors",
                view === v
                  ? v === "expense" ? "bg-rose-600/20 text-rose-400" : "bg-emerald-600/20 text-emerald-400"
                  : "text-muted-foreground"
              )}>
              {v === "expense" ? "Keluar" : "Masuk"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={cn("glass rounded-2xl p-5 border mb-5",
          view === "expense" ? "border-rose-500/20" : "border-emerald-500/20"
        )}>
        <p className="text-muted-foreground text-sm mb-1">Total {view === "expense" ? "Pengeluaran" : "Pemasukan"} Bulan Ini</p>
        <p className={cn("text-3xl font-bold tabular-nums", view === "expense" ? "text-rose-400" : "text-emerald-400")}>
          {formatCurrency(totalThisMonth)}
        </p>
      </motion.div>

      {/* Area chart */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 border border-border mb-5">
        <p className="text-white text-sm font-semibold mb-4">Tren 6 Bulan</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v/1e6).toFixed(0)}jt`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={2} fill="url(#gIncome)" dot={false} />
            <Area type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" strokeWidth={2} fill="url(#gExpense)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-4 border border-border mb-5">
          <p className="text-white text-sm font-semibold mb-4">Breakdown Kategori</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Top categories list */}
      {pieData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-4 border border-border">
          <p className="text-white text-sm font-semibold mb-3">Top Kategori</p>
          <div className="space-y-3">
            {pieData.slice(0, 5).map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-medium">{item.name}</span>
                    <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(item.value / (pieData[0]?.value || 1)) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
