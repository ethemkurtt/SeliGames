import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Box, Grid, Typography, CircularProgress } from '@mui/material'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

export const Route = createFileRoute('/mods/')({
    component: ModsIndex,
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
}

function ModsIndex() {
    const [mods, setMods] = useState<Mod[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchMods()
    }, [])

    const fetchMods = async () => {
        try {
            const response = await api.get('/mods')
            setMods(response.data)
        } catch (error) {
            console.error('Modlar yüklenemedi:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredMods = mods.filter(mod =>
        mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.gameTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <Box className="container mx-auto px-4 py-16 text-center">
                <CircularProgress sx={{ color: 'var(--color-neon-green)' }} size={60} />
                <Typography className="mt-4 text-neon-green">Modlar yükleniyor...</Typography>
            </Box>
        )
    }

    return (
        <Box className="container mx-auto px-4 py-8">
            <Box className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <Box>
                    <Typography variant="h4" className="font-heading font-bold text-neon-green">
                        Oyun Modları
                    </Typography>
                    <Typography className="text-muted-foreground mt-2">
                        {mods.length} mod mevcut • TikTok Live entegrasyonlu
                    </Typography>
                </Box>
                <Box className="w-full md:w-96">
                    <Input
                        placeholder="Mod veya oyun ara..."
                        className="bg-black/50 border-white/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </Box>
            </Box>

            {filteredMods.length === 0 && searchQuery && (
                <Box className="text-center py-16">
                    <Typography className="text-muted-foreground text-lg">
                        "{searchQuery}" için sonuç bulunamadı
                    </Typography>
                </Box>
            )}

            <Grid container spacing={3}>
                {filteredMods.map((mod) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={mod._id}>
                        <Card className="overflow-hidden border-white/10 hover:border-neon-green transition-colors group">
                            <Box className="aspect-video relative overflow-hidden">
                                <img
                                    src={mod.imageUrl || `https://placehold.co/600x400/1a1a1a/39ff14?text=${encodeURIComponent(mod.gameTitle)}`}
                                    alt={mod.title}
                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                                />
                                <Box className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <Box className="absolute top-2 right-2">
                                    <Box className="bg-neon-purple/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold">
                                        v{mod.version}
                                    </Box>
                                </Box>
                            </Box>
                            <CardHeader className="p-4">
                                <CardTitle className="text-lg">{mod.title}</CardTitle>
                                <Typography variant="body2" className="text-muted-foreground mt-1">
                                    {mod.gameTitle} • {mod.category || 'Genel'}
                                </Typography>
                                <Typography variant="body2" className="text-sm mt-2 line-clamp-2">
                                    {mod.description}
                                </Typography>
                            </CardHeader>
                            <CardFooter className="p-4 pt-0 flex justify-between items-center">
                                <Typography variant="caption" className="text-neon-green">
                                    {mod.downloadCount} indirme
                                </Typography>
                                <Link to="/mods/$modId" params={{ modId: mod._id }}>
                                    <Button size="sm" variant="outline" className="hover:bg-neon-green hover:text-black border-neon-green text-neon-green">
                                        İncele
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {mods.length === 0 && !loading && (
                <Box className="text-center py-16">
                    <Typography className="text-muted-foreground text-lg">
                        Henüz mod eklenmemiş
                    </Typography>
                </Box>
            )}
        </Box>
    )
}
