import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'

export const Route = createFileRoute('/download')({
    component: Download,
})

function Download() {
    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-5xl font-heading font-bold mb-6">
                SeliGames'i <span className="text-neon-green">İndir</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
                Masaüstü uygulamasını indirerek TikTok yayınlarınızı hemen özelleştirmeye başlayın.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Windows */}
                <Card className="border-neon-blue/30 hover:border-neon-blue transition-colors">
                    <CardHeader>
                        <CardTitle className="text-3xl text-neon-blue">Windows</CardTitle>
                        <CardDescription>Windows 10 ve 11 için</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl">🪟</div>
                        <ul className="text-sm text-muted-foreground space-y-2">
                            <li>64-bit işlemci</li>
                            <li>4GB RAM minimum</li>
                            <li>DirectX 11 uyumlu</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" variant="neon" size="lg">Windows İçin İndir</Button>
                    </CardFooter>
                </Card>

                {/* Mac */}
                <Card className="border-gray-700 opacity-80">
                    <CardHeader>
                        <CardTitle className="text-3xl text-gray-400">macOS</CardTitle>
                        <CardDescription>Apple Silicon ve Intel</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-4xl">🍎</div>
                        <ul className="text-sm text-muted-foreground space-y-2">
                            <li>macOS 12.0+</li>
                            <li>M1/M2/M3 veya Intel</li>
                            <li>Metal desteği</li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" variant="outline" disabled>Çok Yakında</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
