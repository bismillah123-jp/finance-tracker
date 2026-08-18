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
  { id: "ai" as TabType, icon: Brain, label: "AI" },
  { id: "profile" as TabType, icon: User, label: "Profil" },
];

export default function BottomNav({ activeTab, onTabChange, onFABPress }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 trek-nav">
      <div className="flex items-end justify-around px-2"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
        {LEFT_TABS.map(tab => <NavBtn key={tab.id} tab={tab} isActive={activeTab === tab.id} onPress={() => onTabChange(tab.id)} />)}

        {/* TREK-style FAB — elevated center */}
        <div className="flex flex-col items-center pb-1">
          <motion.button
            whileTap={{ scale: 0.86 }}
            whileHover={{ scale: 1.06 }}
            onClick={onFABPress}
            className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center -mt-7 border-[3px] border-background"
            style={{ boxShadow: "0 8px 24px rgba(99,102,241,0.5), 0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <Plus className="w-6 h-6 text-white" />
          </motion.button>
          <span className="text-[9px] text-muted-foreground mt-0.5 font-medium">Tambah</span>
        </div>

        {RIGHT_TABS.map(tab => <NavBtn key={tab.id} tab={tab} isActive={activeTab === tab.id} onPress={() => onTabChange(tab.id)} />)}
      </div>
    </div>
  );
}

function NavBtn({ tab, isActive, onPress }: { tab: { id: TabType; icon: React.ElementType; label: string }; isActive: boolean; onPress: () => void }) {
  return (
    <button onClick={onPress} className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1 relative min-w-0">
      {isActive && (
        <motion.div layoutId="nav-active"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-indigo-500" />
      )}
      <tab.icon className={cn("w-5 h-5 transition-colors duration-150",
        isActive ? "text-indigo-500" : "text-muted-foreground"
      )} />
      <span className={cn("text-[9px] font-semibold transition-colors duration-150 truncate",
        isActive ? "text-indigo-500" : "text-muted-foreground"
      )}>{tab.label}</span>
    </button>
  );
}
