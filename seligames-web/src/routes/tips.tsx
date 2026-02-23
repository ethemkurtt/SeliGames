import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/tips')({
    component: Tips,
})

function Tips() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-heading font-bold text-neon-green mb-8">Yayıncı İpuçları</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    {
                        title: "Etkileşimi Artırın",
                        desc: "İzleyicilerinize oyunun kontrolünü vererek onları yayının bir parçası yapın. Hediye hedeflerini ekranda gösterin."
                    },
                    {
                        title: "Doğru Modu Seçin",
                        desc: "Oynadığınız oyun türüne uygun modları seçin. Korku oyunları için ses efektleri, aksiyon oyunları için kaos modları idealdir."
                    },
                    {
                        title: "Düzenli Yayın Yapın",
                        desc: "Takipçilerinizin sizi ne zaman izleyebileceğini bilmesi önemlidir. Bir yayın takvimi oluşturun ve buna uyun."
                    },
                    {
                        title: "Toplulukla İletişim",
                        desc: "Yorumları okuyun, soruları yanıtlayın ve izleyicilerinizle sohbet edin. SeliGames sohbet botunu kullanarak işinizi kolaylaştırın."
                    }
                ].map((tip, i) => (
                    <Card key={i} className="border-neon-green/20">
                        <CardHeader>
                            <CardTitle className="text-neon-green">{tip.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{tip.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
