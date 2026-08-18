"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCheck, Trash2, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useNotifications, type AppNotification } from "@/contexts/notification-context";
import { cn } from "@/lib/utils";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig = {
  success: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  error: { icon: X, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  info: { icon: Info, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
};

function NotifItem({ notif, onRead }: { notif: AppNotification; onRead: (id: string) => void }) {
  const cfg = typeConfig[notif.type];
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      onClick={() => onRead(notif.id)}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
        cfg.bg, cfg.border,
        !notif.read && "ring-1 ring-inset ring-white/5"
      )}
    >
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", cfg.bg)}>
        {notif.icon ? (
          <span className="text-base leading-none">{notif.icon}</span>
        ) : (
          <Icon className={cn("w-4 h-4", cfg.color)} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-xs font-semibold truncate", notif.read ? "text-muted-foreground" : "text-foreground")}>
            {notif.title}
          </p>
          {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{notif.body}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {notif.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </motion.div>
  );
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel — FIX: right-4 + max-w to prevent overflow on small screens */}
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="fixed top-14 right-4 left-4 max-w-sm mx-auto z-50 glass rounded-2xl border border-border shadow-2xl overflow-hidden"
            style={{ maxWidth: "min(360px, calc(100vw - 2rem))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-foreground">Notifikasi</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    title="Tandai semua dibaca">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll}
                    className="p-1.5 rounded-lg hover:bg-rose-600/20 transition-colors text-muted-foreground hover:text-rose-400"
                    title="Hapus semua">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto scrollbar-hide p-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">Belum ada notifikasi</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((n) => (
                    <NotifItem key={n.id} notif={n} onRead={markRead} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
