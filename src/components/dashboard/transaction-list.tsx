"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Trash2, Search } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Gaji: "💰", Freelance: "💻", Investasi: "📈", Bisnis: "🏢", Bonus: "🎁", Hadiah: "🎀",
  Makanan: "🍜", Transportasi: "🚗", Belanja: "🛍️", Tagihan: "🧾", Kesehatan: "💊",
  Hiburan: "🎮", Pendidikan: "📚", Lainnya: "📝",
};

export default function TransactionList({ transactions, onEdit, onDelete, compact = false }: TransactionListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = transactions.filter((t) => {
    const matchSearch = search === "" ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || t.type === filter;
    return matchSearch && matchFilter;
  });

  async function handleDelete(id: string) {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  }

  if (compact) {
    return (
      <Card className="glass border-border h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada transaksi</p>
          ) : (
            <div className="space-y-2">
              {filtered.slice(0, 8).map((tx) => (
                <CompactRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={handleDelete} deletingId={deletingId} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base text-white">Semua Transaksi</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-secondary/50"
              />
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["all", "income", "expense"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2.5 py-1.5 text-xs font-medium transition-colors",
                    filter === f
                      ? f === "income" ? "bg-emerald-600/20 text-emerald-400"
                        : f === "expense" ? "bg-rose-600/20 text-rose-400"
                        : "bg-indigo-600/20 text-indigo-400"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "all" ? "Semua" : f === "income" ? "Masuk" : "Keluar"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              {search || filter !== "all" ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi. Tambahkan yang pertama!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {filtered.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors group"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base",
                    tx.type === "income" ? "bg-emerald-600/15" : "bg-rose-600/15"
                  )}>
                    {CATEGORY_EMOJI[tx.category] || "📝"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{tx.description || tx.category}</p>
                    <p className="text-xs text-muted-foreground">{tx.category} · {formatDate(tx.date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      "text-sm font-semibold tabular-nums",
                      tx.type === "income" ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(tx)}
                      className="p-1.5 rounded-lg hover:bg-indigo-600/20 text-muted-foreground hover:text-indigo-400 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      disabled={deletingId === tx.id}
                      className="p-1.5 rounded-lg hover:bg-rose-600/20 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompactRow({ tx, onEdit, onDelete, deletingId }: {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
  deletingId: string | null;
}) {
  // suppress unused warning — onEdit/onDelete reserved for future compact actions
  void onEdit; void onDelete; void deletingId;
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm",
        tx.type === "income" ? "bg-emerald-600/15" : "bg-rose-600/15"
      )}>
        {CATEGORY_EMOJI[tx.category] || "📝"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{tx.description || tx.category}</p>
        <p className="text-[10px] text-muted-foreground">{formatShortDate(tx.date)}</p>
      </div>
      <p className={cn("text-xs font-semibold tabular-nums flex-shrink-0", tx.type === "income" ? "text-emerald-400" : "text-rose-400")}>
        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
      </p>
    </div>
  );
}
