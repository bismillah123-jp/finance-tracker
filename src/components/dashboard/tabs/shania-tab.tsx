"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Camera, Loader2, Sparkles, X, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { useToast } from "@/hooks/use-toast";
import type { Transaction } from "@/types/database";

interface ShaniaTabProps {
  userId: string;
  transactions: Transaction[];
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  onTransactionAdded: (tx: Transaction) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  action?: Record<string, unknown>;
}

const WELCOME_MSG: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hai bestie! Gue ShanIA, asisten keuangan AI lo yang siap bantu kapan aja ✨\n\nGue bisa:\n• Catat transaksi (\"catat pengeluaran 25rb buat makan\")\n• Cek saldo & ringkasan keuangan\n• Analisis pengeluaran & kasih saran\n• Scan struk belanja 📸\n\nMau ngapain dulu bestie? 💅",
  createdAt: new Date(),
};

export default function ShaniaTab({ userId, transactions, totalBalance, monthlyIncome, monthlyExpense, onTransactionAdded }: ShaniaTabProps) {
  const { formatAmount } = useSettings();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState(false);
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

  async function handleSend(msg?: string, imageBase64?: string) {
    const text = msg || input.trim();
    if (!text && !imageBase64) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: imageBase64 ? (text || "📷 Scan struk ini") : text,
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
          message: text || "Tolong analisis struk ini",
          context: buildContext(),
          history,
          imageBase64: imageBase64 || undefined,
        }),
      });

      const data = await res.json();
      const reply = data.reply || "Waduh bestie, ada error nih 😭 Coba lagi ya!";
      const action = data.action;

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        createdAt: new Date(),
        action,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Handle action
      if (action?.type === "create_transaction" && action.data) {
        await handleCreateTransaction(action.data as Record<string, unknown>);
      }
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

  async function handleCreateTransaction(data: Record<string, unknown>) {
    try {
      const supabase = createClient();
      const txData = {
        user_id: userId,
        type: (data.type as string) || "expense",
        amount: Number(data.amount) || 0,
        category: (data.category as string) || "Lainnya",
        description: (data.description as string) || "",
        date: (data.date as string) || new Date().toISOString().split("T")[0],
      };

      if (txData.amount <= 0) return;

      const { data: tx, error } = await supabase.from("transactions").insert(txData).select().single();
      if (!error && tx) {
        onTransactionAdded(tx as Transaction);
        toast({ title: "✅ Transaksi dicatat oleh ShanIA!" });
      }
    } catch (e) {
      console.error("Failed to create transaction:", e);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File terlalu besar (max 5MB)", variant: "destructive" });
      return;
    }

    setScanMode(false);
    setLoading(true);

    // Upload to Supabase Storage first to get a public URL
    // (Vercel function has 10s timeout — base64 payloads are too large)
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `receipts/${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars") // reuse existing public bucket
        .upload(path, file, { upsert: true, contentType: file.type });

      let imageUrl: string | undefined;

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        imageUrl = publicUrl;
      }

      // Fallback: use base64 if upload failed
      if (!imageUrl) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result as string;
          const base64 = dataUrl.split(",")[1];
          await sendImageToShanIA(base64, undefined);
        };
        reader.readAsDataURL(file);
        return;
      }

      await sendImageToShanIA(undefined, imageUrl);
    } catch {
      // Final fallback: base64
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        await sendImageToShanIA(base64, undefined);
      };
      reader.readAsDataURL(file);
    } finally {
      e.target.value = "";
    }
  }

  async function sendImageToShanIA(imageBase64?: string, imageUrl?: string) {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "📷 Scan struk ini",
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Scan struk ini dan catat transaksinya",
          context: buildContext(),
          history,
          imageBase64,
          imageUrl,
        }),
      });

      const data = await res.json();
      const reply = data.reply || "Waduh bestie, scan struk error nih 😭";
      const action = data.action;

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        createdAt: new Date(),
        action,
      }]);

      if (action?.type === "create_transaction" && action.data) {
        await handleCreateTransaction(action.data as Record<string, unknown>);
      }
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
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 112px)" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>
            🤖
          </div>
          <div>
            <h1 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>ShanIA</h1>
            <p className="text-xs" style={{ color: "var(--accent-green)" }}>● Online</p>
          </div>
        </div>
        <button onClick={() => setMessages([WELCOME_MSG])}
          className="app-bar-icon" title="Reset chat">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-2 scrollbar-hide">
        {messages.map((msg) => (
          <motion.div key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>
                ✨
              </div>
            )}
            <div className="max-w-[80%]">
              <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: msg.role === "user"
                    ? "var(--accent-blue)"
                    : "var(--bg-card)",
                  color: msg.role === "user" ? "white" : "var(--text-primary)",
                  border: msg.role === "assistant" ? "1px solid var(--border-default)" : "none",
                  borderTopLeftRadius: msg.role === "assistant" ? 4 : 16,
                  borderTopRightRadius: msg.role === "user" ? 4 : 16,
                }}>
                {msg.content}
              </div>
              {msg.action?.type === "create_transaction" && (
                <div className="mt-1 px-2">
                  <span className="pill pill-green text-[10px]">✅ Transaksi dicatat</span>
                </div>
              )}
              <p className="text-[10px] mt-1 px-1"
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
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--accent-blue)" }}
                    animate={{ y: [0,-4,0] }}
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
              className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
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
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
            title="Scan struk">
            <Camera className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Chat sama ShanIA..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              fontSize: "16px",
            }}
          />

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSend()}
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
