import { Link } from '@tanstack/react-router'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import HomeIcon from '@mui/icons-material/Home'
import NewspaperIcon from '@mui/icons-material/Newspaper'
import DashboardIcon from '@mui/icons-material/Dashboard'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import DownloadIcon from '@mui/icons-material/Download'
import LoginIcon from '@mui/icons-material/Login'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import CardMembershipIcon from '@mui/icons-material/CardMembership'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'

export function Navbar() {
    return (
        <AppBar position="sticky" elevation={0}>
            <Container maxWidth="xl">
                <Toolbar sx={{ minHeight: { xs: 70, md: 80 }, gap: 2 }}>
                    {/* Logo */}
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                background: 'linear-gradient(135deg, #f5f5f5 0%, #757575 100%)',
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 2,
                                transition: 'all 0.3s',
                                '&:hover': {
                                    boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
                                    transform: 'scale(1.05)',
                                },
                            }}
                        >
                            <Typography variant="h5" sx={{ color: '#000', fontWeight: 700, fontFamily: 'Orbitron' }}>
                                S
                            </Typography>
                        </Box>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                fontFamily: 'Orbitron',
                                letterSpacing: 2,
                                color: 'white',
                                transition: 'color 0.3s',
                                '&:hover': {
                                    color: 'chrome.200',
                                },
                            }}
                        >
                            SELI<span style={{ color: '#9e9e9e' }}>GAMES</span>
                        </Typography>
                    </Link>

                    {/* Desktop Menu */}
                    <Box
                        sx={{
                            display: { xs: 'none', md: 'flex' },
                            gap: 0.5,
                            ml: 4,
                            flex: 1,
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 8,
                            padding: 0.5,
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                    >
                        <NavButton to="/" icon={<HomeIcon />} label="Anasayfa" />
                        <NavButton to="/goals" icon={<TrackChangesIcon />} label="Goals" />
                        <NavButton to="/pricing" icon={<MonetizationOnIcon />} label="Fiyatlandırma" />
                        <NavButton to="/subscription" icon={<CardMembershipIcon />} label="Abonelik" />
                        <NavButton to="/news" icon={<NewspaperIcon />} label="Haberler" />
                        <NavButton to="/mods" icon={<DashboardIcon />} label="Modlar" />
                        <NavButton to="/tips" icon={<LightbulbIcon />} label="İpuçları" />
                        <NavButton to="/download" icon={<DownloadIcon />} label="İndir" />
                    </Box>

                    {/* Auth Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
                        <Link to="/login" style={{ textDecoration: 'none' }}>
                            <Button
                                variant="text"
                                startIcon={<LoginIcon />}
                                sx={{
                                    color: 'chrome.300',
                                    '&:hover': {
                                        color: 'white',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    },
                                }}
                            >
                                Giriş Yap
                            </Button>
                        </Link>
                        <Link to="/register" style={{ textDecoration: 'none' }}>
                            <Button
                                variant="contained"
                                startIcon={<PersonAddIcon />}
                                sx={{
                                    background: 'linear-gradient(135deg, #f5f5f5 0%, #9e9e9e 100%)',
                                    color: '#000',
                                    fontWeight: 700,
                                    px: 3,
                                    '&:hover': {
                                        boxShadow: '0 4px 20px rgba(255, 255, 255, 0.2)',
                                        transform: 'scale(1.05)',
                                    },
                                    transition: 'all 0.3s',
                                }}
                            >
                                Üye Ol
                            </Button>
                        </Link>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    )
}

function NavButton({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    return (
        <Link to={to} style={{ textDecoration: 'none' }}>
            <Button
                startIcon={icon}
                sx={{
                    color: 'chrome.300',
                    px: 2.5,
                    py: 1,
                    borderRadius: 6,
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    '&:hover': {
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&.active': {
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                }}
            >
                {label}
            </Button>
        </Link>
    )
}
