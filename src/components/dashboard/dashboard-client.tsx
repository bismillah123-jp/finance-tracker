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
import { SettingsProvider, useSettings } from "@/contexts/settings-context";
import HomeTab from "@/components/dashboard/tabs/home-tab";
import AnalyticsTab from "@/components/dashboard/tabs/analytics-tab";
import WalletTab from "@/components/dashboard/tabs/wallet-tab";
import ProfileTab from "@/components/dashboard/tabs/profile-tab";
import DebtTab from "@/components/dashboard/tabs/debt-tab";
import AITab from "@/components/dashboard/tabs/ai-tab";
import BudgetTab from "@/components/dashboard/tabs/budget-tab";
import BillsTab from "@/components/dashboard/tabs/bills-tab";
import GoalsTab from "@/components/dashboard/tabs/goals-tab";
import SettingsTab from "@/components/dashboard/tabs/settings-tab";
import AddTransactionModal from "@/components/dashboard/add-transaction-modal";
import BottomNav from "@/components/dashboard/bottom-nav";
import NotificationPanel from "@/components/dashboard/notification-panel";
import { Bell, Sun, Moon, Eye, EyeOff } from "lucide-react";

interface DashboardClientProps {
  user: User;
  profile: Profile | null;
  initialTransactions: Transaction[];
}

export type TabType = "home" | "analytics" | "wallet" | "debt" | "ai" | "profile" | "budget" | "bills" | "goals" | "settings";

function DashboardInner({ user, profile, initialTransactions }: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { addNotification, unreadCount } = useNotifications();
  const { privacyMode, togglePrivacy } = useSettings();

  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const cm = new Date().getMonth(), cy = new Date().getFullYear();
  const monthlyTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === cm && d.getFullYear() === cy;
  });
  const totalBalance = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
    - transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalIncome = monthlyTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthlyTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const handleAddTransaction = useCallback((tx: Transaction) => {
    setTransactions(prev => [tx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setIsModalOpen(false); setEditingTransaction(null);
    addNotification({ type: "success", icon: tx.type === "income" ? "💰" : "💸", title: `${tx.type === "income" ? "Pemasukan" : "Pengeluaran"} Dicatat!`, body: `${tx.category} — Rp ${tx.amount.toLocaleString("id-ID")}` });
    toast({ title: "✅ Transaksi ditambahkan!" });
  }, [toast, addNotification]);

  const handleUpdateTransaction = useCallback((tx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
    setIsModalOpen(false); setEditingTransaction(null);
    toast({ title: "✅ Transaksi diperbarui!" });
  }, [toast]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    const { error } = await createClient().from("transactions").delete().eq("id", id);
    if (error) { toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" }); return; }
    setTransactions(prev => prev.filter(t => t.id !== id));
    addNotification({ type: "info", icon: "🗑️", title: "Transaksi Dihapus", body: "Satu transaksi berhasil dihapus." });
    toast({ title: "🗑️ Transaksi dihapus!" });
  }, [toast, addNotification]);

  const handleEdit = useCallback((tx: Transaction) => { setEditingTransaction(tx); setIsModalOpen(true); }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await createClient().auth.signOut();
    router.push("/login"); router.refresh();
  };

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background flex flex-col w-full max-w-lg mx-auto relative app-shell">
      {/* TREK top header */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-30 px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border-default)", boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center neon-indigo flex-shrink-0">
            <span className="text-sm font-black text-white">F</span>
          </div>
          <span className="font-bold text-sm text-foreground tracking-tight">FinTrack</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Privacy toggle */}
          <motion.button whileTap={{ scale: 0.88 }} onClick={togglePrivacy}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors"
            title="Toggle privacy mode">
            {privacyMode ? <EyeOff className="w-4 h-4 text-rose-400" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
          </motion.button>
          {/* Theme toggle */}
          <motion.button whileTap={{ scale: 0.88 }} onClick={toggleTheme}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors">
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </motion.button>
          {/* Bell */}
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowNotif(!showNotif)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors relative">
            <Bell className="w-4 h-4 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </motion.button>
        </div>
      </header>

      <NotificationPanel isOpen={showNotif} onClose={() => setShowNotif(false)} />

      {/* Tab content */}
      <div className="flex-1 pt-14 pb-28 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <AnimatePresence mode="wait">
          {activeTab === "home" && <motion.div key="home" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}><HomeTab displayName={displayName} totalBalance={totalBalance} totalIncome={totalIncome} totalExpense={totalExpense} transactions={transactions} onEdit={handleEdit} onDelete={handleDeleteTransaction} /></motion.div>}
          {activeTab === "analytics" && <motion.div key="analytics" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}><AnalyticsTab transactions={transactions} /></motion.div>}
          {activeTab === "wallet" && <motion.div key="wallet" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}><WalletTab transactions={transactions} /></motion.div>}
          {activeTab === "debt" && <motion.div key="debt" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}><DebtTab userId={user.id} /></motion.div>}
          {activeTab === "ai" && <motion.div key="ai" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}><AITab transactions={transactions} displayName={displayName} /></motion.div>}
          {activeTab === "budget" && <motion.div key="budget" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}><BudgetTab userId={user.id} transactions={transactions} /></motion.div>}
          {activeTab === "bills" && <motion.div key="bills" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}><BillsTab userId={user.id} /></motion.div>}
          {activeTab === "goals" && <motion.div key="goals" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}><GoalsTab userId={user.id} /></motion.div>}
          {activeTab === "settings" && <motion.div key="settings" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}><SettingsTab user={user} transactions={transactions} userId={user.id} /></motion.div>}
          {activeTab === "profile" && <motion.div key="profile" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ duration: 0.15 }}><ProfileTab user={user} profile={profile} transactions={transactions} onLogout={handleLogout} isLoggingOut={isLoggingOut} displayName={displayName} /></motion.div>}
        </AnimatePresence>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onFABPress={() => { setEditingTransaction(null); setIsModalOpen(true); }} />
      <AddTransactionModal open={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} onAdd={handleAddTransaction} onUpdate={handleUpdateTransaction} userId={user.id} editingTransaction={editingTransaction} />
    </div>
  );
}

export default function DashboardClient(props: DashboardClientProps) {
  return (
    <NotificationProvider>
      <SettingsProvider userId={props.user.id}>
        <DashboardInner {...props} />
      </SettingsProvider>
    </NotificationProvider>
  );
}
