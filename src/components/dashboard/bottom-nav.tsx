"use client";

import { motion } from "framer-motion";
import { Home, BarChart2, Wallet, User, Users, Brain } from "lucide-react";
import type { TabType } from "@/components/dashboard/dashboard-client";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: "home" as TabType, icon: Home, label: "Home" },
  { id: "analytics" as TabType, icon: BarChart2, label: "Analitik" },
  { id: "debt" as TabType, icon: Users, label: "Hutang" },
  { id: "ai" as TabType, icon: Brain, label: "AI" },
  { id: "profile" as TabType, icon: User, label: "Profil" },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 glass border-t border-border safe-bottom">
      <div className="flex items-center justify-around px-1 pt-2 pb-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-1 relative min-w-0"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-indigo-500"
                />
              )}
              <tab.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-indigo-400" : "text-muted-foreground")} />
              <span className={cn("text-[9px] font-medium transition-colors truncate", isActive ? "text-indigo-400" : "text-muted-foreground")}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
