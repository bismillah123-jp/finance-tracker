"use client";

import { TrendingUp, LogOut, Home, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  email: string;
  onLogout: () => void;
  isLoggingOut: boolean;
}

export default function Sidebar({ isOpen, onClose, displayName, email, onLogout, isLoggingOut }: SidebarProps) {
  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 glass border-r border-border min-h-screen sticky top-0">
        <SidebarContent displayName={displayName} email={email} onLogout={onLogout} isLoggingOut={isLoggingOut} />
      </aside>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 glass border-r border-border flex flex-col transition-transform duration-300 lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent displayName={displayName} email={email} onLogout={onLogout} isLoggingOut={isLoggingOut} onClose={onClose} />
      </aside>
    </>
  );
}

function SidebarContent({
  displayName,
  email,
  onLogout,
  isLoggingOut,
  onClose,
}: {
  displayName: string;
  email: string;
  onLogout: () => void;
  isLoggingOut: boolean;
  onClose?: () => void;
}) {
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full p-5">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center neon-indigo">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">FinTrack</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors lg:hidden">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        <NavItem icon={Home} label="Dashboard" active />
        <NavItem icon={List} label="Transaksi" />
      </nav>

      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
            <span className="text-xs font-semibold text-indigo-400">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-rose-400 hover:bg-rose-600/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active }: { icon: React.ElementType; label: string; active?: boolean }) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
        active
          ? "bg-indigo-600/15 text-indigo-400 border border-indigo-600/20"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
