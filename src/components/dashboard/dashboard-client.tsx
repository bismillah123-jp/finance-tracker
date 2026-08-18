"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import type { Transaction, Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/theme-context";
import { NotificationProvider, useNotifications } from "@/contexts/notification-context";
import HomeTab from "@/components/dashboard/tabs/home-tab";
import AnalyticsTab from "@/components/dashboard/tabs/analytics-tab";
import WalletTab from "@/components/dashboard/tabs/wallet-tab";
import ProfileTab from "@/components/dashboard/tabs/profile-tab";
import DebtTab from "@/components/dashboard/tabs/debt-tab";
import AITab from "@/components/dashboard/tabs/ai-tab";
import AddTransactionModal from "@/components/dashboard/add-transaction-modal";
import BottomNav from "@/components/dashboard/bottom-nav";
import NotificationPanel from "@/components/dashboard/notification-panel";
import { Bell, Sun, Moon } from "lucide-react";

interface DashboardClientProps {
  user: User;
  profile: Profile | null;
  initialTransactions: Transaction[];
}

export type TabType = "home" | "analytics" | "wallet" | "debt" | "ai" | "profile";

function DashboardInner({ user, profile, initialTransactions }: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { addNotification, unreadCount } = useNotifications();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const totalBalance =
    transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) -
    transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const cm = new Date().getMonth();
  const cy = new Date().getFullYear();
  const monthlyTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === cm && d.getFullYear() === cy;
  });
  const totalIncome = monthlyTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthlyTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const handleAddTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setIsModalOpen(false);
    setEditingTransaction(null);
    addNotification({ type: "success", icon: tx.type === "income" ? "💰" : "💸", title: `${tx.type === "income" ? "Pemasukan" : "Pengeluaran"} Dicatat!`, body: `${tx.category} — Rp ${tx.amount.toLocaleString("id-ID")}` });
    toast({ title: "✅ Transaksi ditambahkan!" });
  }, [toast, addNotification]);

  const handleUpdateTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
    setIsModalOpen(false);
    setEditingTransaction(null);
    toast({ title: "✅ Transaksi diperbarui!" });
  }, [toast]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) { toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" }); return; }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    addNotification({ type: "info", icon: "🗑️", title: "Transaksi Dihapus", body: "Satu transaksi berhasil dihapus." });
    toast({ title: "🗑️ Transaksi dihapus!" });
  }, [toast, addNotification]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";

  return (
    /* FIX: app-shell class for desktop border; max-w-lg centered */
    <div className="min-h-screen bg-background flex flex-col w-full max-w-lg mx-auto relative app-shell">

      {/* Sticky top header */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-30 glass border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center neon-indigo flex-shrink-0">
            <span className="text-sm font-bold text-white">F</span>
          </div>
          <span className="font-bold text-sm text-foreground">FinTrack</span>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.button whileTap={{ scale: 0.88 }} onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            {theme === "dark" ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowNotif(!showNotif)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors relative">
            <Bell className="w-4 h-4 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </motion.button>
        </div>
      </header>

      {/* Notification panel */}
      <NotificationPanel isOpen={showNotif} onClose={() => setShowNotif(false)} />

      {/* Tab content — FIX: pt-14 for header, pb-28 for bottom nav + FAB */}
      <div className="flex-1 pt-14 pb-28 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div key="home" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}>
              <HomeTab displayName={displayName} totalBalance={totalBalance} totalIncome={totalIncome} totalExpense={totalExpense} transactions={transactions} onEdit={handleEdit} onDelete={handleDeleteTransaction} />
            </motion.div>
          )}
          {activeTab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}>
              <AnalyticsTab transactions={transactions} />
            </motion.div>
          )}
          {activeTab === "wallet" && (
            <motion.div key="wallet" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}>
              <WalletTab transactions={transactions} />
            </motion.div>
          )}
          {activeTab === "debt" && (
            <motion.div key="debt" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}>
              <DebtTab userId={user.id} />
            </motion.div>
          )}
          {activeTab === "ai" && (
            <motion.div key="ai" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}>
              <AITab transactions={transactions} displayName={displayName} />
            </motion.div>
          )}
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}>
              <ProfileTab user={user} profile={profile} transactions={transactions} onLogout={handleLogout} isLoggingOut={isLoggingOut} displayName={displayName} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Nav with FAB in center */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onFABPress={() => { setEditingTransaction(null); setIsModalOpen(true); }} />

      {/* Modal */}
      <AddTransactionModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
        onAdd={handleAddTransaction}
        onUpdate={handleUpdateTransaction}
        userId={user.id}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}

export default function DashboardClient(props: DashboardClientProps) {
  return (
    <NotificationProvider>
      <DashboardInner {...props} />
    </NotificationProvider>
  );
}
