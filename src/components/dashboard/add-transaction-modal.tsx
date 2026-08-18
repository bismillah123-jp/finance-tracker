"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import type { Transaction, TransactionType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (tx: Transaction) => void;
  onUpdate: (tx: Transaction) => void;
  userId: string;
  editingTransaction: Transaction | null;
}

export default function AddTransactionModal({
  open, onClose, onAdd, onUpdate, userId, editingTransaction,
}: AddTransactionModalProps) {
  const { toast } = useToast();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
      setDescription(editingTransaction.description || "");
      setDate(editingTransaction.date);
    } else {
      setType("expense");
      setAmount("");
      setCategory("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [editingTransaction, open]);

  function handleClose() {
    onClose();
    setAmount(""); setCategory(""); setDescription("");
    setDate(new Date().toISOString().split("T")[0]); setType("expense");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(/[^0-9]/g, ""));
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: "Jumlah tidak valid", variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ title: "Pilih kategori", variant: "destructive" });
      return;
    }
    setLoading(true);
    const supabase = createClient();

    if (editingTransaction) {
      const { data, error } = await supabase.from("transactions")
        .update({ type, amount: parsed, category, description, date })
        .eq("id", editingTransaction.id).select().single();
      if (error) { toast({ title: "Gagal memperbarui", description: error.message, variant: "destructive" }); setLoading(false); return; }
      onUpdate(data as Transaction);
    } else {
      const { data, error } = await supabase.from("transactions")
        .insert({ user_id: userId, type, amount: parsed, category, description, date })
        .select().single();
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setLoading(false); return; }
      onAdd(data as Transaction);
    }
    setLoading(false);
  }

  const rawAmount = amount.replace(/[^0-9]/g, "");
  const displayAmount = rawAmount ? new Intl.NumberFormat("id-ID").format(parseInt(rawAmount)) : "";
  const isEditing = !!editingTransaction;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-sm p-0 overflow-hidden gap-0"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          borderRadius: 24,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Colored top strip */}
        <div className="h-1.5 w-full flex-shrink-0" style={{
          background: type === "income"
            ? "linear-gradient(90deg,#059669,#10b981)"
            : "linear-gradient(90deg,#dc2626,#ef4444)"
        }} />

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div>
              <h2 className="heading-md">{isEditing ? "Edit Transaksi" : "Tambah Transaksi"}</h2>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {isEditing ? "Perbarui detail transaksi" : "Catat pemasukan atau pengeluaran baru"}
              </p>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              {(["income", "expense"] as TransactionType[]).map((t) => (
                <button key={t} type="button"
                  onClick={() => { setType(t); setCategory(""); }}
                  className="type-btn"
                  style={{
                    background: type === t
                      ? t === "income" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)"
                      : "transparent",
                    borderColor: type === t
                      ? t === "income" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"
                      : "var(--border-default)",
                    color: type === t
                      ? t === "income" ? "var(--accent-green)" : "var(--accent-red)"
                      : "var(--text-secondary)",
                  }}>
                  {t === "income" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {t === "income" ? "Pemasukan" : "Pengeluaran"}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <label className="input-label">Jumlah</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold"
                  style={{ color: "var(--text-tertiary)" }}>Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={displayAmount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  required
                  className="input-field pl-9 text-right tabular-nums font-semibold"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="input-label">Kategori</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="input-field appearance-none pr-10"
                  style={{ cursor: "pointer" }}
                >
                  <option value="">Pilih kategori...</option>
                  {CATEGORIES[type].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: "var(--text-tertiary)" }} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="input-label">
                Keterangan <span style={{ color: "var(--text-tertiary)" }}>(opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Makan siang di warung..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Date */}
            <div>
              <label className="input-label">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="input-field"
              />
            </div>

            {/* Buttons — always visible, not hidden by overflow */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="btn-secondary flex-1"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                style={{
                  background: type === "income" ? "var(--accent-green)" : "var(--accent-blue)"
                }}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</>
                ) : isEditing ? "Perbarui" : "Simpan Transaksi"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
