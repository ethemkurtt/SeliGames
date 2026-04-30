import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Gamepad2, CreditCard, ArrowRight, Activity, Trophy, Heart, Gift } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/api'

export const Route = createFileRoute('/dashboard')({
    component: DashboardPage,
})

function DashboardPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)

    useEffect(() => {
        api.get('/auth/profile').then((r) => setProfile(r.data)).catch(() => {})
        api.get('/events/stats').then((r) => setStats(r.data)).catch(() => {})
    }, [])

    const plan = profile?.subscriptionPlan || 'free'
    const planName = ({ free: 'Ücretsiz', basic: 'Basic', pro: 'Pro', ultra: 'Ultra' } as any)[plan] || 'Ücretsiz'

    return (
        <div className="p-6 sm:p-8 max-w-6xl mx-auto">
            {/* Welcome */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="font-heading text-3xl sm:text-4xl font-black">
                    Hoş geldin, <span className="text-gaming-gradient">{user?.username || user?.email?.split('@')[0]}</span>
                </h1>
                <p className="text-white/60 mt-1">Yayın komuta merkezin burada.</p>
            </motion.div>

            {/* Top tiles */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Tile icon={<Gift />} label="Toplam Hediye" value={stats?.gift?.totalGiftCount || stats?.gift?.count || 0} accent="pink" />
                <Tile icon={<Heart />} label="Toplam Beğeni" value={stats?.like?.totalLikes || stats?.like?.count || 0} accent="cyan" />
                <Tile icon={<Trophy />} label="Toplam Elmas" value={stats?.gift?.totalDiamonds || 0} accent="yellow" />
                <Tile icon={<Activity />} label="Toplam Event" value={Object.values(stats || {}).reduce((s: number, x: any) => s + (x?.count || 0), 0)} accent="green" />
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
                {/* Subscription card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-br from-neon-green/10 to-neon-blue/10 border border-white/10 p-6 lg:col-span-2">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Mevcut Planın</div>
                            <div className="font-heading text-3xl font-black text-gaming-gradient">{planName}</div>
                            <div className="text-sm text-white/60 mt-1">
                                Durum: <span className={profile?.subscriptionStatus === 'active' ? 'text-neon-green font-bold' : 'text-amber-400 font-bold'}>
                                    {profile?.subscriptionStatus || 'free'}
                                </span>
                            </div>
                        </div>
                        <CreditCard className="text-neon-green" size={28} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-6">
                        <Link to="/subscription" className="px-5 py-2.5 rounded-lg bg-gaming-gradient text-black font-bold text-sm hover:scale-[1.02] transition-all">
                            Aboneliği Yönet
                        </Link>
                        {plan === 'free' && (
                            <Link to="/pricing" className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all">
                                Yükselt
                            </Link>
                        )}
                    </div>
                </motion.div>

                {/* Quick actions */}
                <div className="space-y-3">
                    <QuickAction to="/download" icon={<Download size={18} />} label="Uygulamayı İndir" desc="Masaüstü versiyonu" />
                    <QuickAction to="/mods" icon={<Gamepad2 size={18} />} label="Mod Kütüphanesi" desc="10+ oyun" />
                    <QuickAction to="/profile" icon={<ArrowRight size={18} />} label="Profilim" desc="Bilgilerini güncelle" />
                </div>
            </div>

            {/* Recent activity placeholder */}
            <div className="mt-8 rounded-2xl bg-card border border-white/10 p-6">
                <h2 className="font-heading text-xl font-black mb-4 flex items-center gap-2">
                    <Activity size={20} className="text-neon-green" /> Son Aktivite
                </h2>
                <p className="text-sm text-white/50">
                    Yayınlarındaki son hediye, beğeni ve takip etkinlikleri burada görünecek. Henüz yayın yapmadıysan
                    <Link to="/download" className="text-neon-green hover:underline ml-1">uygulamayı indir</Link> ve TikTok Live'a bağlan.
                </p>
            </div>
        </div>
    )
}

function Tile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent: 'green' | 'cyan' | 'yellow' | 'pink' }) {
    const accents: any = {
        green: 'from-neon-green/20 to-transparent border-neon-green/30 text-neon-green',
        cyan: 'from-neon-blue/20 to-transparent border-neon-blue/30 text-neon-blue',
        yellow: 'from-neon-yellow/20 to-transparent border-neon-yellow/30 text-neon-yellow',
        pink: 'from-neon-pink/20 to-transparent border-neon-pink/30 text-neon-pink',
    }
    return (
        <motion.div whileHover={{ y: -4 }} className={`rounded-xl bg-gradient-to-br ${accents[accent]} border bg-card p-5`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${accents[accent].split(' ').slice(-1)[0]}`} style={{ background: 'rgba(255,255,255,0.04)' }}>
                {icon}
            </div>
            <div className="text-2xl font-black">{Number(value).toLocaleString('tr-TR')}</div>
            <div className="text-xs text-white/60 uppercase tracking-widest mt-1 font-semibold">{label}</div>
        </motion.div>
    )
}

function QuickAction({ to, icon, label, desc }: { to: string; icon: React.ReactNode; label: string; desc: string }) {
    return (
        <Link to={to} className="block rounded-xl bg-card border border-white/10 hover:border-neon-green/40 hover:bg-white/5 p-4 transition-all group">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neon-green/10 text-neon-green flex items-center justify-center">{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{label}</div>
                    <div className="text-xs text-white/50">{desc}</div>
                </div>
                <ArrowRight size={16} className="text-white/40 group-hover:text-neon-green group-hover:translate-x-1 transition-all" />
            </div>
        </Link>
    )
}
