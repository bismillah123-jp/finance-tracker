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
import { Menu, Bell, Sun, Moon, Eye, EyeOff, RefreshCw, LogOut } from "lucide-react";

interface DashboardClientProps {
  user: User;
  profile: Profile | null;
  initialTransactions: Transaction[];
}

export type TabType = "home" | "analytics" | "wallet" | "debt" | "ai" | "profile" | "budget" | "bills" | "goals" | "settings";

const TAB_TITLES: Record<TabType, string> = {
  home: "Dashboard Utama",
  analytics: "Analitik",
  wallet: "Dompet",
  debt: "Hutang & Piutang",
  ai: "AI Insights",
  profile: "Profil",
  budget: "Budget",
  bills: "Tagihan",
  goals: "Impian & Tabungan",
  settings: "Pengaturan",
};

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
    <div className="min-h-screen bg-background flex flex-col w-full max-w-[480px] mx-auto relative app-shell">

      {/* TOP APP BAR */}
      <header className="app-bar">
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-blue)" }}>
            <span className="text-xs font-black text-white">F</span>
          </div>
        </div>

        {/* Center: Page title */}
        <span className="app-bar-title absolute left-1/2 -translate-x-1/2">
          {TAB_TITLES[activeTab]}
        </span>

        {/* Right: Action icons */}
        <div className="flex items-center gap-0.5 flex-1 justify-end">
          <button className="app-bar-icon" onClick={togglePrivacy} title="Sembunyikan saldo">
            {privacyMode ? <EyeOff className="w-4 h-4 text-rose-400" /> : <Eye className="w-4 h-4" />}
          </button>
          <button className="app-bar-icon" onClick={toggleTheme} title="Toggle dark mode">
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <button className="app-bar-icon relative" onClick={() => setShowNotif(!showNotif)} title="Notifikasi">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: "var(--accent-red)" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button className="app-bar-icon" onClick={handleLogout} disabled={isLoggingOut} title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <NotificationPanel isOpen={showNotif} onClose={() => setShowNotif(false)} />

      {/* CONTENT */}
      <div className="flex-1 pt-14 pb-24 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <AnimatePresence mode="wait">
          {activeTab === "home"     && <FadeSlide k="home"><HomeTab displayName={displayName} totalBalance={totalBalance} totalIncome={totalIncome} totalExpense={totalExpense} transactions={transactions} onEdit={handleEdit} onDelete={handleDeleteTransaction} /></FadeSlide>}
          {activeTab === "analytics"&& <FadeSlide k="analytics"><AnalyticsTab transactions={transactions} /></FadeSlide>}
          {activeTab === "wallet"   && <FadeSlide k="wallet"><WalletTab transactions={transactions} /></FadeSlide>}
          {activeTab === "debt"     && <FadeSlide k="debt"><DebtTab userId={user.id} /></FadeSlide>}
          {activeTab === "ai"       && <FadeSlide k="ai"><AITab transactions={transactions} displayName={displayName} /></FadeSlide>}
          {activeTab === "budget"   && <FadeSlide k="budget"><BudgetTab userId={user.id} transactions={transactions} /></FadeSlide>}
          {activeTab === "bills"    && <FadeSlide k="bills"><BillsTab userId={user.id} /></FadeSlide>}
          {activeTab === "goals"    && <FadeSlide k="goals"><GoalsTab userId={user.id} /></FadeSlide>}
          {activeTab === "settings" && <FadeSlide k="settings"><SettingsTab user={user} transactions={transactions} userId={user.id} /></FadeSlide>}
          {activeTab === "profile"  && <FadeSlide k="profile"><ProfileTab user={user} profile={profile} transactions={transactions} onLogout={handleLogout} isLoggingOut={isLoggingOut} displayName={displayName} /></FadeSlide>}
        </AnimatePresence>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onFABPress={() => { setEditingTransaction(null); setIsModalOpen(true); }} />
      <AddTransactionModal open={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} onAdd={handleAddTransaction} onUpdate={handleUpdateTransaction} userId={user.id} editingTransaction={editingTransaction} />
    </div>
  );
}

function FadeSlide({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
      {children}
    </motion.div>
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
