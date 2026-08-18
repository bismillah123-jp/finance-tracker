"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import type { Transaction, Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import HomeTab from "@/components/dashboard/tabs/home-tab";
import AnalyticsTab from "@/components/dashboard/tabs/analytics-tab";
import WalletTab from "@/components/dashboard/tabs/wallet-tab";
import ProfileTab from "@/components/dashboard/tabs/profile-tab";
import AddTransactionModal from "@/components/dashboard/add-transaction-modal";
import BottomNav from "@/components/dashboard/bottom-nav";
import { Plus } from "lucide-react";

interface DashboardClientProps {
  user: User;
  profile: Profile | null;
  initialTransactions: Transaction[];
}

export type TabType = "home" | "analytics" | "wallet" | "profile";

export default function DashboardClient({ user, profile, initialTransactions }: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const totalBalance = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) -
    transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalIncome = monthlyTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthlyTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const handleAddTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setIsModalOpen(false);
    setEditingTransaction(null);
    toast({ title: "✅ Transaksi ditambahkan!" });
  }, [toast]);

  const handleUpdateTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
    setIsModalOpen(false);
    setEditingTransaction(null);
    toast({ title: "✅ Transaksi diperbarui!" });
  }, [toast]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "🗑️ Transaksi dihapus!" });
  }, [toast]);

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
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      {/* Tab Content */}
      <div className="flex-1 pb-24 overflow-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <HomeTab
                displayName={displayName}
                totalBalance={totalBalance}
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                transactions={transactions}
                onEdit={handleEdit}
                onDelete={handleDeleteTransaction}
              />
            </motion.div>
          )}
          {activeTab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <AnalyticsTab transactions={transactions} />
            </motion.div>
          )}
          {activeTab === "wallet" && (
            <motion.div key="wallet" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <WalletTab transactions={transactions} />
            </motion.div>
          )}
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <ProfileTab
                user={user}
                profile={profile}
                transactions={transactions}
                onLogout={handleLogout}
                isLoggingOut={isLoggingOut}
                displayName={displayName}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB Add Button */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50">
        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
          className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg neon-indigo"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

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
