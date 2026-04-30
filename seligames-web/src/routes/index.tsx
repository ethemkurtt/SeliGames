import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Gamepad2, Zap, Trophy, Users, Layers, Mic2, Download as DownloadIcon, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

export const Route = createFileRoute('/')({
    component: LandingPage,
})

function LandingPage() {
    const [mods, setMods] = useState<any[]>([])
    const [siteName, setSiteName] = useState('SeliGames')
    const [tagline, setTagline] = useState('TikTok Live ile Oyunlarını Kontrol Et')
    const [heroSubtitle, setHeroSubtitle] = useState('İzleyicilerinin hediyeleri oyununda gerçek aksiyonlara dönüşsün')

    useEffect(() => {
        api.get('/mods').then((r) => setMods((r.data || []).slice(0, 6))).catch(() => {})
        // /api/site (no auth) — pulls public marketing copy from admin SiteSettings
        api.get('/site').then((r) => {
            if (r.data?.siteName) setSiteName(r.data.siteName)
            if (r.data?.tagline) setTagline(r.data.tagline)
            if (r.data?.heroSubtitle) setHeroSubtitle(r.data.heroSubtitle)
        }).catch(() => {})
    }, [])

    return (
        <div>
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 -z-10 opacity-50">
                    <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-neon-green/20 blur-[120px]" />
                    <div className="absolute top-20 right-0 w-96 h-96 rounded-full bg-neon-purple/20 blur-[120px]" />
                    <div className="absolute bottom-0 left-1/2 w-96 h-96 rounded-full bg-neon-blue/20 blur-[120px]" />
                </div>

                <div className="container mx-auto px-4 sm:px-6 pt-24 pb-20 sm:pt-32 sm:pb-32">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl mx-auto text-center"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-bold tracking-wide mb-6">
                            <Sparkles size={14} /> CANLI YAYIN ETKİLEŞİM PLATFORMU
                        </div>
                        <h1 className="font-heading text-5xl sm:text-7xl md:text-8xl font-black leading-[1.05] tracking-tight mb-6">
                            <span className="block">TikTok Live ile</span>
                            <span className="block text-gaming-gradient">{tagline.split(' ').slice(-3).join(' ')}</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
                            {heroSubtitle}. Hediye geldiğinde tuşa bas, overlay'i tetikle, oyunu kontrol et — hepsi otomatik.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <Link
                                to="/register"
                                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gaming-gradient text-black font-bold text-base shadow-2xl shadow-neon-green/30 hover:shadow-neon-green/50 hover:scale-105 transition-all"
                            >
                                Ücretsiz Başla <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                            </Link>
                            <Link
                                to="/features"
                                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl font-semibold hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                                <Play size={16} /> Nasıl Çalışıyor?
                            </Link>
                        </div>

                        {/* Stats strip */}
                        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                            <Stat label="Aktif Yayıncı" value="2.5K+" />
                            <Stat label="Desteklenen Oyun" value="10+" />
                            <Stat label="TikTok Hediyesi" value="123" />
                            <Stat label="Overlay Tipi" value="7" />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features */}
            <section className="container mx-auto px-4 sm:px-6 py-20">
                <SectionHead
                    badge="ÖZELLİKLER"
                    title="Yayın Deneyimini Yeniden Tanımla"
                    subtitle="Tek bir platform, sınırsız etkileşim. Her hediye, her beğeni, her takip — gerçek aksiyon."
                />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
                    <FeatureCard
                        icon={<Gamepad2 size={28} />}
                        title="Mod Sistemi"
                        desc="GTA V, Minecraft, Valorant, Fortnite ve daha fazlası. Her mod'a özel hediye→tuş atama yap."
                        accent="green"
                    />
                    <FeatureCard
                        icon={<Layers size={28} />}
                        title="Canlı Overlay'ler"
                        desc="Goal bar, gift alert, leaderboard, chat dock. OBS Browser Source ile yayına entegre."
                        accent="cyan"
                    />
                    <FeatureCard
                        icon={<Mic2 size={28} />}
                        title="Hediye Sesleri"
                        desc="Her TikTok hediyesi için özel ses ya da MP3 yükle. Tier bazlı varsayılanlar mevcut."
                        accent="purple"
                    />
                    <FeatureCard
                        icon={<Zap size={28} />}
                        title="Anlık WebSocket"
                        desc="0 gecikme. Hediye geldiği anda overlay'in büyüsün, tuşun fırlasın."
                        accent="yellow"
                    />
                    <FeatureCard
                        icon={<Trophy size={28} />}
                        title="İstatistikler"
                        desc="Yayın geçmişi, top hediye gönderenler, tamamlanan hedefler — her şey kayıt altında."
                        accent="green"
                    />
                    <FeatureCard
                        icon={<Users size={28} />}
                        title="İzleyici Etkileşimi"
                        desc="Takip, beğeni, paylaşım, hediye, yorum — hepsi tek bir akışta etkileşime dönüşsün."
                        accent="cyan"
                    />
                </div>
            </section>

            {/* Mods showcase */}
            {mods.length > 0 && (
                <section className="container mx-auto px-4 sm:px-6 py-20">
                    <SectionHead
                        badge="MOD KÜTÜPHANESİ"
                        title="Hangi Oyunu Oynuyorsun?"
                        subtitle="10+ desteklenen mod. Her biri için özel yapılandırılmış hediye-aksiyon eşleştirmeleri."
                        action={<Link to="/mods" className="text-sm font-semibold text-neon-green hover:underline">Tümünü Gör →</Link>}
                    />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-12">
                        {mods.map((m) => (
                            <Link
                                key={m._id}
                                to="/mods"
                                className="group relative rounded-xl overflow-hidden bg-card border border-white/10 hover:border-neon-green/40 transition-all"
                            >
                                <div className="aspect-video overflow-hidden bg-gradient-to-br from-white/5 to-black/30">
                                    {m.imageUrl && (
                                        <img
                                            src={m.imageUrl}
                                            alt={m.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <div className="text-[10px] font-black tracking-widest text-neon-green uppercase mb-1">{m.category || 'Mod'}</div>
                                    <div className="text-base font-bold text-white">{m.title}</div>
                                    <div className="text-xs text-white/60 mt-0.5">{m.gameTitle}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* CTA */}
            <section className="container mx-auto px-4 sm:px-6 py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neon-green/10 via-neon-blue/10 to-neon-purple/10 border border-white/10 p-10 sm:p-16 text-center"
                >
                    <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-neon-green/30 blur-[100px]" />
                    <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-neon-purple/30 blur-[100px]" />
                    <div className="relative">
                        <h2 className="font-heading text-4xl sm:text-5xl font-black mb-4">
                            Yayını <span className="text-gaming-gradient">Bir Üst Seviyeye</span> Çıkar
                        </h2>
                        <p className="text-white/70 max-w-xl mx-auto mb-8">
                            Ücretsiz hesap aç, masaüstü uygulamasını indir, ilk overlay'ini 5 dakikada kur.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <Link to="/register" className="px-7 py-3.5 rounded-xl bg-gaming-gradient text-black font-bold shadow-2xl shadow-neon-green/30 hover:scale-105 transition-all">
                                Hemen Başla
                            </Link>
                            <Link to="/download" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                <DownloadIcon size={18} /> Uygulamayı İndir
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </section>
        </div>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <motion.div whileHover={{ y: -4 }} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
            <div className="text-2xl sm:text-3xl font-black text-gaming-gradient">{value}</div>
            <div className="text-[11px] text-white/60 uppercase tracking-widest mt-1 font-semibold">{label}</div>
        </motion.div>
    )
}

function SectionHead({ badge, title, subtitle, action }: { badge: string; title: string; subtitle: string; action?: React.ReactNode }) {
    return (
        <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
                <div className="inline-block px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] font-black tracking-widest mb-3">{badge}</div>
                <h2 className="font-heading text-3xl sm:text-4xl font-black leading-tight">{title}</h2>
                <p className="text-white/60 mt-2 max-w-xl">{subtitle}</p>
            </div>
            {action}
        </div>
    )
}

const accentMap = {
    green: 'from-neon-green/20 to-transparent border-neon-green/30 text-neon-green',
    cyan: 'from-neon-blue/20 to-transparent border-neon-blue/30 text-neon-blue',
    purple: 'from-neon-purple/20 to-transparent border-neon-purple/30 text-neon-purple',
    yellow: 'from-neon-yellow/20 to-transparent border-neon-yellow/30 text-neon-yellow',
}

function FeatureCard({ icon, title, desc, accent = 'green' }: { icon: React.ReactNode; title: string; desc: string; accent?: keyof typeof accentMap }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className={`relative rounded-2xl bg-gradient-to-br ${accentMap[accent]} border bg-card p-6 backdrop-blur-xl group`}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-current/10 ${accentMap[accent].split(' ')[3]}`} style={{ background: 'rgba(255,255,255,0.04)' }}>
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
            <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
        </motion.div>
    )
}
