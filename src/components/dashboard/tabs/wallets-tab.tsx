"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowLeftRight, Wallet, TrendingUp, TrendingDown, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useToast } from "@/hooks/use-toast";
import type { WalletItem } from "@/types/database";

interface WalletsTabProps { userId: string; }

const WALLET_TYPES = [
  { value: "cash",        label: "💵 Cash",        color: "#10b981" },
  { value: "bank",        label: "🏦 Bank",         color: "#3b82f6" },
  { value: "ewallet",     label: "📱 E-Wallet",     color: "#8b5cf6" },
  { value: "credit_card", label: "💳 Kartu Kredit", color: "#ef4444" },
  { value: "paylater",    label: "🔄 Paylater",     color: "#f59e0b" },
  { value: "investment",  label: "📈 Investasi",    color: "#06b6d4" },
  { value: "gold",        label: "🥇 Emas",         color: "#f59e0b" },
];

const WALLET_COLORS = ["#6366f1","#10b981","#ef4444","#f59e0b","#3b82f6","#8b5cf6","#06b6d4","#ec4899","#14b8a6","#84cc16"];

export default function WalletsTab({ userId }: WalletsTabProps) {
  const { formatAmount } = useSettings();
  const { toast } = useToast();
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [goldPrice, setGoldPrice] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", type: "cash", color: "#6366f1", balance: "" });
  const [transfer, setTransfer] = useState({ from: "", to: "", amount: "", note: "" });
  const [saving, setSaving] = useState(false);

  const fetchWallets = useCallback(async () => {
    const { data } = await createClient().from("wallets").select("*").eq("user_id", userId).order("created_at");
    setWallets((data as WalletItem[]) || []);
    setLoading(false);
  }, [userId]);

  const fetchGoldPrice = useCallback(async () => {
    try {
      const r = await fetch("/api/gold-price");
      const d = await r.json();
      if (d.price) setGoldPrice(d.price);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchWallets();
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchWallets, fetchGoldPrice]);

  const getWalletValue = (w: WalletItem) => {
    if (w.type === "gold" && goldPrice && w.gold_grams > 0) {
      return w.gold_grams * goldPrice;
    }
    return w.balance;
  };

  const netWorth = wallets.reduce((s, w) => s + getWalletValue(w), 0);

  async function handleAddWallet(e: React.FormEvent) {
    e.preventDefault();
    const balance = parseFloat(form.balance.replace(/[^0-9]/g, "") || "0");
    setSaving(true);
    const { data, error } = await createClient().from("wallets").insert({
      user_id: userId,
      name: form.name.trim(),
      type: form.type,
      color: form.color,
      balance,
      gold_grams: 0,
      is_default: wallets.length === 0,
    }).select().single();
    if (error) toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    else {
      setWallets(prev => [...prev, data as WalletItem]);
      setForm({ name: "", type: "cash", color: "#6366f1", balance: "" });
      setShowForm(false);
      toast({ title: "✅ Dompet ditambahkan!" });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await createClient().from("wallets").delete().eq("id", id);
    setWallets(prev => prev.filter(w => w.id !== id));
    toast({ title: "🗑️ Dompet dihapus!" });
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(transfer.amount.replace(/[^0-9]/g, ""));
    if (!amount || !transfer.from || !transfer.to || transfer.from === transfer.to) {
      toast({ title: "Data transfer tidak valid", variant: "destructive" });
      return;
    }
    const fromWallet = wallets.find(w => w.id === transfer.from);
    if (!fromWallet || fromWallet.balance < amount) {
      toast({ title: "Saldo tidak cukup", variant: "destructive" });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: debitErr } = await supabase.from("wallets").update({ balance: fromWallet.balance - amount }).eq("id", transfer.from);
    const toWallet = wallets.find(w => w.id === transfer.to);
    if (!debitErr && toWallet) {
      await supabase.from("wallets").update({ balance: toWallet.balance + amount }).eq("id", transfer.to);
      await supabase.from("transfers").insert({ user_id: userId, from_wallet_id: transfer.from, to_wallet_id: transfer.to, amount, note: transfer.note || null, date: new Date().toISOString().split("T")[0] });
      await fetchWallets();
      setTransfer({ from: "", to: "", amount: "", note: "" });
      setShowTransfer(false);
      toast({ title: "✅ Transfer berhasil!" });
    } else {
      toast({ title: "Gagal transfer", variant: "destructive" });
    }
    setSaving(false);
  }

  const typeInfo = (type: string) => WALLET_TYPES.find(t => t.value === type) || WALLET_TYPES[0];

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="heading-lg">Dompet</h1>
        <div className="flex gap-2">
          {wallets.length >= 2 && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowTransfer(!showTransfer)}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
              <ArrowLeftRight className="w-4 h-4" />
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowForm(!showForm)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--accent-blue)", boxShadow: "0 4px 12px rgba(59,130,246,0.4)" }}>
            <Plus className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>

      {/* Net Worth hero */}
      {wallets.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="hero-card hero-navy relative overflow-hidden p-6">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <p className="label-xs text-white/50 mb-2">NET WORTH TOTAL</p>
          <p className="text-white font-black tabular-nums mb-1"
            style={{ fontSize: "clamp(1.5rem,8vw,2.2rem)", letterSpacing: "-0.03em" }}>
            {formatAmount(netWorth)}
          </p>
          {goldPrice && (
            <p className="text-white/40 text-xs">
              🥇 Emas: {formatAmount(goldPrice)}/gram
            </p>
          )}
          <div className="flex gap-4 mt-4">
            <div>
              <p className="label-xs text-white/40">{wallets.length} Dompet</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Transfer form */}
      <AnimatePresence>
        {showTransfer && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={handleTransfer} className="card p-4 space-y-3">
              <p className="heading-md text-sm">Transfer Antar Dompet</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="input-label">Dari</label>
                  <select value={transfer.from} onChange={e => setTransfer({ ...transfer, from: e.target.value })} required className="input-field">
                    <option value="">Pilih dompet...</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatAmount(w.balance)})</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Ke</label>
                  <select value={transfer.to} onChange={e => setTransfer({ ...transfer, to: e.target.value })} required className="input-field">
                    <option value="">Pilih dompet...</option>
                    {wallets.filter(w => w.id !== transfer.from).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">Jumlah</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-tertiary)" }}>Rp</span>
                  <input type="text" inputMode="numeric" placeholder="0" value={transfer.amount ? new Intl.NumberFormat("id-ID").format(parseInt(transfer.amount)) : ""}
                    onChange={e => setTransfer({ ...transfer, amount: e.target.value.replace(/[^0-9]/g, "") })}
                    required className="input-field pl-9 text-right tabular-nums" />
                </div>
              </div>
              <input placeholder="Catatan (opsional)" value={transfer.note} onChange={e => setTransfer({ ...transfer, note: e.target.value })} className="input-field" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowTransfer(false)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1" style={{ background: "var(--accent-blue)" }}>
                  {saving ? "Memproses..." : "Transfer"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add wallet form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={handleAddWallet} className="card p-4 space-y-3">
              <p className="heading-md text-sm">Tambah Dompet</p>
              <div>
                <label className="input-label">Nama Dompet</label>
                <input required placeholder="Contoh: BCA, GoPay, Cash..." value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="input-label">Tipe</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
                  {WALLET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Saldo Awal</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-tertiary)" }}>Rp</span>
                  <input type="text" inputMode="numeric" placeholder="0"
                    value={form.balance ? new Intl.NumberFormat("id-ID").format(parseInt(form.balance || "0")) : ""}
                    onChange={e => setForm({ ...form, balance: e.target.value.replace(/[^0-9]/g, "") })}
                    className="input-field pl-9 text-right tabular-nums" />
                </div>
              </div>
              <div>
                <label className="input-label">Warna</label>
                <div className="flex gap-2 flex-wrap">
                  {WALLET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{ backgroundColor: c, outline: form.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1" style={{ background: "var(--accent-blue)" }}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallets list */}
      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="card p-4 h-20 animate-pulse" style={{ background: "var(--bg-card-2)" }} />)}</div>
      ) : wallets.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-4xl mb-3">💳</p>
          <p className="heading-md mb-1">Belum ada dompet</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Tap + untuk tambah dompet pertama</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet, i) => {
            const info = typeInfo(wallet.type);
            const value = getWalletValue(wallet);
            const pct = netWorth > 0 ? (value / netWorth) * 100 : 0;
            return (
              <motion.div key={wallet.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: wallet.color + "20" }}>
                    {info.label.split(" ")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{wallet.name}</p>
                      {wallet.is_default && <span className="pill pill-blue text-[10px]">Utama</span>}
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{info.label}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black tabular-nums text-base" style={{ color: "var(--text-primary)" }}>
                      {formatAmount(value)}
                    </p>
                    {wallet.type === "gold" && wallet.gold_grams > 0 && (
                      <p className="text-xs" style={{ color: "var(--accent-orange)" }}>{wallet.gold_grams.toFixed(3)}g</p>
                    )}
                  </div>
                  <button onClick={() => handleDelete(wallet.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-red)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="progress-track">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 + i * 0.05, duration: 0.6 }}
                    className="progress-fill" style={{ backgroundColor: wallet.color }} />
                </div>
                <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>
                  {pct.toFixed(1)}% dari net worth
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
