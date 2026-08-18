"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, Target, PlusCircle, MinusCircle } from "lucide-react";
import type { SavingsGoal } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GoalsTabProps { userId: string; }

const GOAL_ICONS = ["🎯","🏠","🚗","✈️","💻","📱","👗","🎓","💰","🌴","🏖️","💍","🎮","📷","⌚","🏋️"];
const GOAL_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#06b6d4"];

export default function GoalsTab({ userId }: GoalsTabProps) {
  const { formatAmount } = useSettings();
  const { toast } = useToast();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addingGoalId, setAddingGoalId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [form, setForm] = useState({ name: "", target_amount: "", deadline: "", icon: "🎯", color: "#6366f1" });
  const [saving, setSaving] = useState(false);

  const fetchGoals = useCallback(async () => {
    const { data } = await createClient().from("savings_goals").select("*").eq("user_id", userId).order("created_at");
    setGoals((data as SavingsGoal[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const target = parseFloat(form.target_amount.replace(/[^0-9]/g, ""));
    if (!target || !form.name.trim()) return;
    setSaving(true);
    const { data, error } = await createClient().from("savings_goals").insert({
      user_id: userId, name: form.name.trim(), target_amount: target,
      current_amount: 0, deadline: form.deadline || null, icon: form.icon, color: form.color,
    }).select().single();
    if (error) toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    else { setGoals(prev => [...prev, data as SavingsGoal]); setForm({ name: "", target_amount: "", deadline: "", icon: "🎯", color: "#6366f1" }); setShowForm(false); toast({ title: "🎯 Goal ditambahkan!" }); }
    setSaving(false);
  }

  async function handleAddFunds(goal: SavingsGoal) {
    const amount = parseFloat(addAmount.replace(/[^0-9]/g, ""));
    if (!amount) return;
    const newAmount = Math.min(goal.current_amount + amount, goal.target_amount);
    const isCompleted = newAmount >= goal.target_amount;
    const { data, error } = await createClient().from("savings_goals")
      .update({ current_amount: newAmount, is_completed: isCompleted, updated_at: new Date().toISOString() })
      .eq("id", goal.id).select().single();
    if (!error && data) {
      setGoals(prev => prev.map(g => g.id === goal.id ? data as SavingsGoal : g));
      if (isCompleted) toast({ title: "🎉 Goal tercapai!" });
      else toast({ title: "✅ Dana ditambahkan!" });
    }
    setAddingGoalId(null); setAddAmount("");
  }

  async function handleDelete(id: string) {
    await createClient().from("savings_goals").delete().eq("id", id);
    setGoals(prev => prev.filter(g => g.id !== id));
    toast({ title: "🗑️ Goal dihapus!" });
  }

  const totalTargeted = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const completedCount = goals.filter(g => g.is_completed).length;

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-xl font-bold">Impian & Tabungan</h1>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowForm(!showForm)}
          className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center neon-indigo">
          <Plus className="w-4 h-4 text-white" />
        </motion.button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Target Total", value: formatAmount(totalTargeted), color: "text-indigo-500" },
            { label: "Terkumpul", value: formatAmount(totalSaved), color: "text-emerald-500" },
            { label: "Selesai", value: `${completedCount}/${goals.length}`, color: "text-amber-500" },
          ].map((s, i) => (
            <div key={s.label} className="trek-card p-3 text-center">
              <p className={cn("text-base font-black tabular-nums", s.color)}>{s.value}</p>
              <p className="trek-label mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={handleAdd} className="trek-card p-4 space-y-3">
              <p className="text-foreground font-semibold text-sm">Tambah Goal</p>
              <input required placeholder="Nama goal (contoh: Laptop baru)" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30" />

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                <input type="text" inputMode="numeric" placeholder="Target nominal" required
                  value={form.target_amount ? new Intl.NumberFormat("id-ID").format(parseInt(form.target_amount.replace(/[^0-9]/g, "") || "0")) : ""}
                  onChange={e => setForm({ ...form, target_amount: e.target.value.replace(/[^0-9]/g, "") })}
                  className="w-full bg-secondary border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-foreground text-right tabular-nums outline-none focus:ring-2 focus:ring-indigo-500/30" />
              </div>

              <input type="date" placeholder="Deadline (opsional)" value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />

              {/* Icon picker */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Icon</p>
                <div className="flex flex-wrap gap-2">
                  {GOAL_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm({ ...form, icon })}
                      className={cn("w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all",
                        form.icon === icon ? "ring-2 ring-indigo-500 bg-indigo-500/15" : "bg-secondary hover:bg-secondary/80"
                      )}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Warna</p>
                <div className="flex gap-2">
                  {GOAL_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm({ ...form, color })}
                      className={cn("w-7 h-7 rounded-full transition-all", form.color === color && "ring-2 ring-offset-2 ring-offset-background ring-white")}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>

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

      {/* Goals list */}
      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="trek-card p-4 animate-pulse h-24" />)}</div>
      ) : goals.length === 0 ? (
        <div className="trek-card p-8 text-center">
          <p className="text-4xl mb-2">🌟</p>
          <p className="text-foreground font-medium text-sm">Belum ada goal</p>
          <p className="text-muted-foreground text-xs mt-1">Mulai rencanakan impianmu!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, i) => {
            const pct = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
            const daysLeft = goal.deadline
              ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={cn("trek-card p-4", goal.is_completed && "border-emerald-500/30 bg-emerald-500/5")}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: goal.color + "20" }}>
                    {goal.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-semibold text-sm truncate">{goal.name}</p>
                      {goal.is_completed && <span className="trek-pill trek-pill-green">✅ Selesai</span>}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatAmount(goal.current_amount)} / {formatAmount(goal.target_amount)}
                      {daysLeft !== null && <span className="ml-2">· {daysLeft > 0 ? `${daysLeft} hari lagi` : "Deadline lewat"}</span>}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(goal.id)}
                    className="w-7 h-7 rounded-lg hover:bg-rose-500/15 text-muted-foreground hover:text-rose-500 transition-colors flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="trek-progress-track mb-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.2 + i * 0.05, duration: 0.7 }}
                    className="trek-progress-fill" style={{ backgroundColor: goal.color }} />
                </div>
                <div className="flex justify-between text-xs mb-3">
                  <span className="text-muted-foreground">{pct.toFixed(0)}% terkumpul</span>
                  <span className="text-foreground font-semibold">{formatAmount(goal.target_amount - goal.current_amount)} lagi</span>
                </div>

                {/* Add funds */}
                {!goal.is_completed && (
                  addingGoalId === goal.id ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                        <input type="text" inputMode="numeric" placeholder="0" value={addAmount}
                          onChange={e => setAddAmount(e.target.value.replace(/[^0-9]/g, ""))}
                          className="w-full bg-secondary border border-border rounded-xl pl-8 pr-3 py-2 text-sm text-foreground text-right outline-none"
                          autoFocus />
                      </div>
                      <button onClick={() => handleAddFunds(goal)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                        style={{ backgroundColor: goal.color }}>Tambah</button>
                      <button onClick={() => { setAddingGoalId(null); setAddAmount(""); }}
                        className="px-3 py-2 rounded-xl text-xs border border-border text-muted-foreground">Batal</button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingGoalId(goal.id)}
                      className="w-full py-2 rounded-xl text-xs font-semibold border transition-colors"
                      style={{ borderColor: goal.color + "40", color: goal.color, backgroundColor: goal.color + "10" }}>
                      + Tambah Dana
                    </button>
                  )
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
