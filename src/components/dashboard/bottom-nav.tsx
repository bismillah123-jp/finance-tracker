"use client";

import { motion } from "framer-motion";
import { Home, BarChart2, Wallet, User } from "lucide-react";
import type { TabType } from "@/components/dashboard/dashboard-client";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: "home" as TabType, icon: Home, label: "Home" },
  { id: "analytics" as TabType, icon: BarChart2, label: "Analytics" },
  { id: "wallet" as TabType, icon: Wallet, label: "Wallet" },
  { id: "profile" as TabType, icon: User, label: "Profile" },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 glass border-t border-border">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab, i) => {
          const isActive = activeTab === tab.id;
          const insertGap = i === 2; // gap for FAB
          return (
            <div key={tab.id} className={cn("flex-1", insertGap && "ml-14")}>
              <button
                onClick={() => onTabChange(tab.id)}
                className="w-full flex flex-col items-center gap-0.5 py-1.5 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-500"
                  />
                )}
                <tab.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-indigo-400" : "text-muted-foreground"
                  )}
                />
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-indigo-400" : "text-muted-foreground"
                )}>
                  {tab.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
