"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import type { Transaction, Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/sidebar";
import StatsCards from "@/components/dashboard/stats-cards";
import TransactionChart from "@/components/dashboard/transaction-chart";
import TransactionList from "@/components/dashboard/transaction-list";
import AddTransactionModal from "@/components/dashboard/add-transaction-modal";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Menu, X } from "lucide-react";

interface DashboardClientProps {
  user: User;
  profile: Profile | null;
  initialTransactions: Transaction[];
}

export default function DashboardClient({ user, profile, initialTransactions }: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter((t) => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalIncome = monthlyTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthlyTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalBalance = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) -
    transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const handleAddTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setIsModalOpen(false);
    setEditingTransaction(null);
    toast({ title: "Transaksi ditambahkan!", description: `${tx.type === "income" ? "Pemasukan" : "Pengeluaran"} berhasil dicatat.` });
  }, [toast]);

  const handleUpdateTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
    setIsModalOpen(false);
    setEditingTransaction(null);
    toast({ title: "Transaksi diperbarui!" });
  }, [toast]);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Transaksi dihapus!" });
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
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        displayName={displayName}
        email={user.email || ""}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 glass border-b border-border px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-white">Dashboard</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Selamat datang, {displayName} 👋
                </p>
              </div>
            </div>
            <Button
              onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah Transaksi</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto scrollbar-hide">
          {/* Stats */}
          <StatsCards
            totalBalance={totalBalance}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
          />

          {/* Chart + Recent transactions */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <TransactionChart transactions={transactions} />
            </div>
            <div className="xl:col-span-1">
              <TransactionList
                transactions={transactions.slice(0, 8)}
                onEdit={handleEdit}
                onDelete={handleDeleteTransaction}
                compact
              />
            </div>
          </div>

          {/* Full transaction list */}
          <TransactionList
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={handleDeleteTransaction}
          />
        </main>
      </div>

      {/* Add/Edit Transaction Modal */}
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
