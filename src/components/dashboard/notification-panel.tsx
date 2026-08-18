"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCheck, Trash2, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useNotifications, type AppNotification } from "@/contexts/notification-context";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig = {
  success: { color: "var(--accent-green)",   bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)"  },
  warning: { color: "var(--accent-orange)",  bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  error:   { color: "var(--accent-red)",     bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.2)"   },
  info:    { color: "var(--accent-blue)",    bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)"  },
};

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — FIX: proper z-index and click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />

          {/* Panel — FIX: constrained width, no overflow */}
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed z-50 rounded-2xl overflow-hidden"
            style={{
              top: "60px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(360px, calc(100vw - 2rem))",
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-default)" }}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" style={{ color: "var(--accent-blue)" }} />
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Notifikasi</span>
                {unreadCount > 0 && (
                  <span className="pill pill-blue text-[10px]">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllRead}
                    className="app-bar-icon" title="Tandai semua dibaca">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll}
                    className="app-bar-icon" title="Hapus semua"
                    onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-red)"}
                    onMouseLeave={(e) => e.currentTarget.style.color = ""}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={onClose} className="app-bar-icon">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: "60vh" }}>
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "var(--text-secondary)" }} />
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Belum ada notifikasi</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((n) => {
                    const cfg = typeConfig[n.type];
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        onClick={() => markRead(n.id)}
                        className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
                        style={{
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          opacity: n.read ? 0.65 : 1,
                        }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base"
                          style={{ background: cfg.bg }}>
                          {n.icon || "🔔"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                              {n.title}
                            </p>
                            {!n.read && (
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: cfg.color }} />
                            )}
                          </div>
                          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {n.body}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                            {n.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
