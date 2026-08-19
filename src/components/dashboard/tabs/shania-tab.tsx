"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Camera, Loader2, RefreshCw, Check, X, Edit3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useToast } from "@/hooks/use-toast";
import type { Transaction, TransactionType } from "@/types/database";

interface ShaniaTabProps {
  userId: string;
  transactions: Transaction[];
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  onTransactionAdded: (tx: Transaction) => void;
}

interface PendingTransaction {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreviewUrl?: string; // #1: tampilkan gambar di chat
  createdAt: Date;
  pendingTx?: PendingTransaction; // #2: konfirmasi sebelum catat
}

const WELCOME_MSG: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hai bestie! Gue ShanIA, asisten keuangan AI lo yang siap bantu kapan aja ✨\n\nGue bisa:\n• Catat transaksi (\"catat pengeluaran 25rb buat makan\")\n• Cek saldo & ringkasan keuangan\n• Analisis pengeluaran & kasih saran\n• Scan struk belanja 📸\n\nMau ngapain dulu bestie? 💅",
  createdAt: new Date(),
};

const CATEGORIES = ["Makanan","Transportasi","Belanja","Tagihan","Kesehatan","Hiburan","Pendidikan","Gaji","Freelance","Investasi","Bisnis","Lainnya"];

export default function ShaniaTab({ userId, transactions, totalBalance, monthlyIncome, monthlyExpense, onTransactionAdded }: ShaniaTabProps) {
  const { formatAmount } = useSettings();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingTx, setEditingTx] = useState<{ msgId: string; tx: PendingTransaction } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = useCallback(() => ({
    totalBalance: formatAmount(totalBalance),
    monthlyIncome: formatAmount(monthlyIncome),
    monthlyExpense: formatAmount(monthlyExpense),
    transactionCount: transactions.length,
    recentTransactions: transactions.slice(0, 5).map(t => ({
      category: t.category,
      amount: formatAmount(t.amount),
      type: t.type,
      date: t.date,
    })),
  }), [totalBalance, monthlyIncome, monthlyExpense, transactions, formatAmount]);

  // Commit transaction to Supabase
  async function commitTransaction(tx: PendingTransaction, msgId: string) {
    const supabase = createClient();
    const txData = {
      user_id: userId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      description: tx.description,
      date: tx.date,
    };
    const { data, error } = await supabase.from("transactions").insert(txData).select().single();
    if (!error && data) {
      onTransactionAdded(data as Transaction);
      // Remove pending from message
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, pendingTx: undefined } : m
      ));
      toast({ title: "✅ Transaksi dikonfirmasi & dicatat!" });
    } else {
      toast({ title: "Gagal catat transaksi", description: error?.message, variant: "destructive" });
    }
  }

  async function handleSend(msg?: string) {
    const text = msg || input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: buildContext(),
          history,
        }),
      });

      const data = await res.json();
      const reply = data.reply || "Waduh bestie, ada error nih 😭 Coba lagi ya!";
      const action = data.action;

      // #2: Jangan auto-catat, tampilkan tombol konfirmasi
      let pendingTx: PendingTransaction | undefined;
      if (action?.type === "create_transaction" && action.data) {
        const d = action.data as Record<string, unknown>;
        const amount = Number(d.amount) || 0;
        if (amount > 0) {
          pendingTx = {
            type: ((d.type as string) || "expense") as TransactionType,
            amount,
            category: (d.category as string) || "Lainnya",
            description: (d.description as string) || "",
            date: (d.date as string) || new Date().toISOString().split("T")[0],
          };
        }
      }

      const msgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: msgId,
        role: "assistant",
        content: reply,
        createdAt: new Date(),
        pendingTx,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Waduh bestie, ShanIA lagi error nih 😭 Coba lagi ya!",
        createdAt: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File terlalu besar (max 5MB)", variant: "destructive" });
      return;
    }

    // #1: Preview URL buat ditampilin di chat bubble
    const previewUrl = URL.createObjectURL(file);

    // Add user message with image preview
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: "user",
      content: "📷 Scan struk ini",
      imagePreviewUrl: previewUrl,
      createdAt: new Date(),
    }]);

    setLoading(true);
    e.target.value = "";

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `receipts/${userId}/${Date.now()}.${ext}`;

      let imageUrl: string | undefined;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        imageUrl = publicUrl;
      }

      // Fallback to base64
      let imageBase64: string | undefined;
      if (!imageUrl) {
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve) => {
          reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });
      }

      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Scan struk ini. Ekstrak total, toko, tanggal, dan kategori. Lalu tawarkan untuk mencatat transaksinya.",
          context: buildContext(),
          history,
          imageUrl,
          imageBase64,
        }),
      });

      const data = await res.json();
      const reply = data.reply || "Bestie maaf, scan struk gagal 😭";
      const action = data.action;

      // #3: Juga parse action dari scan struk
      let pendingTx: PendingTransaction | undefined;
      if (action?.type === "create_transaction" && action.data) {
        const d = action.data as Record<string, unknown>;
        const amount = Number(d.amount) || 0;
        if (amount > 0) {
          pendingTx = {
            type: ((d.type as string) || "expense") as TransactionType,
            amount,
            category: (d.category as string) || "Belanja",
            description: (d.description as string) || "Dari scan struk",
            date: (d.date as string) || new Date().toISOString().split("T")[0],
          };
        }
      }

      const msgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: msgId,
        role: "assistant",
        content: reply,
        createdAt: new Date(),
        pendingTx,
      }]);

    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Bestie ShanIA timeout nih 😭 Coba lagi ya!",
        createdAt: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  const QUICK_PROMPTS = [
    "Saldo gue berapa?",
    "Ringkasan bulan ini dong",
    "Kasih saran hemat bestie",
    "Pengeluaran terbesar apa?",
  ];

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 112px)" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>🤖</div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>ShanIA</p>
            <p className="text-xs" style={{ color: "var(--accent-green)" }}>● Online</p>
          </div>
        </div>
        <button onClick={() => setMessages([WELCOME_MSG])} className="app-bar-icon" title="Reset chat">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-2 scrollbar-hide">
        {messages.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>✨</div>
            )}
            <div className="max-w-[80%] space-y-2">
              {/* #1: Image preview */}
              {msg.imagePreviewUrl && (
                <div className="rounded-2xl overflow-hidden border"
                  style={{ borderColor: "var(--border-default)" }}>
                  <img src={msg.imagePreviewUrl} alt="Struk" className="w-full max-h-48 object-cover" />
                </div>
              )}

              {/* Chat bubble */}
              <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: msg.role === "user" ? "var(--accent-blue)" : "var(--bg-card)",
                  color: msg.role === "user" ? "white" : "var(--text-primary)",
                  border: msg.role === "assistant" ? "1px solid var(--border-default)" : "none",
                  borderTopLeftRadius: msg.role === "assistant" ? 4 : 16,
                  borderTopRightRadius: msg.role === "user" ? 4 : 16,
                }}>
                {msg.content}
              </div>

              {/* #2: Konfirmasi transaksi card */}
              {msg.pendingTx && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="card p-3 space-y-2"
                  style={{ borderColor: msg.pendingTx.type === "income" ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)" }}>

                  {editingTx?.msgId === msg.id ? (
                    // Edit mode
                    <div className="space-y-2">
                      <p className="label-xs">EDIT TRANSAKSI</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="input-label">Tipe</label>
                          <select value={editingTx.tx.type}
                            onChange={e => setEditingTx({ ...editingTx, tx: { ...editingTx.tx, type: e.target.value as TransactionType } })}
                            className="input-field text-xs py-1.5">
                            <option value="expense">Pengeluaran</option>
                            <option value="income">Pemasukan</option>
                          </select>
                        </div>
                        <div>
                          <label className="input-label">Jumlah</label>
                          <input type="number" value={editingTx.tx.amount}
                            onChange={e => setEditingTx({ ...editingTx, tx: { ...editingTx.tx, amount: Number(e.target.value) } })}
                            className="input-field text-xs py-1.5" />
                        </div>
                      </div>
                      <div>
                        <label className="input-label">Kategori</label>
                        <select value={editingTx.tx.category}
                          onChange={e => setEditingTx({ ...editingTx, tx: { ...editingTx.tx, category: e.target.value } })}
                          className="input-field text-xs py-1.5">
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="input-label">Keterangan</label>
                        <input type="text" value={editingTx.tx.description}
                          onChange={e => setEditingTx({ ...editingTx, tx: { ...editingTx.tx, description: e.target.value } })}
                          className="input-field text-xs py-1.5" />
                      </div>
                      <div>
                        <label className="input-label">Tanggal</label>
                        <input type="date" value={editingTx.tx.date}
                          onChange={e => setEditingTx({ ...editingTx, tx: { ...editingTx.tx, date: e.target.value } })}
                          className="input-field text-xs py-1.5" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          // Apply edit and confirm
                          setMessages(prev => prev.map(m =>
                            m.id === msg.id ? { ...m, pendingTx: editingTx.tx } : m
                          ));
                          setEditingTx(null);
                        }} className="btn-primary flex-1 py-2 text-xs" style={{ background: "var(--accent-green)" }}>
                          <Check className="w-3 h-3 inline mr-1" />Simpan Edit
                        </button>
                        <button onClick={() => setEditingTx(null)}
                          className="btn-secondary flex-1 py-2 text-xs">Batal</button>
                      </div>
                    </div>
                  ) : (
                    // Preview mode
                    <div className="space-y-2">
                      <p className="label-xs">
                        {msg.pendingTx.type === "income" ? "💰 CATAT PEMASUKAN?" : "💸 CATAT PENGELUARAN?"}
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <span style={{ color: "var(--text-secondary)" }}>Jumlah</span>
                        <span className="font-bold" style={{ color: msg.pendingTx.type === "income" ? "var(--accent-green)" : "var(--accent-red)" }}>
                          {formatAmount(msg.pendingTx.amount)}
                        </span>
                        <span style={{ color: "var(--text-secondary)" }}>Kategori</span>
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{msg.pendingTx.category}</span>
                        {msg.pendingTx.description && (
                          <>
                            <span style={{ color: "var(--text-secondary)" }}>Keterangan</span>
                            <span style={{ color: "var(--text-primary)" }}>{msg.pendingTx.description}</span>
                          </>
                        )}
                        <span style={{ color: "var(--text-secondary)" }}>Tanggal</span>
                        <span style={{ color: "var(--text-primary)" }}>{msg.pendingTx.date}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => commitTransaction(msg.pendingTx!, msg.id)}
                          className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1"
                          style={{ background: "var(--accent-blue)" }}>
                          <Check className="w-3 h-3" />Catat
                        </button>
                        <button onClick={() => setEditingTx({ msgId: msg.id, tx: { ...msg.pendingTx! } })}
                          className="btn-secondary flex-1 py-2 text-xs flex items-center justify-center gap-1">
                          <Edit3 className="w-3 h-3" />Edit
                        </button>
                        <button onClick={() => setMessages(prev => prev.map(m =>
                            m.id === msg.id ? { ...m, pendingTx: undefined } : m
                          ))}
                          className="btn-secondary flex-1 py-2 text-xs flex items-center justify-center gap-1"
                          style={{ color: "var(--accent-red)", borderColor: "rgba(239,68,68,0.3)" }}>
                          <X className="w-3 h-3" />Batal
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              <p className="text-[10px] px-1"
                style={{ color: "var(--text-tertiary)", textAlign: msg.role === "user" ? "right" : "left" }}>
                {msg.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>✨</div>
            <div className="px-4 py-2.5 rounded-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--accent-blue)" }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => handleSend(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0"
              style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-2 pt-2 flex-shrink-0" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="flex gap-2 items-center">
          <button onClick={() => fileRef.current?.click()}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
            title="Scan struk">
            <Camera className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Chat sama ShanIA..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none"
            style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border-default)",
              color: "var(--text-primary)", fontSize: "16px",
            }}
          />

          <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: input.trim() ? "var(--accent-blue)" : "var(--bg-secondary)",
              color: input.trim() ? "white" : "var(--text-tertiary)",
              border: "1px solid var(--border-default)",
            }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
