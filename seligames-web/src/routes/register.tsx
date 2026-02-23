import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Link from '@mui/material/Link'
import Alert from '@mui/material/Alert'
import { Link as RouterLink } from '@tanstack/react-router'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import api from '../lib/api'

export const Route = createFileRoute('/register')({
    component: RegisterPage,
})

function RegisterPage() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (password !== confirmPassword) {
            setError('Şifreler uyuşmuyor')
            return
        }
        try {
            await api.post('/auth/register', { username, email, password })
            navigate({ to: '/login' })
        } catch (err: any) {
            setError(err.response?.data?.error || 'Kayıt başarısız')
        }
    }

    return (
        <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 4, md: 6 },
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Box sx={{ textAlign: 'center', mb: 5 }}>
                    <PersonAddIcon sx={{ fontSize: 56, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
                        Üye Ol
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        Yeni hesap oluşturun ve başlayın
                    </Typography>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                        label="Kullanıcı Adı"
                        fullWidth
                        required
                        variant="outlined"
                        placeholder="kullaniciadi"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <TextField
                        label="E-posta"
                        type="email"
                        fullWidth
                        required
                        variant="outlined"
                        placeholder="ornek@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <TextField
                        label="Şifre"
                        type="password"
                        fullWidth
                        required
                        variant="outlined"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <TextField
                        label="Şifre Tekrar"
                        type="password"
                        fullWidth
                        required
                        variant="outlined"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        sx={{
                            py: 1.75,
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            mt: 2,
                        }}
                    >
                        Kayıt Ol
                    </Button>

                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Zaten hesabınız var mı?{' '}
                            <Link component={RouterLink} to="/login" sx={{ color: 'secondary.main', fontWeight: 600 }}>
                                Giriş Yap
                            </Link>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Container>
    )
}
