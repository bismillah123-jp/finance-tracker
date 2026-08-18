"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import type { Transaction, TransactionType } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
    setDate(new Date().toISOString().split("T")[0]);
    setType("expense");
  }

  function handleAmountChange(val: string) {
    setAmount(val.replace(/[^0-9]/g, ""));
  }

  const displayAmount = amount ? new Intl.NumberFormat("id-ID").format(parseInt(amount || "0")) : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Jumlah tidak valid", variant: "destructive" }); return;
    }
    if (!category) {
      toast({ title: "Pilih kategori", variant: "destructive" }); return;
    }
    setLoading(true);
    const supabase = createClient();

    if (editingTransaction) {
      const { data, error } = await supabase
        .from("transactions")
        .update({ type, amount: parsedAmount, category, description, date })
        .eq("id", editingTransaction.id).select().single();
      if (error) { toast({ title: "Gagal memperbarui", description: error.message, variant: "destructive" }); setLoading(false); return; }
      onUpdate(data as Transaction);
    } else {
      const { data, error } = await supabase
        .from("transactions")
        .insert({ user_id: userId, type, amount: parsedAmount, category, description, date })
        .select().single();
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setLoading(false); return; }
      onAdd(data as Transaction);
    }
    setLoading(false);
  }

  const isEditing = !!editingTransaction;
  const categories = CATEGORIES[type];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm w-full mx-4">
        <DialogHeader>
          <DialogTitle className="text-white">{isEditing ? "Edit Transaksi" : "Tambah Transaksi"}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {isEditing ? "Perbarui detail transaksi" : "Catat pemasukan atau pengeluaran baru"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {(["income", "expense"] as TransactionType[]).map((t) => (
              <motion.button key={t} type="button" whileTap={{ scale: 0.97 }}
                onClick={() => { setType(t); setCategory(""); }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all",
                  type === t
                    ? t === "income" ? "bg-emerald-600/20 border-emerald-600/40 text-emerald-400" : "bg-rose-600/20 border-rose-600/40 text-rose-400"
                    : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground"
                )}>
                {t === "income" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {t === "income" ? "Pemasukan" : "Pengeluaran"}
              </motion.button>
            ))}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Jumlah</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input type="text" inputMode="numeric" placeholder="0"
                value={displayAmount} onChange={(e) => handleAmountChange(e.target.value)}
                required className="pl-9 bg-secondary/50 border-border text-right tabular-nums" />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue placeholder="Pilih kategori..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Keterangan (opsional)</Label>
            <Input type="text" placeholder="Contoh: Makan siang..."
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary/50 border-border" />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              required className="bg-secondary/50 border-border" />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1" disabled={loading}>Batal</Button>
            <Button type="submit" disabled={loading}
              className={cn("flex-1 text-white", type === "income" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500")}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : isEditing ? "Perbarui" : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
