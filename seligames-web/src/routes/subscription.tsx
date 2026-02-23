import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import axios from 'axios'

export const Route = createFileRoute('/subscription')({
    component: SubscriptionPage,
})

const planFeatures = {
    free: ['1 mod aktif', '50 etkileşim/gün', 'Temel analitik', 'Topluluk desteği'],
    basic: ['5 mod aktif', '500 etkileşim/gün', 'Standart analitik', 'Email desteği', 'Reklamsız'],
    pro: ['20 mod aktif', 'Sınırsız etkileşim', 'Gelişmiş analitik', 'Öncelikli destek', 'Özel branding', 'API erişimi (sınırlı)'],
    ultra: ['Sınırsız mod', 'Sınırsız etkileşim', 'Gerçek zamanlı analitik', '24/7 destek', 'Tam API erişimi', 'White-label', 'Özel entegrasyonlar']
}

const planPrices = {
    free: 0,
    basic: 99,
    pro: 299,
    ultra: 599
}

function SubscriptionPage() {
    const [subscription, setSubscription] = useState(null)
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [autoRenew, setAutoRenew] = useState(false)

    useEffect(() => {
        loadSubscriptionData()
    }, [])

    const loadSubscriptionData = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                window.location.href = '/login'
                return
            }

            const [subRes, historyRes] = await Promise.all([
                axios.get('http://localhost:3000/api/subscription/status', {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('http://localhost:3000/api/subscription/history', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ])

            setSubscription(subRes.data.subscription)
            setAutoRenew(subRes.data.subscription.autoRenew)
            setPayments(historyRes.data.payments)
        } catch (error) {
            console.error('Error loading subscription:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpgrade = async (plan) => {
        try {
            const token = localStorage.getItem('token')
            await axios.post('http://localhost:3000/api/subscription/upgrade',
                { plan },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            alert(`${plan.toUpperCase()} planına yükseltme başarılı! Ödeme sayfasına yönlendiriliyorsunuz...`)
            loadSubscriptionData()
        } catch (error) {
            alert('Hata: ' + (error.response?.data?.error || error.message))
        }
    }

    const handleCancel = async () => {
        if (!confirm('Aboneliğinizi iptal etmek istediğinizden emin misiniz?')) return

        try {
            const token = localStorage.getItem('token')
            await axios.post('http://localhost:3000/api/subscription/cancel', {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            alert('Abonelik iptal edildi')
            loadSubscriptionData()
        } catch (error) {
            alert('Hata: ' + (error.response?.data?.error || error.message))
        }
    }

    const handleAutoRenewToggle = async () => {
        try {
            const token = localStorage.getItem('token')
            const newValue = !autoRenew
            await axios.post('http://localhost:3000/api/subscription/auto-renew',
                { autoRenew: newValue },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setAutoRenew(newValue)
        } catch (error) {
            alert('Hata: ' + (error.response?.data?.error || error.message))
        }
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <Typography variant="h5">Yükleniyor...</Typography>
            </Box>
        )
    }

    const getPlanColor = (plan) => {
        const colors = {
            free: '#9e9e9e',
            basic: '#2196f3',
            pro: '#00f0ff',
            ultra: '#ffd700'
        }
        return colors[plan] || '#9e9e9e'
    }

    const getStatusColor = (status) => {
        const colors = {
            active: 'success',
            trial: 'info',
            expired: 'error',
            cancelled: 'warning'
        }
        return colors[status] || 'default'
    }

    return (
        <Box sx={{ py: { xs: 4, md: 8 } }}>
            <Container maxWidth="lg">
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
                    Abonelik Yönetimi
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 6, textAlign: 'center' }}>
                    Mevcut planınızı görüntüleyin ve yönetin
                </Typography>

                {/* Current Subscription Card */}
                <Card sx={{ mb: 6, background: `linear-gradient(135deg, ${getPlanColor(subscription.plan)}22 0%, transparent 100%)`, border: `2px solid ${getPlanColor(subscription.plan)}` }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 3 }}>
                            <Box>
                                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                                    Mevcut Plan
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', color: getPlanColor(subscription.plan) }}>
                                    {subscription.plan}
                                </Typography>
                                <Chip
                                    label={subscription.status === 'active' ? 'Aktif' : subscription.status === 'trial' ? 'Deneme' : subscription.status === 'expired' ? 'Süresi Dolmuş' : 'İptal Edildi'}
                                    color={getStatusColor(subscription.status)}
                                    sx={{ mb: 2 }}
                                />
                                {subscription.daysRemaining !== null && (
                                    <Typography variant="h6" sx={{ color: subscription.daysRemaining < 7 ? 'error.main' : 'text.primary' }}>
                                        {subscription.daysRemaining > 0 ? `${subscription.daysRemaining} gün kaldı` : 'Süresi doldu'}
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ textAlign: 'right' }}>
                                {subscription.plan !== 'free' && (
                                    <>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Başlangıç: {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString('tr-TR') : '-'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Bitiş: {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('tr-TR') : '-'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                                            Sonraki Ödeme: {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString('tr-TR') : '-'}
                                        </Typography>
                                        <FormControlLabel
                                            control={<Switch checked={autoRenew} onChange={handleAutoRenewToggle} />}
                                            label="Otomatik Yenileme"
                                            sx={{ mt: 2 }}
                                        />
                                    </>
                                )}
                            </Box>
                        </Box>

                        {subscription.plan !== 'free' && subscription.status === 'active' && (
                            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Button variant="outlined" color="error" onClick={handleCancel}>
                                    Aboneliği İptal Et
                                </Button>
                            </Box>
                        )}
                    </CardContent>
                </Card>

                {/* Plan Comparison */}
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                    Planları Karşılaştır
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3, mb: 6 }}>
                    {Object.entries(planFeatures).map(([plan, features]) => (
                        <Card
                            key={plan}
                            sx={{
                                border: subscription.plan === plan ? `3px solid ${getPlanColor(plan)}` : '1px solid',
                                borderColor: subscription.plan === plan ? getPlanColor(plan) : 'divider',
                                position: 'relative'
                            }}
                        >
                            {subscription.plan === plan && (
                                <Chip
                                    label="Mevcut Plan"
                                    size="small"
                                    sx={{ position: 'absolute', top: 16, right: 16, bgcolor: getPlanColor(plan), color: '#000' }}
                                />
                            )}
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 1 }}>
                                    {plan}
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
                                    ₺{planPrices[plan]}
                                    <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
                                        /ay
                                    </Typography>
                                </Typography>
                                <Box sx={{ mb: 3 }}>
                                    {features.map((feature, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
                                            <Typography variant="body2">{feature}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                                {subscription.plan !== plan && (
                                    <Button
                                        fullWidth
                                        variant={plan === 'pro' ? 'contained' : 'outlined'}
                                        onClick={() => handleUpgrade(plan)}
                                        sx={plan === 'pro' ? {
                                            background: 'linear-gradient(135deg, #00f0ff 0%, #0088cc 100%)',
                                            '&:hover': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)' }
                                        } : {}}
                                    >
                                        {plan === 'free' ? 'Düşür' : 'Yükselt'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </Box>

                {/* Payment History */}
                {payments.length > 0 && (
                    <>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                            Ödeme Geçmişi
                        </Typography>
                        <TableContainer component={Paper} sx={{ mb: 4 }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tarih</TableCell>
                                        <TableCell>Plan</TableCell>
                                        <TableCell>Tutar</TableCell>
                                        <TableCell>Durum</TableCell>
                                        <TableCell>İşlem ID</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {payments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>{new Date(payment.paymentDate).toLocaleDateString('tr-TR')}</TableCell>
                                            <TableCell sx={{ textTransform: 'uppercase' }}>{payment.plan}</TableCell>
                                            <TableCell>₺{payment.amount} {payment.currency}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={payment.status === 'success' ? 'Başarılı' : payment.status === 'pending' ? 'Beklemede' : 'Başarısız'}
                                                    color={payment.status === 'success' ? 'success' : payment.status === 'pending' ? 'warning' : 'error'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                                {payment.transactionId || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </Container>
        </Box>
    )
}
