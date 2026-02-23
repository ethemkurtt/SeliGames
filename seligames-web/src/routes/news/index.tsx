import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/news/')({
    component: News,
})

function News() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-heading font-bold text-neon-blue mb-8">Haberler & Güncellemeler</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[{
                    title: "SeliGames v2.0 Yayında!",
                    date: "20 Kasım 2023",
                    category: "Güncelleme",
                    desc: "Yeni arayüz, daha hızlı mod yükleme ve gelişmiş TikTok entegrasyonu ile karşınızdayız."
                }, {
                    title: "Topluluk Etkinliği: En İyi Mod",
                    date: "18 Kasım 2023",
                    category: "Etkinlik",
                    desc: "Kendi modunu tasarla ve büyük ödülü kazanma şansı yakala! Son katılım 1 Aralık."
                }, {
                    title: "Yeni Özellik: Hediye Yağmuru",
                    date: "15 Kasım 2023",
                    category: "Özellik",
                    desc: "Artık izleyicileriniz yayın sırasında ekranınıza hediye yağdırabilir. Hemen deneyin!"
                }, {
                    title: "Sunucu Bakım Çalışması",
                    date: "10 Kasım 2023",
                    category: "Duyuru",
                    desc: "Daha iyi hizmet verebilmek için 12 Kasım gecesi sunucularımızda bakım yapılacaktır."
                }, {
                    title: "Yayıncı İpuçları #5",
                    date: "5 Kasım 2023",
                    category: "Rehber",
                    desc: "Etkileşimi artırmanın yolları ve izleyici kitlenizi büyütmek için ipuçları."
                }, {
                    title: "Cadılar Bayramı Özel Modu",
                    date: "31 Ekim 2023",
                    category: "Mod",
                    desc: "Korku dolu bir yayın deneyimi için Cadılar Bayramı modunu kaçırmayın."
                }].map((news, i) => (
                    <Link key={i} to="/news/$newsId" params={{ newsId: String(i + 1) }} className="block h-full">
                        <Card variant="glass" className="h-full hover:border-neon-blue transition-colors group cursor-pointer border-white/5">
                            <CardHeader>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-neon-blue border border-neon-blue/30 px-2 py-1 rounded-full bg-neon-blue/10">
                                        {news.category}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{news.date}</span>
                                </div>
                                <CardTitle className="group-hover:text-neon-blue transition-colors">{news.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-sm">{news.desc}</p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="link" className="p-0 text-neon-blue hover:text-white">Devamını Oku →</Button>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
