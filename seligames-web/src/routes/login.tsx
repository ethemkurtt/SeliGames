import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/api'

type LoginSearch = { redirect?: string }

export const Route = createFileRoute('/login')({
    component: LoginPage,
    validateSearch: (s): LoginSearch => ({ redirect: typeof s.redirect === 'string' ? s.redirect : undefined }),
})

function LoginPage() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const search = Route.useSearch()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const r = await api.post('/auth/login', { email, password })
            login(r.data.token, r.data.user)
            navigate({ to: (search.redirect || '/dashboard') as any })
        } catch (err: any) {
            setError(err.response?.data?.error || 'Giriş başarısız')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem-1px)] flex items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="font-heading text-3xl font-black mb-2">Hoş Geldin <span className="text-gaming-gradient">Tekrar</span></h1>
                    <p className="text-sm text-white/60">Hesabına giriş yap ve yayına devam et</p>
                </div>

                <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-white/10 p-8 shadow-2xl shadow-black/40">
                    <form onSubmit={submit} className="space-y-4">
                        {error && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        <Field
                            icon={<Mail size={18} />}
                            label="E-posta"
                            type="email"
                            value={email}
                            onChange={setEmail}
                            placeholder="ornek@email.com"
                            required
                            autoFocus
                        />
                        <Field
                            icon={<Lock size={18} />}
                            label="Şifre"
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="••••••••"
                            required
                        />

                        <div className="flex items-center justify-between text-sm pt-1">
                            <label className="flex items-center gap-2 text-white/60 cursor-pointer">
                                <input type="checkbox" className="accent-neon-green" /> Beni hatırla
                            </label>
                            <Link to="/forgot-password" className="text-neon-green hover:underline font-semibold">
                                Şifremi Unuttum
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gaming-gradient text-black font-bold text-base shadow-lg shadow-neon-green/30 hover:shadow-neon-green/50 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                <>Giriş Yap <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10 text-center">
                        <p className="text-sm text-white/60">
                            Hesabın yok mu?{' '}
                            <Link to="/register" className="text-neon-green font-bold hover:underline">Üye Ol</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

function Field({ icon, label, type, value, onChange, placeholder, required, autoFocus }: {
    icon: React.ReactNode; label: string; type: string; value: string; onChange: (v: string) => void;
    placeholder?: string; required?: boolean; autoFocus?: boolean;
}) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">{label}</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{icon}</div>
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    autoFocus={autoFocus}
                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-input border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-neon-green/40 focus:border-neon-green/50 transition-all"
                />
            </div>
        </div>
    )
}
