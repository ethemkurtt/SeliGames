import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, User as UserIcon, LogOut, Shield, Download } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
    { to: '/', label: 'Ana Sayfa' },
    { to: '/features', label: 'Özellikler' },
    { to: '/mods', label: 'Modlar' },
    { to: '/download', label: 'İndir' },
]

export function Navbar() {
    const { isAuthenticated, user, logout } = useAuth()
    const navigate = useNavigate()
    const { location } = useRouterState()
    const [open, setOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12)
        onScroll()
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => { setOpen(false); setMenuOpen(false) }, [location.pathname])

    const isAdmin = user?.role === 'admin'

    return (
        <header className={cn(
            'fixed top-0 inset-x-0 z-50 transition-all duration-300',
            scrolled ? 'bg-black/70 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
        )}>
            <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
                {/* Brand */}
                <Link to="/" className="flex items-center group">
                    <img src="/app-logo.png" alt="SeliGames" className="h-12 sm:h-14 w-auto group-hover:scale-105 transition-transform drop-shadow-[0_0_14px_rgba(0,255,157,0.35)]" />
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => {
                        const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                                    active
                                        ? 'text-neon-green bg-neon-green/10'
                                        : 'text-white/70 hover:text-white hover:bg-white/5'
                                )}
                            >
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Right cluster */}
                <div className="hidden md:flex items-center gap-3">
                    {isAuthenticated && user ? (
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen((v) => !v)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-neon-green/40 hover:bg-white/10 transition-all"
                            >
                                <div className="w-7 h-7 rounded-full bg-gaming-gradient flex items-center justify-center font-bold text-black text-sm">
                                    {(user.username || user.email || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-semibold">{user.username || user.email?.split('@')[0]}</span>
                                {isAdmin && <span className="text-[10px] font-black tracking-widest text-neon-purple bg-neon-purple/10 border border-neon-purple/30 px-1.5 py-0.5 rounded">ADMIN</span>}
                            </button>
                            <AnimatePresence>
                                {menuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                        className="absolute right-0 mt-2 w-56 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
                                    >
                                        <DropItem to="/dashboard" icon={<UserIcon size={16} />}>Dashboard</DropItem>
                                        <DropItem to="/profile" icon={<UserIcon size={16} />}>Profil</DropItem>
                                        <DropItem to="/download" icon={<Download size={16} />}>İndirme</DropItem>
                                        {isAdmin && (
                                            <>
                                                <div className="h-px bg-white/10 my-1" />
                                                <DropItem to="/admin" icon={<Shield size={16} />}>Admin Paneli</DropItem>
                                            </>
                                        )}
                                        <div className="h-px bg-white/10 my-1" />
                                        <button
                                            onClick={() => { logout(); navigate({ to: '/' }) }}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            <LogOut size={16} /> Çıkış Yap
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="px-4 py-2 rounded-lg text-sm font-semibold text-white/80 hover:text-white transition-colors"
                            >
                                Giriş Yap
                            </Link>
                            <Link
                                to="/register"
                                className="px-5 py-2 rounded-lg text-sm font-bold bg-gaming-gradient text-black shadow-lg shadow-neon-green/30 hover:shadow-neon-green/50 hover:scale-105 transition-all"
                            >
                                Üye Ol
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile toggle */}
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
                    aria-label="menu"
                >
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden overflow-hidden bg-black/95 backdrop-blur-xl border-b border-white/10"
                    >
                        <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className="px-4 py-3 rounded-lg text-base font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    {item.label}
                                </Link>
                            ))}
                            <div className="h-px bg-white/10 my-2" />
                            {isAuthenticated && user ? (
                                <>
                                    <Link to="/dashboard" className="px-4 py-3 rounded-lg text-base font-semibold hover:bg-white/5">Dashboard</Link>
                                    <Link to="/profile" className="px-4 py-3 rounded-lg text-base font-semibold hover:bg-white/5">Profil</Link>
                                    {isAdmin && <Link to="/admin" className="px-4 py-3 rounded-lg text-base font-semibold text-neon-purple hover:bg-neon-purple/10">Admin Paneli</Link>}
                                    <button
                                        onClick={() => { logout(); navigate({ to: '/' }) }}
                                        className="w-full text-left px-4 py-3 rounded-lg text-base font-semibold text-red-400 hover:bg-red-500/10"
                                    >Çıkış Yap</button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="px-4 py-3 rounded-lg text-base font-semibold hover:bg-white/5">Giriş Yap</Link>
                                    <Link to="/register" className="px-4 py-3 rounded-lg text-base font-bold bg-gaming-gradient text-black text-center">Üye Ol</Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}

function DropItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <Link to={to} className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors">
            {icon} {children}
        </Link>
    )
}
