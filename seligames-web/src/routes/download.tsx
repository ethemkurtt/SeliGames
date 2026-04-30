import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Apple, Monitor, Terminal, ShieldCheck, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/api'

export const Route = createFileRoute('/download')({
    component: DownloadPage,
})

function DownloadPage() {
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [version, setVersion] = useState('1.0.0')
    const [downloadUrl, setDownloadUrl] = useState('')

    useEffect(() => {
        if (!isAuthenticated) {
            navigate({ to: '/login', search: { redirect: '/download' } as any })
            return
        }
        api.get('/site').then((r) => {
            if (r.data?.desktopVersion) setVersion(r.data.desktopVersion)
            if (r.data?.desktopDownloadUrl) setDownloadUrl(r.data.desktopDownloadUrl)
        }).catch(() => {})
    }, [isAuthenticated, navigate])

    if (!isAuthenticated) return null

    const platforms = [
        { id: 'mac', name: 'macOS', icon: Apple, ext: '.dmg', size: '~120 MB', notes: 'Apple Silicon + Intel' },
        { id: 'win', name: 'Windows', icon: Monitor, ext: '.exe', size: '~110 MB', notes: 'Windows 10/11 (x64)' },
        { id: 'linux', name: 'Linux', icon: Terminal, ext: '.AppImage', size: '~115 MB', notes: 'Ubuntu/Debian/Fedora' },
    ]

    return (
        <div>
            {/* Hero */}
            <section className="container mx-auto px-4 sm:px-6 pt-20 pb-10 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] font-black tracking-widest mb-4">
                    <Lock size={12} /> ÜYE GİRİŞİ DOĞRULANDI
                </div>
                <h1 className="font-heading text-4xl sm:text-6xl font-black leading-tight">
                    <span className="text-gaming-gradient">SeliGames</span> Masaüstü
                </h1>
                <p className="mt-4 text-white/70 max-w-2xl mx-auto">
                    İşletim sistemini seç, indir, 5 dakikada kur. Sürüm <span className="text-neon-green font-bold">v{version}</span>
                </p>
            </section>

            {/* Platforms */}
            <section className="container mx-auto px-4 sm:px-6 pb-12">
                <div className="grid md:grid-cols-3 gap-5">
                    {platforms.map((p, i) => {
                        const Icon = p.icon
                        return (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.07 }}
                                className="rounded-2xl bg-card border border-white/10 p-6 hover:border-neon-green/40 transition-all"
                            >
                                <div className="w-14 h-14 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green flex items-center justify-center mb-4">
                                    <Icon size={28} />
                                </div>
                                <h3 className="text-2xl font-black mb-1">{p.name}</h3>
                                <p className="text-xs text-white/50 mb-1">{p.notes}</p>
                                <p className="text-xs text-white/40 mb-5">{p.size} • {p.ext}</p>
                                <a
                                    href={downloadUrl || '#'}
                                    onClick={(e) => { if (!downloadUrl) { e.preventDefault(); alert('Bu platform için sürüm yakında.'); } }}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gaming-gradient text-black font-bold hover:scale-[1.02] transition-all"
                                >
                                    <Download size={18} /> İndir
                                </a>
                            </motion.div>
                        )
                    })}
                </div>
            </section>

            {/* Install steps */}
            <section className="container mx-auto px-4 sm:px-6 pb-20">
                <div className="rounded-2xl bg-gradient-to-br from-neon-green/5 to-neon-blue/5 border border-white/10 p-8">
                    <h2 className="font-heading text-2xl font-black mb-6 flex items-center gap-2">
                        <ShieldCheck className="text-neon-green" size={24} /> Kurulum Adımları
                    </h2>
                    <ol className="space-y-4">
                        <Step n={1} title="İndirilen dosyayı çift tıkla" desc="macOS için .dmg, Windows için .exe, Linux için .AppImage" />
                        <Step n={2} title="Uygulamayı aç" desc="İlk açılışta hesabınla giriş yap (üye olduğun e-posta + şifre)." />
                        <Step n={3} title="TikTok Live'a bağlan" desc="Profil sayfasından TikTok kullanıcı adını ekle, TikTok Canlı sayfasından canlı yayını başlat." />
                        <Step n={4} title="Overlay oluştur, OBS'ye ekle" desc="Hedef Likes / Gift Alert vb. overlay'i ayarla, URL'yi kopyala, OBS'de Browser Source olarak ekle." />
                        <Step n={5} title="(macOS) Erişilebilirlik izni" desc="Mod'ların oyuna otomatik tuş basabilmesi için Sistem Ayarları → Gizlilik → Erişilebilirlik altında SeliGames'e izin ver." />
                    </ol>
                </div>

                <div className="mt-6 rounded-xl bg-amber-500/5 border border-amber-500/20 p-5 text-sm text-amber-200/80">
                    ⚠️ <b>Güvenlik notu:</b> İndirme bağlantıları üyeliğine bağlıdır. Başka biriyle paylaşma — kurulumlar makineye ve hesaba bağlı, yanlış kullanım hesabını askıya aldırır.
                </div>

                <div className="mt-10 flex flex-wrap justify-center gap-3">
                    <Link to="/dashboard" className="px-7 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        Dashboard'a Dön
                    </Link>
                    <Link to="/features" className="px-7 py-3 rounded-xl bg-gaming-gradient text-black font-bold hover:scale-[1.02] transition-all">
                        Özellikleri İncele
                    </Link>
                </div>
            </section>
        </div>
    )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
    return (
        <li className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-gaming-gradient flex items-center justify-center font-black text-black flex-shrink-0">{n}</div>
            <div>
                <h3 className="font-bold text-white">{title}</h3>
                <p className="text-sm text-white/60 mt-0.5">{desc}</p>
            </div>
        </li>
    )
}
