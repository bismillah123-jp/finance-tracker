"use client";

import { motion } from "framer-motion";
import { Home, BarChart2, Users, Brain, User, Plus } from "lucide-react";
import type { TabType } from "@/components/dashboard/dashboard-client";
import { cn } from "@/lib/utils";

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
  { id: "debt" as TabType, icon: Users, label: "Hutang" },
  { id: "profile" as TabType, icon: User, label: "Profil" },
];

export default function BottomNav({ activeTab, onTabChange, onFABPress }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 glass border-t border-border">
      <div className="flex items-center justify-around px-2 pb-safe" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        {/* Left tabs */}
        {LEFT_TABS.map((tab) => (
          <NavButton key={tab.id} tab={tab} isActive={activeTab === tab.id} onPress={() => onTabChange(tab.id)} />
        ))}

        {/* FAB center */}
        <div className="flex flex-col items-center justify-center pt-2 pb-1">
          <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.06 }}
            onClick={onFABPress}
            className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg neon-indigo -mt-6 border-4 border-background"
          >
            <Plus className="w-6 h-6 text-white" />
          </motion.button>
          <span className="text-[9px] text-muted-foreground mt-0.5">Tambah</span>
        </div>

        {/* Right tabs */}
        {RIGHT_TABS.map((tab) => (
          <NavButton key={tab.id} tab={tab} isActive={activeTab === tab.id} onPress={() => onTabChange(tab.id)} />
        ))}
      </div>
    </div>
  );
}

function NavButton({ tab, isActive, onPress }: { tab: { id: TabType; icon: React.ElementType; label: string }; isActive: boolean; onPress: () => void }) {
  return (
    <button onClick={onPress} className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1 relative min-w-0">
      {isActive && (
        <motion.div layoutId="nav-indicator"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-indigo-500" />
      )}
      <tab.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-indigo-400" : "text-muted-foreground")} />
      <span className={cn("text-[9px] font-medium truncate transition-colors", isActive ? "text-indigo-400" : "text-muted-foreground")}>
        {tab.label}
      </span>
    </button>
  );
}
