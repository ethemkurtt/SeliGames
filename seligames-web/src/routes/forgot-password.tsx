import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, Send } from 'lucide-react'

export const Route = createFileRoute('/forgot-password')({
    component: ForgotPage,
})

function ForgotPage() {
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)

    return (
        <div className="min-h-[calc(100vh-4rem-1px)] flex items-center justify-center px-4 py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <Link to="/login" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-neon-green mb-6">
                    <ArrowLeft size={16} /> Giriş'e dön
                </Link>

                <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-white/10 p-8 shadow-2xl shadow-black/40">
                    <h1 className="font-heading text-2xl font-black mb-2">Şifreni mi unuttun?</h1>
                    <p className="text-sm text-white/60 mb-6">E-posta adresini gir, sıfırlama bağlantısı gönderelim.</p>

                    {sent ? (
                        <div className="rounded-lg bg-neon-green/10 border border-neon-green/30 px-4 py-4 text-sm text-neon-green text-center">
                            ✉ Eğer <b>{email}</b> kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.
                        </div>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">E-posta</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                    <input
                                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 rounded-lg bg-input border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-neon-green/40"
                                        placeholder="ornek@email.com"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gaming-gradient text-black font-bold shadow-lg shadow-neon-green/30 hover:scale-[1.02] transition-all">
                                <Send size={18} /> Bağlantı Gönder
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
