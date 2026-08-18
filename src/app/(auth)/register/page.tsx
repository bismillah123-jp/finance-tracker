"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password terlalu pendek", description: "Minimal 6 karakter", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await createClient().auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      toast({ title: "Registrasi gagal", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    toast({ title: "Akun berhasil dibuat!", description: "Silakan masuk." });
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-base)" }}>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ background: "var(--accent-green)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ background: "var(--accent-blue)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
            style={{ background: "var(--accent-blue)", boxShadow: "0 8px 24px rgba(59,130,246,0.4)" }}>
            <span className="text-2xl font-black text-white">F</span>
          </div>
          <h1 className="heading-lg mb-1">FinTrack</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Mulai perjalanan finansialmu</p>
        </div>

        <div className="card p-6">
          <h2 className="heading-md mb-6">Buat akun baru</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="input-label">Nama Lengkap</label>
              <input type="text" placeholder="John Doe" value={fullName}
                onChange={e => setFullName(e.target.value)} required
                className="input-field" />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input type="email" placeholder="nama@email.com" value={email}
                onChange={e => setEmail(e.target.value)} required autoComplete="email"
                className="input-field" />
            </div>
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Min. 6 karakter"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="new-password"
                  className="input-field pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-tertiary)" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Mendaftar...</> : "Buat Akun"}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "var(--text-secondary)" }}>
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "var(--accent-blue)" }}>
              Masuk di sini
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
