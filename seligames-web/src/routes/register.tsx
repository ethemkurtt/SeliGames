import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/api'

export const Route = createFileRoute('/register')({
    component: RegisterPage,
})

function RegisterPage() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (password.length < 6) return setError('Şifre en az 6 karakter olmalı')
        if (password !== confirm) return setError('Şifreler eşleşmiyor')
        setLoading(true)
        try {
            await api.post('/auth/register', { username, email, password })
            const r = await api.post('/auth/login', { email, password })
            login(r.data.token, r.data.user)
            navigate({ to: '/dashboard' })
        } catch (err: any) {
            setError(err.response?.data?.error || 'Kayıt başarısız')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem-1px)] flex items-center justify-center px-4 py-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="font-heading text-3xl font-black mb-2">Hesap <span className="text-gaming-gradient">Oluştur</span></h1>
                    <p className="text-sm text-white/60">5 dakikada kayıt ol, hemen başla</p>
                </div>

                <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-white/10 p-8 shadow-2xl shadow-black/40">
                    <form onSubmit={submit} className="space-y-4">
                        {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-300">{error}</div>}

                        <Field icon={<UserIcon size={18} />} label="Kullanıcı Adı" type="text" value={username} onChange={setUsername} placeholder="kullanici123" required autoFocus />
                        <Field icon={<Mail size={18} />} label="E-posta" type="email" value={email} onChange={setEmail} placeholder="ornek@email.com" required />
                        <Field icon={<Lock size={18} />} label="Şifre" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
                        <Field icon={<Lock size={18} />} label="Şifre Tekrar" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" required />

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <Bullet ok={password.length >= 6}>En az 6 karakter</Bullet>
                            <Bullet ok={password.length > 0 && password === confirm}>Şifreler eşleşiyor</Bullet>
                        </div>

                        <p className="text-xs text-white/50 leading-relaxed pt-1">
                            Üye olarak <a className="text-neon-green hover:underline">Hizmet Şartları</a>'nı ve{' '}
                            <a className="text-neon-green hover:underline">Gizlilik Politikası</a>'nı kabul etmiş olursun.
                        </p>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gaming-gradient text-black font-bold text-base shadow-lg shadow-neon-green/30 hover:shadow-neon-green/50 hover:scale-[1.02] transition-all disabled:opacity-60"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (<>Üye Ol <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} /></>)}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10 text-center">
                        <p className="text-sm text-white/60">
                            Zaten hesabın var mı? <Link to="/login" className="text-neon-green font-bold hover:underline">Giriş Yap</Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

function Field({ icon, label, type, value, onChange, placeholder, required, autoFocus }: any) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">{label}</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{icon}</div>
                <input
                    type={type} value={value} onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder} required={required} autoFocus={autoFocus}
                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-input border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-neon-green/40 focus:border-neon-green/50 transition-all"
                />
            </div>
        </div>
    )
}

function Bullet({ ok, children }: { ok: boolean; children: React.ReactNode }) {
    return (
        <div className={`flex items-center gap-1.5 text-xs ${ok ? 'text-neon-green' : 'text-white/40'}`}>
            <Check size={14} className={ok ? '' : 'opacity-30'} /> {children}
        </div>
    )
}
