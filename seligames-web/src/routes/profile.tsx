import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Lock, Mail, Phone, AtSign, User as UserIcon, Music, KeyRound } from 'lucide-react'
import api from '@/lib/api'

export const Route = createFileRoute('/profile')({
    component: ProfilePage,
})

function ProfilePage() {
    const [user, setUser] = useState<any>(null)
    const [form, setForm] = useState<any>({ username: '', fullName: '', tiktokUsername: '', phoneNumber: '' })
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
    const [msg, setMsg] = useState('')
    const [err, setErr] = useState('')

    useEffect(() => {
        api.get('/auth/profile').then((r) => {
            setUser(r.data)
            setForm({
                username: r.data.username || '',
                fullName: r.data.fullName || '',
                tiktokUsername: r.data.tiktokUsername || '',
                phoneNumber: r.data.phoneNumber || '',
            })
        }).catch(() => {})
    }, [])

    async function saveProfile(e: React.FormEvent) {
        e.preventDefault(); setMsg(''); setErr('')
        try {
            const r = await api.post('/auth/profile', form)
            setMsg('Profil güncellendi.')
            setUser(r.data?.user || user)
        } catch (e: any) { setErr(e.response?.data?.error || 'Hata') }
    }

    async function changePassword(e: React.FormEvent) {
        e.preventDefault(); setMsg(''); setErr('')
        if (pw.next !== pw.confirm) return setErr('Şifreler eşleşmiyor')
        if (pw.next.length < 6) return setErr('Yeni şifre en az 6 karakter olmalı')
        try {
            await api.post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.next })
            setMsg('Şifre güncellendi.')
            setPw({ current: '', next: '', confirm: '' })
        } catch (e: any) { setErr(e.response?.data?.error || 'Hata') }
    }

    return (
        <div className="p-6 sm:p-8 max-w-4xl mx-auto">
            <h1 className="font-heading text-3xl sm:text-4xl font-black mb-1">Profil <span className="text-gaming-gradient">Bilgileri</span></h1>
            <p className="text-white/60 mb-8">Bilgilerini güncelle, şifreni değiştir.</p>

            {(msg || err) && (
                <div className={`rounded-lg px-4 py-3 text-sm mb-5 ${msg ? 'bg-neon-green/10 border border-neon-green/30 text-neon-green' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
                    {msg || err}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-5">
                {/* Avatar card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border border-white/10 p-6 text-center">
                    <div className="w-24 h-24 mx-auto rounded-full bg-gaming-gradient flex items-center justify-center text-4xl font-black text-black mb-3 shadow-2xl shadow-neon-green/30">
                        {(user?.username || user?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="font-bold text-lg">{user?.username || '—'}</div>
                    <div className="text-xs text-white/50 mt-1">{user?.email}</div>
                    <div className="mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] font-black tracking-widest">
                        {(user?.subscriptionPlan || 'free').toUpperCase()}
                    </div>
                </motion.div>

                {/* Forms */}
                <div className="lg:col-span-2 space-y-5">
                    <form onSubmit={saveProfile} className="rounded-2xl bg-card border border-white/10 p-6">
                        <h2 className="font-heading text-lg font-black mb-4 flex items-center gap-2"><UserIcon size={18} className="text-neon-green" /> Hesap Bilgileri</h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field icon={<UserIcon size={16} />} label="Kullanıcı Adı" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
                            <Field icon={<UserIcon size={16} />} label="Tam Ad" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
                            <Field icon={<AtSign size={16} />} label="TikTok Kullanıcı Adı" value={form.tiktokUsername} onChange={(v) => setForm({ ...form, tiktokUsername: v })} />
                            <Field icon={<Phone size={16} />} label="Telefon" value={form.phoneNumber} onChange={(v) => setForm({ ...form, phoneNumber: v })} />
                            <Field icon={<Mail size={16} />} label="E-posta (değiştirilemez)" value={user?.email || ''} onChange={() => {}} disabled />
                        </div>
                        <button type="submit" className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gaming-gradient text-black font-bold text-sm hover:scale-[1.02] transition-all">
                            <Save size={16} /> Kaydet
                        </button>
                    </form>

                    <form onSubmit={changePassword} className="rounded-2xl bg-card border border-white/10 p-6">
                        <h2 className="font-heading text-lg font-black mb-4 flex items-center gap-2"><KeyRound size={18} className="text-neon-purple" /> Şifre Değiştir</h2>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <Field icon={<Lock size={16} />} label="Mevcut Şifre" type="password" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} />
                            <Field icon={<Lock size={16} />} label="Yeni Şifre" type="password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} />
                            <Field icon={<Lock size={16} />} label="Yeni Şifre (tekrar)" type="password" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} />
                        </div>
                        <button type="submit" className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-neon-purple text-white font-bold text-sm hover:scale-[1.02] transition-all">
                            <Save size={16} /> Şifreyi Değiştir
                        </button>
                    </form>

                    <div className="rounded-2xl bg-card border border-white/10 p-6">
                        <h2 className="font-heading text-lg font-black mb-4 flex items-center gap-2"><Music size={18} className="text-neon-blue" /> Yayın Tercihleri</h2>
                        <p className="text-sm text-white/60">
                            Hediye sesleri, overlay temaları ve mod ayarları masaüstü uygulamasından düzenlenir.
                            <a href="/download" className="text-neon-green hover:underline ml-1">İndir</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Field({ icon, label, value, onChange, type = 'text', disabled }: any) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-1.5">{label}</label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">{icon}</div>
                <input
                    type={type} value={value} disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-input border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-neon-green/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                />
            </div>
        </div>
    )
}
