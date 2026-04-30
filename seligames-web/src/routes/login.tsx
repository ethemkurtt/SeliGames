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
import LoginIcon from '@mui/icons-material/Login'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export const Route = createFileRoute('/login')({
    component: LoginPage,
})

function LoginPage() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState('admin@seligames.com')
    const [password, setPassword] = useState('XkWT7eMFjRKXPKb3')
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        try {
            const res = await api.post('/auth/login', { email, password })
            login(res.data.token, res.data.user)
            navigate({ to: '/dashboard' })
        } catch (err: any) {
            setError(err.response?.data?.error || 'Giriş başarısız')
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
                    <LoginIcon sx={{ fontSize: 56, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
                        Giriş Yap
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        Hesabınıza giriş yaparak devam edin
                    </Typography>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                        Giriş Yap
                    </Button>

                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Hesabınız yok mu?{' '}
                            <Link component={RouterLink} to="/register" sx={{ color: 'secondary.main', fontWeight: 600 }}>
                                Kayıt Ol
                            </Link>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Container>
    )
}
