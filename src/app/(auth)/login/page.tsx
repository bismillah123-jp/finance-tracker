"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login gagal", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-base)" }}>

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: "var(--accent-blue)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ background: "var(--accent-purple)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
            style={{ background: "var(--accent-blue)", boxShadow: "0 8px 24px rgba(59,130,246,0.4)" }}>
            <span className="text-2xl font-black text-white">F</span>
          </div>
          <h1 className="heading-lg mb-1">FinTrack</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Kelola keuangan kamu dengan cerdas</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="heading-md mb-6">Masuk ke akun</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="input-label">Email</label>
              <input type="email" placeholder="nama@email.com" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email"
                className="input-field" />
            </div>
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  className="input-field pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-tertiary)" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Masuk...</> : "Masuk"}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "var(--text-secondary)" }}>
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold" style={{ color: "var(--accent-blue)" }}>
              Daftar sekarang
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
