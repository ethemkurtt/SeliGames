import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Home, User as UserIcon, CreditCard, Download, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const items = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/profile', label: 'Profil', icon: UserIcon },
    { to: '/subscription', label: 'Abonelik', icon: CreditCard },
    { to: '/download', label: 'İndirme', icon: Download },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user, logout } = useAuth()
    const navigate = useNavigate()
    const { location } = useRouterState()

    useEffect(() => {
        if (!isAuthenticated) navigate({ to: '/login', search: { redirect: location.pathname } as any })
    }, [isAuthenticated, location.pathname, navigate])

    if (!isAuthenticated) return null

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside className="hidden md:flex w-64 flex-col bg-black/40 backdrop-blur-xl border-r border-white/10 sticky top-0 h-screen">
                <Link to="/" className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-gaming-gradient flex items-center justify-center font-black text-black">S</div>
                    <span className="font-heading text-lg font-black tracking-widest text-gaming-gradient">SELIGAMES</span>
                </Link>
                <nav className="flex-1 p-3 space-y-1">
                    {items.map((it) => {
                        const Icon = it.icon
                        const active = location.pathname === it.to || location.pathname.startsWith(it.to + '/')
                        return (
                            <Link key={it.to} to={it.to} className={cn(
                                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                                active ? 'bg-neon-green/10 text-neon-green border-l-2 border-neon-green' : 'text-white/70 hover:bg-white/5 hover:text-white'
                            )}>
                                <Icon size={18} /> {it.label}
                            </Link>
                        )
                    })}
                </nav>
                <div className="p-3 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div className="w-9 h-9 rounded-full bg-gaming-gradient flex items-center justify-center font-bold text-black">
                            {(user?.username || user?.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">{user?.username || user?.email?.split('@')[0]}</div>
                            <div className="text-xs text-white/50 truncate">{user?.email}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => { logout(); navigate({ to: '/' }) }}
                        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={16} /> Çıkış Yap
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0">{children}</main>
        </div>
    )
}
