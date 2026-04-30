import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { LayoutDashboard, Users, Boxes, CreditCard, Settings, LogOut, ExternalLink } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const items = [
    { to: '/admin', label: 'Genel Bakış', icon: LayoutDashboard, exact: true },
    { to: '/admin/users', label: 'Kullanıcılar', icon: Users },
    { to: '/admin/mods', label: 'Modlar', icon: Boxes },
    { to: '/admin/subscriptions', label: 'Abonelikler', icon: CreditCard },
    { to: '/admin/settings', label: 'Site Ayarları', icon: Settings },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, logout } = useAuth()
    const navigate = useNavigate()
    const { location } = useRouterState()

    useEffect(() => {
        if (!isAuthenticated) {
            navigate({ to: '/login', search: { redirect: location.pathname } as any })
        } else if (user && user.role !== 'admin') {
            navigate({ to: '/dashboard' })
        }
    }, [isAuthenticated, user, location.pathname, navigate])

    if (!isAuthenticated || (user && user.role !== 'admin')) return null

    return (
        <div className="min-h-screen flex">
            <aside className="w-64 flex-col bg-gradient-to-b from-black/80 to-black/40 backdrop-blur-xl border-r border-neon-purple/20 sticky top-0 h-screen hidden md:flex">
                <Link to="/admin" className="flex items-center gap-2 px-5 h-16 border-b border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center font-black text-white shadow-lg shadow-neon-purple/30">A</div>
                    <div>
                        <div className="font-heading text-base font-black tracking-widest text-white">ADMIN</div>
                        <div className="text-[10px] text-white/40 -mt-1">SeliGames Panel</div>
                    </div>
                </Link>

                <nav className="flex-1 p-3 space-y-1">
                    {items.map((it) => {
                        const Icon = it.icon
                        const active = it.exact
                            ? location.pathname === it.to
                            : (location.pathname === it.to || location.pathname.startsWith(it.to + '/'))
                        return (
                            <Link key={it.to} to={it.to} className={cn(
                                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                                active ? 'bg-neon-purple/10 text-neon-purple border-l-2 border-neon-purple' : 'text-white/70 hover:bg-white/5 hover:text-white'
                            )}>
                                <Icon size={18} /> {it.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-3 border-t border-white/10 space-y-2">
                    <Link to="/" className="flex items-center justify-between px-4 py-2 rounded-lg text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white transition-colors">
                        <span>Site'ye Dön</span> <ExternalLink size={14} />
                    </Link>
                    <button
                        onClick={() => { logout(); navigate({ to: '/' }) }}
                        className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={14} /> Çıkış Yap
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0 bg-black/20">{children}</main>
        </div>
    )
}
