import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Gamepad2, Sparkles, Keyboard, Rocket, Globe } from 'lucide-react'
import api from '@/lib/api'

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
    { id: 'other', label: 'Diğer' },
]

// Resolve a possibly-relative imageUrl ("/uploads/mod-images/...") against
// the backend so img tags actually load. External https:// URLs unchanged.
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'
function resolveImg(url?: string, bust?: string | number) {
    if (!url) return ''
    let full = url
    if (!/^https?:\/\//i.test(url)) {
        full = url.startsWith('/') ? `${API_BASE}${url}` : ''
    }
    if (full && bust) {
        const b = typeof bust === 'string' ? new Date(bust).getTime() : bust
        if (b) full += (full.includes('?') ? '&' : '?') + 't=' + b
    }
    return full
}

function ModsPage() {
    const [mods, setMods] = useState<any[]>([])
    const [q, setQ] = useState('')
    const [cat, setCat] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/mods').then((r) => setMods(r.data || [])).finally(() => setLoading(false))
    }, [])

    const filtered = useMemo(() => {
        let list = [...mods].filter((m) => m.isActive !== false)
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
                    <span className="text-gaming-gradient">{mods.filter(m => m.isActive !== false).length}</span> Hazır Mod
                </h1>
                <p className="mt-4 text-white/70 max-w-2xl mx-auto">
                    Aşağıdaki modlar SeliGames uygulamasına entegre. Tek tıkla kur, hediye → tuş eşleştirmesi yap, yayında.<br />
                    <span className="text-neon-green font-semibold">İndirmek için önce uygulamayı kur — modlar uygulama içinden gelir.</span>
                </p>
            </section>

            {/* How it works strip */}
            <section className="container mx-auto px-4 sm:px-6 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InfoTile icon={<Rocket size={20} />} label="1 · Uygulamayı kur" desc="Windows .exe ya da macOS .dmg — ücretsiz." />
                    <InfoTile icon={<Gamepad2 size={20} />} label="2 · Modu seç & yükle" desc="Uygulama içinden hangi modu istersen oyun klasörüne otomatik açılır." />
                    <InfoTile icon={<Keyboard size={20} />} label="3 · Hediye → tuş" desc="Hangi hediye geldiğinde hangi oyun tuşu basılsın — sen belirle." />
                </div>
            </section>

            {/* Filters */}
            <section className="container mx-auto px-4 sm:px-6 mb-8">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <input
                            value={q} onChange={(e) => setQ(e.target.value)}
                            placeholder="Oyun ya da mod ara…"
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
                        {filtered.map((m, i) => {
                            const img = resolveImg(m.imageUrl, m.updatedAt)
                            const giftCount = m.config?.giftActions ? Object.keys(m.config.giftActions).length : 0
                            return (
                                <motion.div
                                    key={m._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                                    whileHover={{ y: -4 }}
                                    className="rounded-2xl bg-card border border-white/10 overflow-hidden hover:border-neon-green/40 hover:shadow-2xl hover:shadow-neon-green/10 transition-all flex flex-col"
                                >
                                    <div className="aspect-video bg-gradient-to-br from-white/5 to-black/30 relative overflow-hidden">
                                        {img
                                            ? <img
                                                src={img}
                                                alt={m.title}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                            />
                                            : <div className="w-full h-full flex items-center justify-center text-white/20">
                                                <Gamepad2 size={48} />
                                            </div>}
                                        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur text-[10px] font-black tracking-widest text-neon-green border border-neon-green/30 uppercase">
                                            {prettyCategory(m.category)}
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="text-xs text-white/50 font-semibold mb-1 tracking-wide">{m.gameTitle || '—'}</div>
                                        <h3 className="font-bold text-lg text-white mb-2">{m.title}</h3>
                                        <p className="text-sm text-white/60 leading-relaxed flex-1 mb-4 line-clamp-3">
                                            {m.description || 'Açıklama yakında eklenecek.'}
                                        </p>

                                        {/* Metadata pills */}
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] mb-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                                                <Sparkles size={11} /> v{m.version || '1.0.0'}
                                            </span>
                                            {giftCount > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-neon-purple font-semibold">
                                                    <Keyboard size={11} /> {giftCount} aksiyon
                                                </span>
                                            )}
                                            {m.fileUploadedAt && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green font-semibold">
                                                    📦 Hazır
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* Footer CTA */}
            <section className="container mx-auto px-4 sm:px-6 pb-24">
                <div className="rounded-2xl bg-gradient-to-br from-neon-green/10 to-neon-purple/10 border border-white/10 p-8 sm:p-12 text-center">
                    <Globe className="mx-auto text-neon-green mb-4" size={36} />
                    <h2 className="font-heading text-3xl sm:text-4xl font-black mb-3">Modlar uygulamada</h2>
                    <p className="text-white/70 mb-6 max-w-xl mx-auto">
                        Bütün modlar SeliGames masaüstü uygulaması içinden indirilir ve oyun dizinine otomatik kurulur. Önce uygulamayı al.
                    </p>
                    <a
                        href="/download"
                        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gaming-gradient text-black font-bold shadow-2xl shadow-neon-green/30 hover:scale-105 transition-all"
                    >
                        Uygulamayı Ücretsiz İndir
                    </a>
                </div>
            </section>
        </div>
    )
}

function InfoTile({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
    return (
        <div className="rounded-xl bg-card border border-white/10 p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-green/10 border border-neon-green/30 text-neon-green flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div>
                <div className="font-bold text-sm mb-1">{label}</div>
                <div className="text-xs text-white/60 leading-relaxed">{desc}</div>
            </div>
        </div>
    )
}

function prettyCategory(c?: string) {
    const map: Record<string, string> = {
        'open-world': 'Açık Dünya',
        'fps': 'FPS',
        'battle-royale': 'Battle Royale',
        'moba': 'MOBA',
        'sandbox': 'Sandbox',
        'sports': 'Spor',
        'party': 'Parti',
        'other': 'Diğer',
    }
    return map[c || ''] || (c || 'Mod')
}
