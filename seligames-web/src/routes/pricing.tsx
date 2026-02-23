import { createFileRoute, Link } from '@tanstack/react-router'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Chip from '@mui/material/Chip'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import StarIcon from '@mui/icons-material/Star'

export const Route = createFileRoute('/pricing')({
    component: PricingPage,
})

const pricingPlans = [
    {
        name: 'Basic',
        price: '₺99',
        period: '/ay',
        description: 'Yeni başlayanlar için ideal',
        features: [
            '5 Aktif Mod',
            '100 İzleyici Etkileşimi/Gün',
            'Temel Analitikler',
            'E-posta Desteği',
            'TikTok Entegrasyonu',
        ],
        color: '#9e9e9e',
        popular: false,
    },
    {
        name: 'Pro',
        price: '₺299',
        period: '/ay',
        description: 'Profesyonel yayıncılar için',
        features: [
            '20 Aktif Mod',
            'Sınırsız Etkileşim',
            'Gelişmiş Analitikler',
            'Öncelikli Destek',
            'TikTok + YouTube Entegrasyonu',
            'Özel Mod Geliştirme',
            'Reklamsız Deneyim',
        ],
        color: '#00f0ff',
        popular: true,
    },
    {
        name: 'Ultra',
        price: '₺599',
        period: '/ay',
        description: 'Kurumsal çözümler',
        features: [
            'Sınırsız Mod',
            'Sınırsız Etkileşim',
            'Premium Analitikler & Raporlar',
            '7/24 Özel Destek',
            'Tüm Platform Entegrasyonları',
            'API Erişimi',
            'Özel Branding',
            'Öncelikli Yeni Özellikler',
            'Özel Eğitim & Danışmanlık',
        ],
        color: '#ffffff',
        popular: false,
    },
]

function PricingPage() {
    return (
        <Box sx={{ py: { xs: 6, md: 10 } }}>
            <Container maxWidth="lg">
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography
                        variant="h2"
                        sx={{
                            fontWeight: 700,
                            mb: 2,
                            background: 'linear-gradient(135deg, #ffffff 0%, #9e9e9e 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Fiyatlandırma
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto' }}>
                        İhtiyacınıza uygun planı seçin ve yayıncılık kariyerinizi bir üst seviyeye taşıyın
                    </Typography>
                </Box>

                {/* Pricing Cards */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                        gap: 4,
                        mb: 8,
                    }}
                >
                    {pricingPlans.map((plan) => (
                        <Card
                            key={plan.name}
                            sx={{
                                position: 'relative',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                border: plan.popular ? `2px solid ${plan.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                                transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                                transition: 'all 0.3s',
                                '&:hover': {
                                    transform: plan.popular ? 'scale(1.08)' : 'scale(1.03)',
                                    borderColor: plan.color,
                                },
                            }}
                        >
                            {plan.popular && (
                                <Chip
                                    icon={<StarIcon />}
                                    label="En Popüler"
                                    sx={{
                                        position: 'absolute',
                                        top: -12,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        bgcolor: plan.color,
                                        color: '#000',
                                        fontWeight: 700,
                                        px: 2,
                                    }}
                                />
                            )}

                            <CardContent sx={{ flex: 1, p: 4 }}>
                                {/* Plan Name */}
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 700,
                                        mb: 1,
                                        color: plan.color,
                                        fontFamily: 'Orbitron',
                                    }}
                                >
                                    {plan.name}
                                </Typography>

                                {/* Description */}
                                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                                    {plan.description}
                                </Typography>

                                {/* Price */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: '3rem',
                                            fontWeight: 700,
                                            color: 'white',
                                            fontFamily: 'Orbitron',
                                        }}
                                    >
                                        {plan.price}
                                    </Typography>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: '1.25rem',
                                            color: 'text.secondary',
                                            ml: 1,
                                        }}
                                    >
                                        {plan.period}
                                    </Typography>
                                </Box>

                                {/* Features */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {plan.features.map((feature, index) => (
                                        <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                            <CheckCircleIcon
                                                sx={{
                                                    color: plan.color,
                                                    fontSize: 20,
                                                    mt: 0.25,
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
                                                {feature}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </CardContent>

                            <CardActions sx={{ p: 4, pt: 0 }}>
                                <Button
                                    fullWidth
                                    variant={plan.popular ? 'contained' : 'outlined'}
                                    size="large"
                                    sx={{
                                        py: 1.75,
                                        fontSize: '1.1rem',
                                        fontWeight: 700,
                                        ...(plan.popular
                                            ? {
                                                background: `linear-gradient(135deg, ${plan.color} 0%, #0088cc 100%)`,
                                                color: '#000',
                                                '&:hover': {
                                                    boxShadow: `0 0 30px ${plan.color}40`,
                                                },
                                            }
                                            : {
                                                borderColor: plan.color,
                                                color: plan.color,
                                                '&:hover': {
                                                    borderColor: plan.color,
                                                    bgcolor: `${plan.color}10`,
                                                },
                                            }),
                                    }}
                                >
                                    Satın Al
                                </Button>
                            </CardActions>
                        </Card>
                    ))}
                </Box>

                {/* FAQ or Additional Info */}
                <Box
                    sx={{
                        textAlign: 'center',
                        p: 6,
                        borderRadius: 4,
                        bgcolor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                >
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                        Tüm planlarda 14 gün ücretsiz deneme!
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                        Kredi kartı bilgisi gerekmez. İstediğiniz zaman iptal edebilirsiniz.
                    </Typography>
                    <Link to="/register" style={{ textDecoration: 'none' }}>
                        <Button
                            variant="outlined"
                            size="large"
                            sx={{
                                borderColor: 'white',
                                color: 'white',
                                px: 5,
                                '&:hover': {
                                    borderColor: 'white',
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                },
                            }}
                        >
                            Hemen Başla
                        </Button>
                    </Link>
                </Box>
            </Container>
        </Box>
    )
}
