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

type ViewType = "income" | "expense";

const PIE_COLORS = ["#6366f1", "#10b981", "#f43f5e", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 border border-border text-xs shadow-xl">
        <p className="text-muted-foreground mb-1">{label}</p>
        {payload.map((e) => (
          <p key={e.name} style={{ color: e.color }} className="font-semibold">
            {e.name}: {formatCurrency(e.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsTab({ transactions }: AnalyticsTabProps) {
  const [view, setView] = useState<ViewType>("expense");

  // Chart data — shows BOTH lines always (for context), but highlights active view
  const chartData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 5),
      end: endOfMonth(now),
    });
    return months.map((month) => {
      const s = startOfMonth(month), e = endOfMonth(month);
      const txs = transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= s && d <= e;
      });
      return {
        month: format(month, "MMM", { locale: id }),
        Pemasukan: txs.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0),
        Pengeluaran: txs.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0),
      };
    });
  }, [transactions]);

  // Pie data — filtered by selected view
  const pieData = useMemo(() => {
    const now = new Date();
    const txs = transactions.filter((t) => {
      const d = new Date(t.date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        t.type === view
      );
    });
    const cats: Record<string, number> = {};
    txs.forEach((t) => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [transactions, view]);

  const totalThisMonth = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear() &&
          t.type === view
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, view]);

  // Max value for Y axis — prevent duplicate ticks
  const maxValue = useMemo(() => {
    const allValues = chartData.flatMap((d) => [d.Pemasukan, d.Pengeluaran]);
    return Math.max(...allValues, 1);
  }, [chartData]);

  const yTickCount = 4;

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-foreground text-xl font-bold">Analitik</h1>
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setView("income")}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold transition-colors",
              view === "income" ? "bg-emerald-600/20 text-emerald-400" : "text-muted-foreground hover:text-foreground"
            )}
          >
            💰 Masuk
          </button>
          <button
            onClick={() => setView("expense")}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold transition-colors",
              view === "expense" ? "bg-rose-600/20 text-rose-400" : "text-muted-foreground hover:text-foreground"
            )}
          >
            💸 Keluar
          </button>
        </div>
      </div>

      {/* Summary card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={cn("glass rounded-2xl p-5 border mb-5",
          view === "expense" ? "border-rose-500/20" : "border-emerald-500/20"
        )}>
        <p className="text-muted-foreground text-sm mb-1">
          Total {view === "expense" ? "Pengeluaran" : "Pemasukan"} Bulan Ini
        </p>
        <p className={cn("text-3xl font-bold tabular-nums",
          view === "expense"
            ? totalThisMonth > 0 ? "text-rose-400" : "text-muted-foreground"
            : totalThisMonth > 0 ? "text-emerald-400" : "text-muted-foreground"
        )}>
          {formatCurrency(totalThisMonth)}
        </p>
        {totalThisMonth === 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Belum ada {view === "expense" ? "pengeluaran" : "pemasukan"} bulan ini
          </p>
        )}
      </motion.div>

      {/* Area chart — both lines, correct Y ticks */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 border border-border mb-5">
        <p className="text-foreground text-sm font-semibold mb-1">Tren 6 Bulan Terakhir</p>
        <p className="text-xs text-muted-foreground mb-3">
          {view === "income" ? "Fokus: Pemasukan 🟢" : "Fokus: Pengeluaran 🔴"}
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={view === "income" ? 0.35 : 0.1} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={view === "expense" ? 0.35 : 0.1} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
            {/* FIX: tickCount prevents duplicate Y labels */}
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickCount={yTickCount}
              domain={[0, maxValue]}
              tickFormatter={(v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}jt` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}rb` : `${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="Pemasukan"
              stroke="#10b981"
              strokeWidth={view === "income" ? 2.5 : 1}
              strokeOpacity={view === "income" ? 1 : 0.3}
              fill="url(#gIncome)"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="Pengeluaran"
              stroke="#f43f5e"
              strokeWidth={view === "expense" ? 2.5 : 1}
              strokeOpacity={view === "expense" ? 1 : 0.3}
              fill="url(#gExpense)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Pie / category breakdown — synced to view */}
      {pieData.length > 0 ? (
        <>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-4 border border-border mb-5">
            <p className="text-foreground text-sm font-semibold mb-3">
              Breakdown Kategori {view === "expense" ? "Pengeluaran" : "Pemasukan"} Bulan Ini
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-4 border border-border">
            <p className="text-foreground text-sm font-semibold mb-3">Top Kategori</p>
            <div className="space-y-3">
              {pieData.slice(0, 5).map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{item.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(item.value / (pieData[0]?.value || 1)) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      ) : (
        <div className="text-center py-10 glass rounded-2xl border border-border">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-foreground font-medium text-sm">Belum ada data</p>
          <p className="text-muted-foreground text-xs mt-1">
            Belum ada {view === "expense" ? "pengeluaran" : "pemasukan"} bulan ini
          </p>
        </div>
      )}
    </div>
  );
}
