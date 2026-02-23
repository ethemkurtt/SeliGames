import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/profile')({
    component: Profile,
})

function Profile() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-heading font-bold text-neon-purple mb-8">Profil Yönetimi</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Info */}
                <Card className="lg:col-span-1 h-fit border-neon-purple/20">
                    <CardHeader className="text-center">
                        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-neon-purple to-blue-600 rounded-full mb-4 border-4 border-black shadow-[0_0_20px_rgba(188,19,254,0.3)]" />
                        <CardTitle className="text-2xl">SeliGamer</CardTitle>
                        <CardDescription>@seligamer_tiktok</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-muted-foreground">Üyelik</span>
                            <span className="text-neon-green font-bold">Pro</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-muted-foreground">Katılım</span>
                            <span>Kasım 2023</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/10">
                            <span className="text-muted-foreground">Konum</span>
                            <span>Türkiye</span>
                        </div>
                        <Button className="w-full mt-4" variant="outline">Profili Düzenle</Button>
                    </CardContent>
                </Card>

                {/* Settings & Billing */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Subscription */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Abonelik Durumu</CardTitle>
                            <CardDescription>Mevcut planınızı yönetin</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold text-neon-green">Pro Plan</div>
                                <div className="text-sm text-muted-foreground">Sonraki ödeme: 21 Aralık 2025</div>
                            </div>
                            <Button variant="neon">Planı Yönet</Button>
                        </CardContent>
                    </Card>

                    {/* Payment Methods */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Ödeme Yöntemleri</CardTitle>
                            <CardDescription>Kayıtlı kartlarınız</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-white/10 rounded bg-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-6 bg-gray-700 rounded" />
                                    <div>
                                        <div className="font-bold">•••• •••• •••• 4242</div>
                                        <div className="text-xs text-muted-foreground">Son Kullanma: 12/28</div>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400">Sil</Button>
                            </div>
                            <Button variant="outline" className="w-full border-dashed border-white/20 hover:border-neon-purple hover:text-neon-purple">
                                + Yeni Kart Ekle
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Preferences */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tercihler</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">E-posta Bildirimleri</label>
                                <div className="w-10 h-6 bg-neon-green rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">İki Faktörlü Doğrulama</label>
                                <div className="w-10 h-6 bg-gray-700 rounded-full relative cursor-pointer">
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
