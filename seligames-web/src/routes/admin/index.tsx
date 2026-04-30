import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Boxes, Activity, CreditCard, ArrowRight, TrendingUp } from 'lucide-react'
import api from '@/lib/api'

export const Route = createFileRoute('/admin/')({
    component: AdminOverview,
})

function AdminOverview() {
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        api.get('/admin/stats').then((r) => setData(r.data)).catch(() => {})
    }, [])

    const t = data?.totals || {}
    const rev = data?.revenue || {}

    return (
        <div className="p-6 sm:p-10">
            <h1 className="font-heading text-3xl sm:text-4xl font-black mb-1">Admin <span className="text-neon-purple">Paneli</span></h1>
            <p className="text-white/60 mb-8">SeliGames yönetim merkezi</p>

            {/* Top KPIs */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KPI icon={<Users />} label="Kullanıcı" value={t.users || 0} accent="purple" link="/admin/users" />
                <KPI icon={<Boxes />} label="Mod" value={t.mods || 0} accent="green" link="/admin/mods" />
                <KPI icon={<CreditCard />} label="Aktif Abone" value={t.activeSubs || 0} accent="cyan" link="/admin/subscriptions" />
                <KPI icon={<TrendingUp />} label="Aylık Gelir" value={`₺${(rev.monthly || 0).toLocaleString('tr-TR')}`} accent="yellow" />
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
                {/* Recent users */}
                <Section title="Yeni Kullanıcılar" link="/admin/users">
                    {(data?.recentUsers || []).length === 0 ? <Empty>Henüz kullanıcı yok</Empty> : (
                        <div className="divide-y divide-white/5">
                            {(data?.recentUsers || []).map((u: any) => (
                                <div key={u._id} className="flex items-center gap-3 py-2.5">
                                    <div className="w-8 h-8 rounded-full bg-gaming-gradient flex items-center justify-center font-bold text-black text-sm">
                                        {(u.username || u.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold truncate">{u.username || '—'}</div>
                                        <div className="text-xs text-white/50 truncate">{u.email}</div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/60 uppercase">{u.subscriptionPlan || 'free'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                {/* Recent mods */}
                <Section title="Yeni Modlar" link="/admin/mods">
                    {(data?.recentMods || []).length === 0 ? <Empty>Henüz mod yok</Empty> : (
                        <div className="divide-y divide-white/5">
                            {(data?.recentMods || []).map((m: any) => (
                                <div key={m._id} className="flex items-center gap-3 py-2.5">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                                        {m.imageUrl && <img src={m.imageUrl} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold truncate">{m.title}</div>
                                        <div className="text-xs text-white/50 truncate">{m.gameTitle}</div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-neon-green/10 text-neon-green">{m.downloadCount || 0} indirme</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </div>
    )
}

function KPI({ icon, label, value, accent, link }: { icon: React.ReactNode; label: string; value: string | number; accent: string; link?: string }) {
    const accents: any = {
        purple: 'from-neon-purple/20 to-transparent border-neon-purple/30 text-neon-purple',
        green: 'from-neon-green/20 to-transparent border-neon-green/30 text-neon-green',
        cyan: 'from-neon-blue/20 to-transparent border-neon-blue/30 text-neon-blue',
        yellow: 'from-neon-yellow/20 to-transparent border-neon-yellow/30 text-neon-yellow',
    }
    const inner = (
        <motion.div whileHover={{ y: -4 }} className={`rounded-xl bg-gradient-to-br ${accents[accent]} bg-card border p-5`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3`} style={{ background: 'rgba(255,255,255,0.04)' }}>
                {icon}
            </div>
            <div className="text-2xl font-black">{typeof value === 'number' ? value.toLocaleString('tr-TR') : value}</div>
            <div className="text-xs text-white/60 uppercase tracking-widest mt-1 font-semibold">{label}</div>
        </motion.div>
    )
    return link ? <Link to={link}>{inner}</Link> : inner
}

function Section({ title, link, children }: { title: string; link?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl bg-card border border-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading text-lg font-black flex items-center gap-2"><Activity size={18} className="text-neon-purple" /> {title}</h2>
                {link && <Link to={link} className="text-xs text-neon-green font-semibold hover:underline flex items-center gap-1">Tümü <ArrowRight size={12} /></Link>}
            </div>
            {children}
        </div>
    )
}
function Empty({ children }: { children: React.ReactNode }) { return <div className="text-center py-8 text-white/50 text-sm">{children}</div> }
