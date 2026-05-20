import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Download, Apple, Monitor, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/download')({
    component: DownloadPage,
})

// Filenames match what electron-builder produces in seligames-app/dist/.
// The VPS LiteSpeed root serves /downloads/* from /home/srv.../public_html/downloads/.
const VERSION = '1.0.0'
const DL_BASE = '/downloads'
const builds = [
    {
        id: 'mac-arm',
        name: 'macOS',
        sub: 'Apple Silicon (M1/M2/M3/M4)',
        icon: Apple,
        file: `SeliGames-${VERSION}-arm64.dmg`,
        size: '92 MB',
        accent: 'from-neon-green to-neon-blue',
    },
    {
        id: 'mac-intel',
        name: 'macOS',
        sub: 'Intel x64',
        icon: Apple,
        file: `SeliGames-${VERSION}.dmg`,
        size: '97 MB',
        accent: 'from-white/40 to-white/10',
    },
    {
        id: 'win',
        name: 'Windows',
        sub: 'Windows 10 / 11 (x64)',
        icon: Monitor,
        file: `SeliGames Setup ${VERSION}.exe`,
        size: '74 MB',
        accent: 'from-neon-purple to-neon-pink',
    },
]

function DownloadPage() {
    return (
        <div>
            <section className="container mx-auto px-4 sm:px-6 pt-20 pb-10 text-center">
                <img src="/app-logo.png" alt="SeliGames" className="mx-auto h-20 mb-6 drop-shadow-[0_0_20px_rgba(0,255,157,0.4)]" />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] font-black tracking-widest mb-4">
                    %100 ÜCRETSİZ
                </div>
                <h1 className="font-heading text-4xl sm:text-6xl font-black leading-tight">
                    <span className="text-gaming-gradient">SeliGames</span> Masaüstü
                </h1>
                <p className="mt-4 text-white/70 max-w-2xl mx-auto">
                    İşletim sistemine göre indir, çift tıkla, 5 dakikada kur.<br />
                    Sürüm <span className="text-neon-green font-bold">v{VERSION}</span> • Yayıncılar için TikTok Live etkileşim platformu
                </p>
            </section>

            <section className="container mx-auto px-4 sm:px-6 pb-12">
                <div className="grid md:grid-cols-3 gap-5">
                    {builds.map((b, i) => {
                        const Icon = b.icon
                        const encoded = encodeURI(b.file)
                        return (
                            <motion.div
                                key={b.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.07 }}
                                className="rounded-2xl bg-card border border-white/10 p-6 hover:border-neon-green/40 transition-all"
                            >
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${b.accent} bg-opacity-10 flex items-center justify-center mb-4`}>
                                    <Icon size={28} className="text-black" />
                                </div>
                                <h3 className="text-2xl font-black mb-1">{b.name}</h3>
                                <p className="text-xs text-white/50 mb-1">{b.sub}</p>
                                <p className="text-xs text-white/40 mb-5">{b.size} • {b.file.split('.').pop()?.toUpperCase()}</p>
                                <a
                                    href={`${DL_BASE}/${encoded}`}
                                    download
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gaming-gradient text-black font-bold hover:scale-[1.02] transition-all"
                                >
                                    <Download size={18} /> İndir
                                </a>
                            </motion.div>
                        )
                    })}
                </div>
            </section>

            <section className="container mx-auto px-4 sm:px-6 pb-20">
                <div className="rounded-2xl bg-gradient-to-br from-neon-green/5 to-neon-blue/5 border border-white/10 p-8">
                    <h2 className="font-heading text-2xl font-black mb-6 flex items-center gap-2">
                        <ShieldCheck className="text-neon-green" size={24} /> Kurulum Adımları
                    </h2>
                    <ol className="space-y-4">
                        <Step n={1} title="Dosyayı çift tıkla" desc="macOS için .dmg → .app'i Applications'a sürükle. Windows için .exe installer'ı çalıştır." />
                        <Step n={2} title="İlk açılışta güvenlik uyarısını geç" desc="macOS: Sistem Ayarları → Gizlilik → Yine de Aç. Windows: SmartScreen → Diğer bilgiler → Yine de çalıştır." />
                        <Step n={3} title="Hesabınla giriş yap" desc="Üye olduğun e-posta + şifre. Hesabın yoksa /register sayfasından ücretsiz oluştur." />
                        <Step n={4} title="TikTok Live'a bağlan" desc="Profil → TikTok kullanıcı adını gir → TikTok Canlı sayfasından bağlan." />
                        <Step n={5} title="(macOS) Klavye izni ver" desc="Modların oyuna otomatik tuş basabilmesi için Sistem Ayarları → Gizlilik → Erişilebilirlik → SeliGames'e izin." />
                    </ol>
                </div>

                <div className="mt-10 flex flex-wrap justify-center gap-3">
                    <Link to="/" className="px-7 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        Ana Sayfa
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
