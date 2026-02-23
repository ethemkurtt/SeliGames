import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Box, Tabs, Tab, Typography, CircularProgress, Chip } from '@mui/material'
import { useState, useEffect } from 'react'
import DownloadIcon from '@mui/icons-material/Download'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import api from '@/lib/api'

export const Route = createFileRoute('/mods/$modId')({
    component: ModDetail,
})

interface Mod {
    _id: string
    title: string
    description: string
    version: string
    downloadUrl: string
    imageUrl?: string
    gameTitle: string
    category?: string
    tags?: string[]
    downloadCount: number
    createdAt: string
    updatedAt: string
}

function ModDetail() {
    const { modId } = useParams({ from: '/mods/$modId' })
    const [mod, setMod] = useState<Mod | null>(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState(0)

    useEffect(() => {
        fetchMod()
    }, [modId])

    const fetchMod = async () => {
        try {
            const response = await api.get(`/mods/${modId}`)
            setMod(response.data)
        } catch (error) {
            console.error('Mod yüklenemedi:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue)
    }

    const handleDownload = () => {
        if (mod?.downloadUrl) {
            window.open(mod.downloadUrl, '_blank')
        }
    }

    if (loading) {
        return (
            <Box className="container mx-auto px-4 py-16 text-center">
                <CircularProgress sx={{ color: 'var(--color-neon-green)' }} size={60} />
                <Typography className="mt-4 text-neon-green">Mod yükleniyor...</Typography>
            </Box>
        )
    }

    if (!mod) {
        return (
            <Box className="container mx-auto px-4 py-16 text-center">
                <Typography variant="h5" className="text-muted-foreground mb-4">
                    Mod bulunamadı
                </Typography>
                <Link to="/mods">
                    <Button variant="outline" className="border-neon-green text-neon-green">
                        Modlar Listesine Dön
                    </Button>
                </Link>
            </Box>
        )
    }

    return (
        <Box className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <Box className="mb-4">
                <Link to="/mods">
                    <Button variant="ghost" startIcon={<ArrowBackIcon />} className="text-neon-green">
                        Modlar Listesi
                    </Button>
                </Link>
            </Box>

            {/* Header */}
            <Card className="overflow-hidden border-neon-blue/30 mb-8">
                <Box className="relative h-64 w-full">
                    <img
                        src={mod.imageUrl || `https://placehold.co/800x400/1a1a1a/39ff14?text=${encodeURIComponent(mod.gameTitle)}`}
                        alt={mod.title}
                        className="object-cover w-full h-full"
                    />
                    <Box className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                    <Box className="absolute bottom-4 left-6 z-20 text-white">
                        <Typography variant="h3" className="font-heading font-bold neon-text-blue mb-2">
                            {mod.title}
                        </Typography>
                        <Box className="flex gap-2 flex-wrap items-center">
                            <Chip
                                label={mod.gameTitle}
                                sx={{
                                    bgcolor: 'rgba(0, 240, 255, 0.2)',
                                    color: 'var(--color-neon-blue)',
                                    border: '1px solid var(--color-neon-blue)',
                                }}
                            />
                            {mod.category && (
                                <Chip
                                    label={mod.category}
                                    variant="outlined"
                                    sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                                />
                            )}
                            <Chip
                                label={`v${mod.version}`}
                                sx={{ bgcolor: 'rgba(189, 0, 255, 0.2)', color: 'var(--color-neon-purple)' }}
                            />
                            <Typography variant="body2" className="text-gray-300">
                                {mod.downloadCount} indirme
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <CardContent className="p-6">
                    <Tabs value={tab} onChange={handleChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                        <Tab label="Açıklama" />
                        <Tab label="Özellikler" />
                        <Tab label="Bilgiler" />
                    </Tabs>

                    {tab === 0 && (
                        <Box className="mt-4">
                            <Typography variant="body1" className="text-gray-300 leading-relaxed mb-6">
                                {mod.description}
                            </Typography>

                            {mod.tags && mod.tags.length > 0 && (
                                <Box className="mt-6">
                                    <Typography variant="h6" className="mb-3 text-neon-green">
                                        Etiketler
                                    </Typography>
                                    <Box className="flex gap-2 flex-wrap">
                                        {mod.tags.map((tag, i) => (
                                            <Chip
                                                key={i}
                                                label={`#${tag}`}
                                                size="small"
                                                sx={{
                                                    bgcolor: 'rgba(57, 255, 20, 0.1)',
                                                    color: 'var(--color-neon-green)',
                                                    border: '1px solid rgba(57, 255, 20, 0.3)',
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}

                    {tab === 1 && (
                        <Box className="mt-4">
                            <Card className="mb-4 border-white/10">
                                <CardContent className="p-4">
                                    <Typography variant="h6" className="text-neon-purple mb-3">
                                        ✨ Özellikler
                                    </Typography>
                                    <ul className="space-y-2 text-gray-300">
                                        <li className="flex items-center gap-2">
                                            <span className="text-neon-green">✓</span> TikTok Live entegrasyonu
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-neon-green">✓</span> Gerçek zamanlı hediye takibi
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-neon-green">✓</span> Özelleştirilebilir aksiyonlar
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-neon-green">✓</span> Kolay kurulum
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-neon-green">✓</span> Otomatik güncelleme
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card className="border-white/10">
                                <CardContent className="p-4">
                                    <Typography variant="h6" className="text-neon-blue mb-3">
                                        📋 Kurulum Adımları
                                    </Typography>
                                    <ol className="space-y-2 text-gray-300 list-decimal list-inside">
                                        <li>Mod dosyasını indirin</li>
                                        <li>Oyun dizinine çıkartın</li>
                                        <li>SeliGames uygulamasını açın</li>
                                        <li>TikTok hesabınızı bağlayın</li>
                                        <li>Modu etkinleştirin ve oynamaya başlayın!</li>
                                    </ol>
                                </CardContent>
                            </Card>
                        </Box>
                    )}

                    {tab === 2 && (
                        <Box className="mt-4">
                            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="border-white/10">
                                    <CardHeader>
                                        <CardTitle className="text-sm">Oyun</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Typography className="text-neon-blue font-bold">{mod.gameTitle}</Typography>
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10">
                                    <CardHeader>
                                        <CardTitle className="text-sm">Versiyon</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Typography className="text-neon-purple font-bold">v{mod.version}</Typography>
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10">
                                    <CardHeader>
                                        <CardTitle className="text-sm">Kategori</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Typography className="text-neon-green font-bold">
                                            {mod.category || 'Genel'}
                                        </Typography>
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10">
                                    <CardHeader>
                                        <CardTitle className="text-sm">Toplam İndirme</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Typography className="text-neon-yellow font-bold">
                                            {mod.downloadCount}
                                        </Typography>
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10">
                                    <CardHeader>
                                        <CardTitle className="text-sm">Oluşturulma</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Typography className="text-gray-300">
                                            {new Date(mod.createdAt).toLocaleDateString('tr-TR')}
                                        </Typography>
                                    </CardContent>
                                </Card>

                                <Card className="border-white/10">
                                    <CardHeader>
                                        <CardTitle className="text-sm">Son Güncelleme</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Typography className="text-gray-300">
                                            {new Date(mod.updatedAt).toLocaleDateString('tr-TR')}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        </Box>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between p-6 bg-black/20">
                    <Link to="/mods">
                        <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                            Geri Dön
                        </Button>
                    </Link>
                    <Button
                        variant="neon"
                        onClick={handleDownload}
                        startIcon={<DownloadIcon />}
                        className="px-8"
                    >
                        İndir
                    </Button>
                </CardFooter>
            </Card>
        </Box>
    )
}
