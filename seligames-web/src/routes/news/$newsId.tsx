import { createFileRoute } from '@tanstack/react-router'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonIcon from '@mui/icons-material/Person'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/news/$newsId')({
    component: NewsDetailPage,
})

// Mock data - gerçek uygulamada API'den gelecek
const newsData: Record<string, any> = {
    '1': {
        id: '1',
        title: 'TikTok Canlı Yayın Entegrasyonu Güncellendi',
        date: '2024-11-15',
        author: 'SeliGames Ekibi',
        views: 1250,
        category: 'Güncelleme',
        image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80',
        content: `
# Yeni Özellikler

TikTok Live Studio entegrasyonumuz tamamen yenilendi! Artık daha hızlı ve stabil bir bağlantı deneyimi sunuyoruz.

## Neler Değişti?

- **Gelişmiş Bağlantı Hızı**: Yayına bağlanma süresi %40 azaldı
- **Otomatik Yeniden Bağlanma**: Bağlantı koptuğunda otomatik olarak tekrar bağlanır
- **Daha İyi Hata Yönetimi**: Sorunları anında tespit edip bildiriyoruz
- **Gelişmiş Analitikler**: İzleyici etkileşimlerini daha detaylı takip edin

## Nasıl Kullanılır?

1. Dashboard'dan "TikTok Bağla" butonuna tıklayın
2. TikTok hesabınızla giriş yapın
3. İzinleri onaylayın
4. Hemen yayına başlayın!

## Performans İyileştirmeleri

Yeni sürümümüzle birlikte CPU kullanımı %30 azaldı ve bellek tüketimi optimize edildi. Artık daha uzun yayınlar yapabilir, sistem kaynaklarınızı daha verimli kullanabilirsiniz.

## Gelecek Güncellemeler

Önümüzdeki haftalarda YouTube Live ve Twitch entegrasyonlarını da ekleyeceğiz. Ayrıca özel mod geliştirme araçlarımızı da yayınlayacağız.
    `,
        tags: ['TikTok', 'Güncelleme', 'Entegrasyon'],
    },
    '2': {
        id: '2',
        title: 'Yeni Mod Paketi: Hediye Yağmuru 2.0',
        date: '2024-11-18',
        author: 'Mod Geliştirici',
        views: 2340,
        category: 'Mod',
        image: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&w=1200&q=80',
        content: `
# Hediye Yağmuru 2.0 Yayında!

En popüler modumuz Hediye Yağmuru'nun yeni versiyonu yayınlandı. Bu sürümde tamamen yeni efektler ve özelleştirme seçenekleri var.

## Yeni Özellikler

- **3D Efektler**: Hediyeler artık 3 boyutlu olarak ekranda görünüyor
- **Özel Animasyonlar**: Her hediye türü için özel animasyonlar
- **Ses Efektleri**: İsteğe bağlı ses efektleri ekledik
- **Renk Temaları**: 10+ farklı renk teması

## Kurulum

Mod'u indirmek için Dashboard'dan "Modlar" bölümüne gidin ve "Hediye Yağmuru 2.0" kartına tıklayın.
    `,
        tags: ['Mod', 'Hediye', 'Efekt'],
    },
}

const relatedNews = [
    {
        id: '3',
        title: 'YouTube Live Entegrasyonu Yakında',
        image: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=400&q=80',
        date: '2024-11-10',
    },
    {
        id: '4',
        title: 'Yeni Analitik Özellikleri',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80',
        date: '2024-11-08',
    },
]

function NewsDetailPage() {
    const { newsId } = Route.useParams()
    const news = newsData[newsId] || newsData['1']

    return (
        <Box sx={{ py: { xs: 4, md: 8 }, bgcolor: 'background.default' }}>
            <Container maxWidth="lg">
                {/* Header Image */}
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        height: { xs: 250, md: 400 },
                        borderRadius: 4,
                        overflow: 'hidden',
                        mb: 4,
                    }}
                >
                    <img
                        src={news.image}
                        alt={news.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
                            p: 4,
                        }}
                    >
                        <Chip
                            label={news.category}
                            sx={{
                                bgcolor: 'secondary.main',
                                color: '#000',
                                fontWeight: 700,
                                mb: 2,
                            }}
                        />
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 700,
                                color: 'white',
                                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                            }}
                        >
                            {news.title}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4 }}>
                    {/* Main Content */}
                    <Box>
                        {/* Meta Info */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 3,
                                mb: 4,
                                pb: 3,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                                    <PersonIcon sx={{ fontSize: 20, color: '#000' }} />
                                </Avatar>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    {news.author}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarTodayIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    {new Date(news.date).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    {news.views.toLocaleString('tr-TR')} görüntülenme
                                </Typography>
                            </Box>
                        </Box>

                        {/* Article Content */}
                        <Box
                            sx={{
                                '& h1': {
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    mb: 3,
                                    mt: 4,
                                    color: 'white',
                                },
                                '& h2': {
                                    fontSize: '1.5rem',
                                    fontWeight: 600,
                                    mb: 2,
                                    mt: 3,
                                    color: 'chrome.200',
                                },
                                '& p': {
                                    fontSize: '1.1rem',
                                    lineHeight: 1.8,
                                    mb: 2,
                                    color: 'text.primary',
                                },
                                '& ul, & ol': {
                                    mb: 3,
                                    pl: 3,
                                },
                                '& li': {
                                    fontSize: '1.1rem',
                                    lineHeight: 1.8,
                                    mb: 1,
                                    color: 'text.primary',
                                },
                            }}
                        >
                            {news.content.split('\n').map((paragraph: string, index: number) => {
                                if (paragraph.startsWith('# ')) {
                                    return (
                                        <Typography key={index} variant="h1">
                                            {paragraph.replace('# ', '')}
                                        </Typography>
                                    )
                                }
                                if (paragraph.startsWith('## ')) {
                                    return (
                                        <Typography key={index} variant="h2">
                                            {paragraph.replace('## ', '')}
                                        </Typography>
                                    )
                                }
                                if (paragraph.startsWith('- ')) {
                                    return (
                                        <Box component="li" key={index} sx={{ listStyle: 'none', position: 'relative', pl: 3 }}>
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: '0.6em',
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    bgcolor: 'secondary.main',
                                                }}
                                            />
                                            {paragraph.replace('- ', '')}
                                        </Box>
                                    )
                                }
                                if (paragraph.trim()) {
                                    return (
                                        <Typography key={index} variant="body1" paragraph>
                                            {paragraph}
                                        </Typography>
                                    )
                                }
                                return null
                            })}
                        </Box>

                        {/* Tags */}
                        <Divider sx={{ my: 4 }} />
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {news.tags.map((tag: string) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    variant="outlined"
                                    sx={{
                                        borderColor: 'chrome.700',
                                        color: 'chrome.300',
                                        '&:hover': {
                                            borderColor: 'secondary.main',
                                            bgcolor: 'rgba(0, 240, 255, 0.1)',
                                        },
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>

                    {/* Sidebar */}
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                            İlgili Haberler
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {relatedNews.map((item) => (
                                <Link
                                    key={item.id}
                                    to="/news/$newsId"
                                    params={{ newsId: item.id }}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <Card
                                        sx={{
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 8px 24px rgba(0, 240, 255, 0.2)',
                                            },
                                        }}
                                    >
                                        <CardMedia component="img" height="140" image={item.image} alt={item.title} />
                                        <CardContent>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'white' }}>
                                                {item.title}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                {new Date(item.date).toLocaleDateString('tr-TR')}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </Box>
                    </Box>
                </Box>
            </Container>
        </Box>
    )
}
