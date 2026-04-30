import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Gamepad2, Download as DownloadIcon } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/mods')({
    component: ModsPage,
})

const categories = [
    { id: 'all', label: 'Tümü' },
    { id: 'open-world', label: 'Açık Dünya' },
    { id: 'fps', label: 'FPS' },
    { id: 'battle-royale', label: 'Battle Royale' },
    { id: 'moba', label: 'MOBA' },
    { id: 'sandbox', label: 'Sandbox' },
    { id: 'sports', label: 'Spor' },
    { id: 'party', label: 'Parti' },
]

function ModsPage() {
    const { isAuthenticated } = useAuth()
    const [mods, setMods] = useState<any[]>([])
    const [q, setQ] = useState('')
    const [cat, setCat] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/mods').then((r) => setMods(r.data || [])).finally(() => setLoading(false))
    }, [])

    const filtered = useMemo(() => {
        let list = [...mods]
        if (q.trim()) {
            const t = q.toLowerCase()
            list = list.filter((m) =>
                m.title?.toLowerCase().includes(t) ||
                m.gameTitle?.toLowerCase().includes(t) ||
                m.description?.toLowerCase().includes(t)
            )
        }
        if (cat !== 'all') list = list.filter((m) => m.category === cat)
        return list
    }, [mods, q, cat])

    return (
        <div>
            {/* Hero */}
            <section className="container mx-auto px-4 sm:px-6 pt-20 pb-10 text-center">
                <div className="inline-block px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] font-black tracking-widest mb-4">
                    MOD KÜTÜPHANESİ
                </div>
                <h1 className="font-heading text-4xl sm:text-6xl font-black leading-tight">
                    <span className="text-gaming-gradient">{mods.length}+</span> Oyun, Sınırsız Etkileşim
                </h1>
                <p className="mt-4 text-white/70 max-w-2xl mx-auto">
                    Her mod için hediye-aksiyon eşleştirmeleri yapılandırılmış. İndir, kur, yayında.
                </p>
            </section>

            {/* Filters */}
            <section className="container mx-auto px-4 sm:px-6 mb-8">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <input
                            value={q} onChange={(e) => setQ(e.target.value)}
                            placeholder="Oyun ara..."
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-input border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-neon-green/40"
                        />
                    </div>
                    <div className="text-sm text-white/60">{filtered.length} sonuç</div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                        <button
                            key={c.id} onClick={() => setCat(c.id)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all ${
                                cat === c.id
                                    ? 'bg-gaming-gradient text-black'
                                    : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Grid */}
            <section className="container mx-auto px-4 sm:px-6 pb-20">
                {loading ? (
                    <div className="text-center py-20 text-white/60">Yükleniyor…</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Gamepad2 className="mx-auto text-white/20 mb-3" size={48} />
                        <p className="text-white/60">Bu kriterlere uyan mod bulunamadı.</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map((m, i) => (
                            <motion.div
                                key={m._id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.04 }}
                                whileHover={{ y: -6 }}
                                className="rounded-2xl bg-card border border-white/10 overflow-hidden hover:border-neon-green/40 hover:shadow-2xl hover:shadow-neon-green/10 transition-all flex flex-col"
                            >
                                <div className="aspect-video bg-gradient-to-br from-white/5 to-black/30 relative overflow-hidden">
                                    {m.imageUrl && <img src={m.imageUrl} alt={m.title} className="w-full h-full object-cover" loading="lazy" />}
                                    <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur text-[10px] font-black tracking-widest text-neon-green border border-neon-green/30 uppercase">
                                        {m.category || 'Mod'}
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="text-xs text-white/50 font-semibold mb-1 tracking-wide">{m.gameTitle}</div>
                                    <h3 className="font-bold text-lg text-white mb-2">{m.title}</h3>
                                    <p className="text-sm text-white/60 leading-relaxed flex-1 mb-4 line-clamp-3">{m.description}</p>
                                    <div className="flex items-center justify-between text-xs text-white/50 mb-4">
                                        <span>v{m.version || '1.0.0'}</span>
                                        <span className="flex items-center gap-1"><DownloadIcon size={12} /> {m.downloadCount || 0}</span>
                                    </div>
                                    <Link
                                        to={isAuthenticated ? '/download' : '/login'}
                                        search={isAuthenticated ? undefined : ({ redirect: '/download' } as any)}
                                        className="block text-center py-2.5 rounded-lg bg-gaming-gradient text-black font-bold text-sm hover:scale-[1.02] transition-all"
                                    >
                                        {isAuthenticated ? 'Modu İndir' : 'Üye ol ve indir'}
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
