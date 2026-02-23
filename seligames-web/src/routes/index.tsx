import { createFileRoute, Link } from '@tanstack/react-router'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import { motion } from 'framer-motion'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import RadioIcon from '@mui/icons-material/Radio'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'

export const Route = createFileRoute('/')({
    component: LandingPage,
})

function LandingPage() {
    return (
        <Box>
            {/* Hero Section */}
            <Box
                sx={{
                    position: 'relative',
                    minHeight: '85vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    py: { xs: 8, md: 12 },
                }}
            >
                {/* Background Image */}
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'url(https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=2000&q=80)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.15,
                        zIndex: 0,
                    }}
                />

                {/* Gradient Overlay */}
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to bottom, transparent 0%, rgba(10, 10, 10, 0.8) 50%, #0a0a0a 100%)',
                        zIndex: 1,
                    }}
                />

                <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    >
                        <Typography
                            variant="h1"
                            sx={{
                                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem', lg: '5rem' },
                                fontWeight: 700,
                                mb: 3,
                                background: 'linear-gradient(to bottom, #ffffff 0%, #a0a0a0 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textShadow: '0px 2px 4px rgba(0,0,0,0.3)',
                            }}
                        >
                            YAYINLARINI
                        </Typography>
                        <Typography
                            variant="h1"
                            sx={{
                                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem', lg: '5rem' },
                                fontWeight: 700,
                                mb: 4,
                                background: 'linear-gradient(135deg, #00f0ff 0%, #ffffff 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                filter: 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.5))',
                            }}
                        >
                            EFSANEYE DÖNÜŞTÜR
                        </Typography>

                        <Typography
                            variant="h5"
                            sx={{
                                color: 'chrome.300',
                                mb: 6,
                                maxWidth: 800,
                                mx: 'auto',
                                lineHeight: 1.8,
                                fontSize: { xs: '1.1rem', md: '1.3rem' },
                                px: 2,
                            }}
                        >
                            TikTok canlı yayınlarında izleyicilerinle etkileşime geçmenin en gelişmiş yolu.
                            <Box component="span" sx={{ color: 'white', fontWeight: 600 }}> SeliGames</Box> ile hediyeler oyuna, izleyiciler oyuncuya dönüşsün.
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to="/register" style={{ textDecoration: 'none' }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    sx={{
                                        px: 5,
                                        py: 2,
                                        fontSize: '1.125rem',
                                        background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
                                        color: '#000',
                                        fontWeight: 700,
                                        boxShadow: '0 0 30px rgba(255, 255, 255, 0.3)',
                                        '&:hover': {
                                            transform: 'scale(1.05)',
                                            boxShadow: '0 0 40px rgba(255, 255, 255, 0.5)',
                                        },
                                        transition: 'all 0.3s',
                                    }}
                                >
                                    Hemen Başla
                                </Button>
                            </Link>
                            <Link to="/mods" style={{ textDecoration: 'none' }}>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    sx={{
                                        px: 5,
                                        py: 2,
                                        fontSize: '1.125rem',
                                        borderColor: 'rgba(255, 255, 255, 0.2)',
                                        color: 'white',
                                        backdropFilter: 'blur(10px)',
                                        '&:hover': {
                                            borderColor: 'rgba(255, 255, 255, 0.4)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        },
                                    }}
                                >
                                    Modları İncele
                                </Button>
                            </Link>
                        </Box>
                    </motion.div>
                </Container>
            </Box>

            {/* Features Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                        gap: 4,
                    }}
                >
                    <FeatureCard
                        icon={<CardGiftcardIcon sx={{ fontSize: 48, color: 'secondary.main' }} />}
                        title="İnteraktif Hediyeler"
                        description="İzleyicilerin gönderdiği güller, asalar ve jetonlar oyunun kaderini değiştirsin."
                    />
                    <FeatureCard
                        icon={<RadioIcon sx={{ fontSize: 48, color: 'white' }} />}
                        title="Canlı Entegrasyon"
                        description="TikTok Live Studio ile saniyeler içinde bağlantı kurun. Gecikmesiz etkileşim."
                    />
                    <FeatureCard
                        icon={<EmojiEventsIcon sx={{ fontSize: 48, color: 'chrome.400' }} />}
                        title="Sıralama Sistemi"
                        description="En çok destek veren izleyicilerini ekranda göster, rekabeti kızıştır."
                    />
                </Box>
            </Container>

            {/* Stats Section */}
            <Box sx={{ py: { xs: 8, md: 12 }, borderY: 1, borderColor: 'divider', bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
                <Container maxWidth="lg">
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                            gap: 4,
                            textAlign: 'center',
                        }}
                    >
                        <StatItem number="10K+" label="Aktif Yayıncı" />
                        <StatItem number="500K+" label="Günlük Etkileşim" />
                        <StatItem number="50+" label="Özel Mod" />
                        <StatItem number="7/24" label="Canlı Destek" />
                    </Box>
                </Container>
            </Box>

            {/* CTA Section */}
            <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}>
                <Card
                    sx={{
                        p: { xs: 4, md: 8 },
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(0, 240, 255, 0.05) 100%)',
                        border: '1px solid rgba(0, 240, 255, 0.2)',
                    }}
                >
                    <CardContent>
                        <Typography variant="h3" sx={{ mb: 3, fontWeight: 700, color: 'white' }}>
                            Yayıncılık Kariyerini Zirveye Taşı
                        </Typography>
                        <Typography variant="h6" sx={{ mb: 5, color: 'chrome.300', lineHeight: 1.8 }}>
                            Binlerce yayıncı SeliGames ile gelirlerini ve izleyici sayılarını artırdı. Sen de aramıza katıl.
                        </Typography>
                        <Link to="/register" style={{ textDecoration: 'none' }}>
                            <Button
                                variant="contained"
                                size="large"
                                sx={{
                                    px: 6,
                                    py: 2.5,
                                    fontSize: '1.25rem',
                                    background: 'linear-gradient(135deg, #00f0ff 0%, #0088cc 100%)',
                                    color: 'white',
                                    fontWeight: 700,
                                    boxShadow: '0 0 40px rgba(0, 240, 255, 0.4)',
                                    '&:hover': {
                                        boxShadow: '0 0 60px rgba(0, 240, 255, 0.6)',
                                        transform: 'scale(1.05)',
                                    },
                                    transition: 'all 0.3s',
                                }}
                            >
                                Ücretsiz Kayıt Ol
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <Card
            sx={{
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                    transform: 'translateY(-8px)',
                },
            }}
        >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box
                    sx={{
                        mb: 3,
                        p: 2,
                        display: 'inline-flex',
                        borderRadius: 3,
                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                        transition: 'all 0.3s',
                        '&:hover': {
                            bgcolor: 'rgba(0, 240, 255, 0.1)',
                        },
                    }}
                >
                    {icon}
                </Box>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: 'white' }}>
                    {title}
                </Typography>
                <Typography variant="body1" sx={{ color: 'chrome.400', lineHeight: 1.8 }}>
                    {description}
                </Typography>
            </CardContent>
        </Card>
    )
}

function StatItem({ number, label }: { number: string; label: string }) {
    return (
        <Box>
            <Typography
                variant="h2"
                sx={{
                    fontWeight: 700,
                    mb: 1,
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    color: 'white',
                }}
            >
                {number}
            </Typography>
            <Typography
                variant="body2"
                sx={{
                    color: 'chrome.500',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1.5,
                    fontSize: '0.875rem',
                }}
            >
                {label}
            </Typography>
        </Box>
    )
}
