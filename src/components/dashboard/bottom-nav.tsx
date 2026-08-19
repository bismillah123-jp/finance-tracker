"use client";

import { motion } from "framer-motion";
import { Home, BarChart2, Wallet, Target, Settings, Plus } from "lucide-react";
import type { TabType } from "@/components/dashboard/dashboard-client";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onFABPress: () => void;
}

const LEFT_TABS = [
  { id: "home" as TabType, icon: Home, label: "Home" },
  { id: "analytics" as TabType, icon: BarChart2, label: "Analitik" },
];
const RIGHT_TABS = [
  { id: "budget" as TabType, icon: Target, label: "Budget" },
  { id: "settings" as TabType, icon: Settings, label: "Lainnya" },
];

export default function BottomNav({ activeTab, onTabChange, onFABPress }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {LEFT_TABS.map(tab => (
        <NavItem key={tab.id} tab={tab} isActive={activeTab === tab.id} onPress={() => onTabChange(tab.id)} />
      ))}

      {/* FAB center */}
      <div className="flex flex-col items-center">
        <motion.button whileTap={{ scale: 0.88 }} onClick={onFABPress} className="fab">
          <Plus className="w-5 h-5 text-white" />
        </motion.button>
        <span className="text-[9px] font-semibold mt-1" style={{ color: "var(--text-tertiary)" }}>Tambah</span>
      </div>

      {RIGHT_TABS.map(tab => (
        <NavItem key={tab.id} tab={tab} isActive={activeTab === tab.id} onPress={() => onTabChange(tab.id)} />
      ))}
    </nav>
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
