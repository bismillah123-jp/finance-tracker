"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { id } from "date-fns/locale";
import type { Transaction } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TransactionChartProps {
  transactions: Transaction[];
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 border border-border text-sm">
        <p className="text-muted-foreground mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function TransactionChart({ transactions }: TransactionChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 5),
      end: endOfMonth(now),
    });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthTxs = transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= monthStart && d <= monthEnd;
      });
      const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return {
        month: format(month, "MMM yy", { locale: id }),
        Pemasukan: income,
        Pengeluaran: expense,
        Saldo: income - expense,
      };
    });
  }, [transactions]);

  const categoryData = useMemo(() => {
    const now = new Date();
    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === "expense";
    });
    const cats: Record<string, number> = {};
    monthTxs.forEach((t) => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="glass border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">Tren 6 Bulan Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}jt`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Area type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={2} fill="url(#income)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
                <Area type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" strokeWidth={2} fill="url(#expense)" dot={false} activeDot={{ r: 4, fill: "#f43f5e" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {categoryData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="glass border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Top Pengeluaran Bulan Ini</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={categoryData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}jt`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Pengeluaran" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
