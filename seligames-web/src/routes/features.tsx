import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Gamepad2, Layers, Mic2, Zap, Trophy, Users, Settings, Keyboard, Music, Eye, BarChart3, Sparkles } from 'lucide-react'

export const Route = createFileRoute('/features')({
    component: FeaturesPage,
})

const sections = [
    {
        title: 'Mod Sistemi', subtitle: 'Oyun başına özel kontrol',
        icon: Gamepad2, accent: 'green',
        items: [
            { icon: Keyboard, title: 'Hediye → Klavye Kısayolu', desc: 'Her hediye için Ctrl+1, Shift+F gibi tuş eşleştir. Yayın boyunca otomatik fire.' },
            { icon: Settings, title: 'Mod Başına Config', desc: 'GTA için ayrı, Minecraft için ayrı yapılandırma. Aynı hediye farklı oyunda farklı aksiyon.' },
            { icon: Sparkles, title: 'Mod Galerisi', desc: '10+ desteklenen oyun. Kendi modunu da ekleyebilirsin.' },
        ]
    },
    {
        title: 'Canlı Overlay\'ler', subtitle: 'OBS Browser Source ile yayında',
        icon: Layers, accent: 'cyan',
        items: [
            { icon: Eye, title: '7 Tip Overlay', desc: 'Goal bar, gift alert, last-X kartı, leaderboard, chart, chat dock, event feed.' },
            { icon: Sparkles, title: '5 Hazır Tema', desc: 'Neon, minimal, gaming, gradient, glass — her birinin kendine özgü animasyonu.' },
            { icon: Settings, title: 'Custom CSS', desc: 'Tasarımını sıfırdan istediğin gibi yaz, JSON olarak içe/dışa aktar.' },
        ]
    },
    {
        title: 'Hediye Sesleri', subtitle: 'Her hediyeye özel',
        icon: Mic2, accent: 'purple',
        items: [
            { icon: Music, title: '12 Hazır Ses', desc: 'Bell, pop, coin, chime, fanfare, victory ve daha fazlası — Web Audio ile gecikmesiz.' },
            { icon: Music, title: 'MP3 Yükle', desc: 'Kendi seslerini yükle, hediye başına ata. Tier varsayılanları fallback olarak kalır.' },
            { icon: Eye, title: '123 Hediye', desc: 'TikTok\'taki tüm güncel hediyeler — gerçek ikonları ve coin değerleriyle.' },
        ]
    },
    {
        title: 'Akış ve Performans',
        subtitle: 'Sıfır gecikme, kaybolan hediye yok',
        icon: Zap, accent: 'yellow',
        items: [
            { icon: Zap, title: 'WebSocket Push', desc: 'Hediye geldiği milisaniyede tüm overlay\'lerin ve oyununun haberi olur.' },
            { icon: BarChart3, title: 'Atomic Updates', desc: 'Eş zamanlı yüzlerce hediye gelse bile race condition yok — hiçbir hediye kaybolmaz.' },
            { icon: Trophy, title: 'İstatistik & Geçmiş', desc: 'Yayın sessions, top hediye gönderenler, tamamlanan hedefler — 7 gün geçmiş.' },
        ]
    },
]

const accentMap: any = {
    green: { text: 'text-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/30' },
    cyan: { text: 'text-neon-blue', bg: 'bg-neon-blue/10', border: 'border-neon-blue/30' },
    purple: { text: 'text-neon-purple', bg: 'bg-neon-purple/10', border: 'border-neon-purple/30' },
    yellow: { text: 'text-neon-yellow', bg: 'bg-neon-yellow/10', border: 'border-neon-yellow/30' },
}

function FeaturesPage() {
    return (
        <div>
            {/* Hero */}
            <section className="container mx-auto px-4 sm:px-6 pt-20 pb-12 text-center">
                <div className="inline-block px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] font-black tracking-widest mb-4">
                    ÖZELLİKLER
                </div>
                <h1 className="font-heading text-4xl sm:text-6xl font-black leading-tight">
                    Yayında <span className="text-gaming-gradient">İhtiyacın Olan Her Şey</span>
                </h1>
                <p className="mt-4 text-white/70 max-w-2xl mx-auto">
                    Tek bir uygulamada: TikTok bağlantısı, overlay'ler, hediye sesleri, mod sistemi, istatistikler.
                </p>
            </section>

            {/* Sections */}
            <div className="container mx-auto px-4 sm:px-6 pb-16 space-y-16">
                {sections.map((s, i) => {
                    const Icon = s.icon
                    const a = accentMap[s.accent]
                    return (
                        <motion.section
                            key={s.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-100px' }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.bg} ${a.border} border ${a.text}`}>
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-widest font-black text-white/40">Bölüm {i + 1}</div>
                                    <h2 className="font-heading text-2xl sm:text-3xl font-black">{s.title}</h2>
                                </div>
                            </div>
                            <p className="text-white/60 mb-6 max-w-xl">{s.subtitle}</p>
                            <div className="grid md:grid-cols-3 gap-4">
                                {s.items.map((it) => {
                                    const ItIcon = it.icon
                                    return (
                                        <div key={it.title} className="rounded-xl bg-card border border-white/10 p-5 hover:border-white/20 transition-all">
                                            <div className={`w-10 h-10 rounded-lg ${a.bg} ${a.text} flex items-center justify-center mb-3`}>
                                                <ItIcon size={20} />
                                            </div>
                                            <h3 className="font-bold text-white mb-1">{it.title}</h3>
                                            <p className="text-sm text-white/60 leading-relaxed">{it.desc}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.section>
                    )
                })}
            </div>

            {/* Comparison hint */}
            <section className="container mx-auto px-4 sm:px-6 pb-20">
                <div className="rounded-3xl bg-gradient-to-br from-neon-green/10 via-neon-blue/10 to-neon-purple/10 border border-white/10 p-10 text-center">
                    <h2 className="font-heading text-3xl font-black mb-4">Hazır mısın?</h2>
                    <p className="text-white/70 mb-6 max-w-xl mx-auto">
                        Ücretsiz hesap, kart bilgisi yok. Premium plan ile sınırsız overlay ve mod kullan.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link to="/register" className="px-7 py-3 rounded-xl bg-gaming-gradient text-black font-bold hover:scale-105 transition-all">Ücretsiz Başla</Link>
                        <Link to="/pricing" className="px-7 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">Planları İncele</Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
