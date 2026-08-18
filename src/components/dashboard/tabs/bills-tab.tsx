"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, Clock, AlertTriangle } from "lucide-react";
import type { Bill } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BillsTabProps { userId: string; }

const BILL_CATEGORIES = ["Listrik", "Air", "Internet", "Telepon", "Sewa", "Asuransi", "Langganan", "Tagihan", "Lainnya"];

export default function BillsTab({ userId }: BillsTabProps) {
  const { formatAmount } = useSettings();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", category: "Tagihan", due_day: "1", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchBills = useCallback(async () => {
    const { data } = await createClient().from("bills").select("*").eq("user_id", userId).order("due_day");
    setBills((data as Bill[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const today = new Date().getDate();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  function getDaysUntilDue(dueDay: number): number {
    const dueDate = new Date(currentYear, currentMonth, dueDay);
    if (dueDate < new Date()) dueDate.setMonth(dueDate.getMonth() + 1);
    return Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  }

  function getDueStatus(bill: Bill): "overdue" | "soon" | "ok" | "paid" {
    if (bill.is_paid) return "paid";
    const days = getDaysUntilDue(bill.due_day);
    if (days < 0) return "overdue";
    if (days <= 3) return "soon";
    return "ok";
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount.replace(/[^0-9]/g, ""));
    if (!amount || !form.name.trim()) return;
    setSaving(true);
    const { data, error } = await createClient().from("bills").insert({
      user_id: userId, name: form.name.trim(), amount, category: form.category,
      due_day: parseInt(form.due_day), notes: form.notes || null, is_paid: false,
    }).select().single();
    if (error) toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    else {
      setBills(prev => [...prev, data as Bill].sort((a, b) => a.due_day - b.due_day));
      setForm({ name: "", amount: "", category: "Tagihan", due_day: "1", notes: "" });
      setShowForm(false);
      toast({ title: "✅ Tagihan ditambahkan!" });
    }
    setSaving(false);
  }

  async function handleTogglePaid(bill: Bill) {
    const isPaid = !bill.is_paid;
    await createClient().from("bills").update({ is_paid: isPaid, last_paid_at: isPaid ? new Date().toISOString().split("T")[0] : null }).eq("id", bill.id);
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, is_paid: isPaid, last_paid_at: isPaid ? new Date().toISOString().split("T")[0] : null } : b));
    toast({ title: isPaid ? "✅ Ditandai lunas!" : "🔄 Ditandai belum lunas" });
  }

  async function handleDelete(id: string) {
    await createClient().from("bills").delete().eq("id", id);
    setBills(prev => prev.filter(b => b.id !== id));
    toast({ title: "🗑️ Tagihan dihapus!" });
  }

  const unpaidBills = bills.filter(b => !b.is_paid);
  const totalUnpaid = unpaidBills.reduce((s, b) => s + b.amount, 0);
  const urgentBills = unpaidBills.filter(b => getDaysUntilDue(b.due_day) <= 3);

  const statusStyles = {
    paid: "border-border opacity-60",
    ok: "border-border",
    soon: "border-amber-500/30 bg-amber-500/5",
    overdue: "border-rose-500/30 bg-rose-500/5",
  };

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-xl font-bold">Tagihan</h1>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowForm(!showForm)}
          className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center neon-indigo">
          <Plus className="w-4 h-4 text-white" />
        </motion.button>
      </div>

      {/* Summary */}
      {unpaidBills.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="trek-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="trek-label">TAGIHAN BELUM LUNAS</p>
            {urgentBills.length > 0 && <span className="trek-pill trek-pill-red">🚨 {urgentBills.length} mendesak</span>}
          </div>
          <p className="text-foreground font-black text-2xl tabular-nums">{formatAmount(totalUnpaid)}</p>
          <p className="text-muted-foreground text-xs mt-1">{unpaidBills.length} tagihan menunggu</p>
        </motion.div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={handleAdd} className="trek-card p-4 space-y-3">
              <p className="text-foreground font-semibold text-sm">Tambah Tagihan</p>
              <input required placeholder="Nama tagihan (contoh: IndiHome)" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none">
                  {BILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Tgl</span>
                  <input type="number" min="1" max="31" value={form.due_day}
                    onChange={e => setForm({ ...form, due_day: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-foreground outline-none" />
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                <input type="text" inputMode="numeric" placeholder="0" required
                  value={form.amount ? new Intl.NumberFormat("id-ID").format(parseInt(form.amount.replace(/[^0-9]/g, "") || "0")) : ""}
                  onChange={e => setForm({ ...form, amount: e.target.value.replace(/[^0-9]/g, "") })}
                  className="w-full bg-secondary border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-foreground text-right tabular-nums outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>
              <input placeholder="Catatan (opsional)" value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm text-white font-medium disabled:opacity-60">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bills list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="trek-card p-4 animate-pulse h-20" />)}</div>
      ) : bills.length === 0 ? (
        <div className="trek-card p-8 text-center">
          <p className="text-3xl mb-2">🧾</p>
          <p className="text-foreground font-medium text-sm">Belum ada tagihan</p>
          <p className="text-muted-foreground text-xs mt-1">Tap + untuk tambah tagihan rutin</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill, i) => {
            const status = getDueStatus(bill);
            const daysUntil = getDaysUntilDue(bill.due_day);
            return (
              <motion.div key={bill.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={cn("trek-card p-4 border", statusStyles[status])}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0",
                    status === "paid" ? "bg-emerald-500/15" : status === "overdue" ? "bg-rose-500/15" : status === "soon" ? "bg-amber-500/15" : "bg-secondary"
                  )}>
                    {status === "paid" ? "✅" : status === "overdue" ? "🚨" : status === "soon" ? "⏰" : "🧾"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-semibold truncate", bill.is_paid ? "text-muted-foreground line-through" : "text-foreground")}>{bill.name}</p>
                      <span className="trek-label flex-shrink-0">{bill.category}</span>
                    </div>
                    <p className={cn("text-sm font-bold tabular-nums", status === "paid" ? "text-muted-foreground" : "text-foreground")}>{formatAmount(bill.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      Jatuh tempo tgl {bill.due_day} ·{" "}
                      {status === "paid" ? "Lunas" : status === "overdue" ? "⚠️ Terlambat" : `${daysUntil} hari lagi`}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleTogglePaid(bill)}
                      className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                        bill.is_paid ? "bg-secondary text-muted-foreground" : "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                      )}>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(bill.id)}
                      className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {bill.notes && <p className="text-xs text-muted-foreground mt-2 pl-13">{bill.notes}</p>}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
