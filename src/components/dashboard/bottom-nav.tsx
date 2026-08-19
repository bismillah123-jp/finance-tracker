"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, BarChart2, Wallet, Plus, MessageCircle, MoreHorizontal, Target, Receipt, Star, Users, Brain, Settings, X } from "lucide-react";
import type { TabType } from "@/components/dashboard/dashboard-client";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onFABPress: () => void;
}

const MAIN_TABS = [
  { id: "home"      as TabType, icon: Home,          label: "Home"    },
  { id: "analytics" as TabType, icon: BarChart2,      label: "Analitik"},
  // FAB center
  { id: "wallets"   as TabType, icon: Wallet,         label: "Dompet"  },
  { id: "shania"    as TabType, icon: MessageCircle,  label: "ShanIA"  },
];

const MORE_TABS = [
  { id: "budget"   as TabType, icon: Target,   label: "Budget"    },
  { id: "bills"    as TabType, icon: Receipt,  label: "Tagihan"   },
  { id: "goals"    as TabType, icon: Star,     label: "Impian"    },
  { id: "debt"     as TabType, icon: Users,    label: "Hutang"    },
  { id: "settings" as TabType, icon: Settings, label: "Pengaturan"},
];

export default function BottomNav({ activeTab, onTabChange, onFABPress }: BottomNavProps) {
  const [showMore, setShowMore] = useState(false);
  const isMoreActive = MORE_TABS.some(t => t.id === activeTab);

  function handleMoreTabClick(id: TabType) {
    onTabChange(id);
    setShowMore(false);
  }

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="fixed z-40 rounded-2xl overflow-hidden"
              style={{
                bottom: "72px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(300px, calc(100vw - 2rem))",
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <div className="p-3 grid grid-cols-3 gap-2">
                {MORE_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleMoreTabClick(tab.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors"
                    style={{
                      background: activeTab === tab.id ? "rgba(59,130,246,0.1)" : "var(--bg-secondary)",
                      color: activeTab === tab.id ? "var(--accent-blue)" : "var(--text-secondary)",
                    }}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">{tab.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav className="bottom-nav">
        {/* Left 2 tabs */}
        {MAIN_TABS.slice(0, 2).map(tab => (
          <NavItem key={tab.id} tab={tab} isActive={activeTab === tab.id} onPress={() => onTabChange(tab.id)} />
        ))}

        {/* FAB center */}
        <div className="flex flex-col items-center">
          <motion.button whileTap={{ scale: 0.88 }} onClick={onFABPress} className="fab">
            <Plus className="w-5 h-5 text-white" />
          </motion.button>
          <span className="text-[9px] font-semibold mt-1" style={{ color: "var(--text-tertiary)" }}>Tambah</span>
        </div>

        {/* Right 2 tabs */}
        {MAIN_TABS.slice(2).map(tab => (
          <NavItem key={tab.id} tab={tab} isActive={activeTab === tab.id} onPress={() => onTabChange(tab.id)} />
        ))}

        {/* More button */}
        <button className="nav-item" onClick={() => setShowMore(!showMore)}>
          {(isMoreActive || showMore) && (
            <motion.div layoutId="nav-indicator" className="nav-item-active-dot" />
          )}
          {showMore
            ? <X className="w-5 h-5" style={{ color: "var(--accent-blue)" }} />
            : <MoreHorizontal className="w-5 h-5" style={{ color: isMoreActive ? "var(--accent-blue)" : "var(--text-tertiary)" }} />
          }
          <span className="nav-item-label" style={{ color: isMoreActive || showMore ? "var(--accent-blue)" : "var(--text-tertiary)" }}>
            Lainnya
          </span>
        </button>
      </nav>
    </>
  );
}

function NavItem({ tab, isActive, onPress }: {
  tab: { id: TabType; icon: React.ElementType; label: string };
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <button className="nav-item" onClick={onPress}>
      {isActive && <motion.div layoutId="nav-indicator" className="nav-item-active-dot" />}
      <tab.icon className="w-5 h-5 transition-colors duration-150"
        style={{ color: isActive ? "var(--accent-blue)" : "var(--text-tertiary)" }} />
      <span className="nav-item-label"
        style={{ color: isActive ? "var(--accent-blue)" : "var(--text-tertiary)" }}>
        {tab.label}
      </span>
    </button>
  );
}
