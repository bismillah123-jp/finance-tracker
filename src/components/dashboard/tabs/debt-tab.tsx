"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Trash2, Users, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";
import type { Debt } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DebtTabProps {
  userId: string;
}

export default function DebtTab({ userId }: DebtTabProps) {
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("unpaid");
  const [debtFilter, setDebtFilter] = useState<"all" | "owe" | "lend">("all");

  // Form state
  const [form, setForm] = useState({
    type: "owe" as "owe" | "lend",
    person_name: "",
    amount: "",
    description: "",
    due_date: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchDebts = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error) setDebts(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount.replace(/[^0-9]/g, ""));
    if (!amount || !form.person_name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("debts").insert({
      user_id: userId,
      type: form.type,
      person_name: form.person_name.trim(),
      amount,
      description: form.description,
      due_date: form.due_date || null,
      is_paid: false,
    }).select().single();
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    } else {
      setDebts((prev) => [data as Debt, ...prev]);
      setForm({ type: "owe", person_name: "", amount: "", description: "", due_date: "" });
      setShowForm(false);
      toast({ title: "✅ Hutang dicatat!" });
    }
    setSaving(false);
  }

  async function handleTogglePaid(debt: Debt) {
    const supabase = createClient();
    const { error } = await supabase.from("debts").update({ is_paid: !debt.is_paid }).eq("id", debt.id);
    if (!error) {
      setDebts((prev) => prev.map((d) => d.id === debt.id ? { ...d, is_paid: !d.is_paid } : d));
      toast({ title: debt.is_paid ? "🔄 Ditandai belum lunas" : "✅ Ditandai lunas!" });
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("debts").delete().eq("id", id);
    if (!error) {
      setDebts((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "🗑️ Dihapus!" });
    }
  }

  const filtered = debts.filter((d) => {
    const matchPaid = filter === "all" || (filter === "paid" ? d.is_paid : !d.is_paid);
    const matchType = debtFilter === "all" || d.type === debtFilter;
    return matchPaid && matchType;
  });

  const totalOwe = debts.filter((d) => d.type === "owe" && !d.is_paid).reduce((s, d) => s + d.amount, 0);
  const totalLend = debts.filter((d) => d.type === "lend" && !d.is_paid).reduce((s, d) => s + d.amount, 0);

  const isOverdue = (debt: Debt) => !debt.is_paid && debt.due_date && new Date(debt.due_date) < new Date();

  return (
    <div className="min-h-screen px-4 pt-12 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-white text-xl font-bold">Hutang & Piutang</h1>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowForm(!showForm)}
          className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center neon-indigo">
          <Plus className="w-4 h-4 text-white" />
        </motion.button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-4 border border-rose-500/20">
          <div className="flex items-center gap-2 mb-1.5">
            <ArrowDownLeft className="w-4 h-4 text-rose-400" />
            <span className="text-xs text-muted-foreground">Gue Hutang</span>
          </div>
          <p className="text-rose-400 font-bold text-base tabular-nums">{formatCurrency(totalOwe)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{debts.filter(d => d.type === "owe" && !d.is_paid).length} tagihan</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1.5">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">Dipinjam ke Gue</span>
          </div>
          <p className="text-emerald-400 font-bold text-base tabular-nums">{formatCurrency(totalLend)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{debts.filter(d => d.type === "lend" && !d.is_paid).length} tagihan</p>
        </motion.div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5">
            <form onSubmit={handleAdd} className="glass rounded-2xl p-4 border border-indigo-500/20 space-y-3">
              <p className="text-white font-semibold text-sm">Catat Hutang/Piutang</p>

              {/* Type */}
              <div className="grid grid-cols-2 gap-2">
                {(["owe", "lend"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                    className={cn("py-2 rounded-xl text-xs font-medium border transition-all",
                      form.type === t
                        ? t === "owe" ? "bg-rose-600/20 border-rose-600/40 text-rose-400" : "bg-emerald-600/20 border-emerald-600/40 text-emerald-400"
                        : "bg-secondary/30 border-border text-muted-foreground"
                    )}>
                    {t === "owe" ? "😰 Gue Hutang" : "🤝 Dipinjami"}
                  </button>
                ))}
              </div>

              <input required placeholder="Nama orang" value={form.person_name}
                onChange={(e) => setForm({ ...form, person_name: e.target.value })}
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-indigo-500" />

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                <input required type="text" inputMode="numeric" placeholder="0"
                  value={form.amount ? new Intl.NumberFormat("id-ID").format(parseInt(form.amount.replace(/[^0-9]/g, "") || "0")) : ""}
                  onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9]/g, "") })}
                  className="w-full bg-secondary/50 border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-white text-right tabular-nums placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>

              <input placeholder="Keterangan (opsional)" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-indigo-500" />

              <input type="date" placeholder="Jatuh tempo" value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500" />

              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground">Batal</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm text-white font-medium disabled:opacity-60">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {(["unpaid", "paid", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all flex-shrink-0",
              filter === f ? "bg-indigo-600/20 border-indigo-600/40 text-indigo-400" : "border-border text-muted-foreground"
            )}>
            {f === "unpaid" ? "Belum Lunas" : f === "paid" ? "Lunas" : "Semua"}
          </button>
        ))}
        <div className="w-px bg-border flex-shrink-0 mx-1" />
        {(["all", "owe", "lend"] as const).map((f) => (
          <button key={f} onClick={() => setDebtFilter(f)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all flex-shrink-0",
              debtFilter === f ? "bg-secondary border-border text-white" : "border-border text-muted-foreground"
            )}>
            {f === "all" ? "Semua Tipe" : f === "owe" ? "Gue Hutang" : "Piutang"}
          </button>
        ))}
      </div>

      {/* Debt list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 border border-border animate-pulse">
              <div className="h-4 bg-secondary rounded w-1/2 mb-2" />
              <div className="h-3 bg-secondary rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-muted-foreground text-sm">Ga ada hutang/piutang</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((debt, i) => (
              <motion.div key={debt.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0 }} transition={{ delay: i * 0.04 }}
                className={cn("glass rounded-2xl p-4 border transition-all",
                  debt.is_paid ? "border-border opacity-60" :
                    isOverdue(debt) ? "border-rose-500/40 bg-rose-500/5" :
                      debt.type === "owe" ? "border-rose-500/20" : "border-emerald-500/20"
                )}>
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg",
                    debt.type === "owe" ? "bg-rose-500/15" : "bg-emerald-500/15"
                  )}>
                    {debt.type === "owe" ? "😰" : "🤝"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-white truncate">{debt.person_name}</p>
                      {debt.is_paid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                      {isOverdue(debt) && <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full">Lewat Jatuh Tempo</span>}
                    </div>
                    <p className={cn("text-base font-bold tabular-nums", debt.type === "owe" ? "text-rose-400" : "text-emerald-400")}>
                      {debt.type === "owe" ? "-" : "+"}{formatCurrency(debt.amount)}
                    </p>
                    {debt.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{debt.description}</p>}
                    {debt.due_date && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">{formatDate(debt.due_date)}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => handleTogglePaid(debt)}
                      className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                        debt.is_paid ? "bg-secondary text-muted-foreground" : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                      )}>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(debt.id)}
                      className="w-8 h-8 rounded-xl bg-rose-600/15 text-rose-400 flex items-center justify-center hover:bg-rose-600/25 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
