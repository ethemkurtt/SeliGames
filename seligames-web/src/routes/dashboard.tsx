import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { CircularProgress } from '@mui/material'
import api from '@/lib/api'

export const Route = createFileRoute('/dashboard')({
    component: Dashboard,
})

interface Mod {
    _id: string
    title: string
    version: string
    imageUrl?: string
    gameTitle: string
}

interface Statistics {
    mods: any[]
    summary: {
        totalMods: number
        totalInteractions: number
        totalGifts: number
        totalComments: number
        totalLikes: number
    }
}

function Dashboard() {
    const { user } = useAuth()
    const [recentMods, setRecentMods] = useState<Mod[]>([])
    const [statistics, setStatistics] = useState<Statistics | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const [modsResponse, statsResponse] = await Promise.all([
                api.get('/mods'),
                api.get('/statistics').catch(() => ({ data: { summary: { totalMods: 0, totalInteractions: 0, totalGifts: 0, totalComments: 0, totalLikes: 0 }, mods: [] } }))
            ])
            
            setRecentMods(modsResponse.data.slice(0, 3))
            setStatistics(statsResponse.data)
        } catch (error) {
            console.error('Dashboard verileri yüklenemedi:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <CircularProgress sx={{ color: 'var(--color-neon-green)' }} size={60} />
                <p className="text-neon-green mt-4">Yükleniyor...</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-neon-green">
                        Hoşgeldin, {user?.username || 'SeliGamer'}!
                    </h1>
                    <p className="text-muted-foreground">Yayın kontrol paneline genel bakış.</p>
                </div>
                <Link to="/mods">
                    <Button variant="neon">Modları Keşfet</Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { 
                        label: "Aktif Modlar", 
                        value: statistics?.summary.totalMods || recentMods.length || 0, 
                        color: "text-neon-green" 
                    },
                    { 
                        label: "Toplam Etkileşim", 
                        value: statistics?.summary.totalInteractions || 0, 
                        color: "text-neon-blue" 
                    },
                    { 
                        label: "Gelen Hediyeler", 
                        value: statistics?.summary.totalGifts || 0, 
                        color: "text-neon-purple" 
                    },
                    { 
                        label: "Toplam Beğeni", 
                        value: statistics?.summary.totalLikes || 0, 
                        color: "text-white" 
                    },
                ].map((stat, i) => (
                    <Card key={i} className="bg-black/40 border-white/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Mods */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-heading font-bold">Son Modlar</h2>
                    <div className="grid gap-4">
                        {recentMods.length > 0 ? recentMods.map((mod, i) => (
                            <motion.div
                                key={mod._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="flex items-center justify-between p-4 hover:border-neon-green/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="w-12 h-12 rounded bg-gradient-to-br from-gray-800 to-black border border-white/10 bg-cover bg-center"
                                            style={{ backgroundImage: mod.imageUrl ? `url(${mod.imageUrl})` : 'none' }}
                                        />
                                        <div>
                                            <h3 className="font-bold">{mod.title}</h3>
                                            <p className="text-xs text-muted-foreground">{mod.version} • {mod.gameTitle}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs px-2 py-1 rounded bg-neon-green/20 text-neon-green">
                                            Aktif
                                        </span>
                                        <Link to="/mods/$modId" params={{ modId: mod._id }}>
                                            <Button variant="ghost" size="sm">Detaylar</Button>
                                        </Link>
                                    </div>
                                </Card>
                            </motion.div>
                        )) : (
                            <Card className="p-6 text-center">
                                <p className="text-muted-foreground">Henüz mod bulunmuyor</p>
                                <Link to="/mods">
                                    <Button variant="neon" className="mt-4">Modları Keşfet</Button>
                                </Link>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Quick Actions & News */}
                <div className="space-y-6">
                    <Card className="border-neon-purple/20 bg-neon-purple/5">
                        <CardHeader>
                            <CardTitle className="text-neon-purple">Hızlı İşlemler</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link to="/mods">
                                <Button className="w-full justify-start" variant="ghost">⚡ Yeni Mod Ekle</Button>
                            </Link>
                            <Link to="/profile">
                                <Button className="w-full justify-start" variant="ghost">🔧 Profil Düzenle</Button>
                            </Link>
                            <Link to="/tips">
                                <Button className="w-full justify-start" variant="ghost">📚 Kılavuzları Oku</Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Son Güncellemeler</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm">
                                <p className="font-medium text-neon-blue">SeliGames v2.0 Yayında!</p>
                                <p className="text-muted-foreground text-xs mt-1">
                                    MongoDB Atlas entegrasyonu ve dinamik mod sistemi eklendi.
                                </p>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-neon-green">
                                    {recentMods.length} Yeni Mod
                                </p>
                                <p className="text-muted-foreground text-xs mt-1">
                                    GTA V, Minecraft, CS:GO ve daha fazlası için modlar mevcut.
                                </p>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-neon-purple">TikTok Live Entegrasyonu</p>
                                <p className="text-muted-foreground text-xs mt-1">
                                    Gerçek zamanlı hediye takibi ve otomatik aksiyon sistemi aktif.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
