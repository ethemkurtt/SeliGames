import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CreditCard, Loader2, Search } from 'lucide-react'
import api from '@/lib/api'

export const Route = createFileRoute('/admin/subscriptions')({
    component: SubsAdmin,
})

function SubsAdmin() {
    const [users, setUsers] = useState<any[]>([])
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => { load() }, [q])
    async function load() {
        setLoading(true)
        try {
            const r = await api.get('/admin/users', { params: { q, plan: 'all', role: 'all', limit: 200 } })
            const all = r.data?.users || []
            setUsers(all.filter((u: any) => u.subscriptionPlan && u.subscriptionPlan !== 'free'))
        } finally { setLoading(false) }
    }

    return (
        <div className="p-6 sm:p-10">
            <h1 className="font-heading text-3xl sm:text-4xl font-black mb-1">Abonelik <span className="text-neon-purple">Yönetimi</span></h1>
            <p className="text-white/60 mb-6">Aktif paid abonelerin listesi</p>

            <div className="relative mb-6 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email/kullanıcı ara..." className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-input border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-neon-purple/40" />
            </div>

            <div className="rounded-2xl bg-card border border-white/10 overflow-hidden">
                {loading ? (
                    <div className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></div>
                ) : users.length === 0 ? (
                    <div className="text-center py-10 text-white/50 text-sm">Aktif paid abone yok</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-white/5">
                            <tr className="text-left text-white/60 text-xs uppercase tracking-widest">
                                <th className="px-4 py-3">Kullanıcı</th>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Durum</th>
                                <th className="px-4 py-3">Bitiş</th>
                                <th className="px-4 py-3">Otomatik</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => {
                                const planPrices: any = { basic: 99, pro: 299, ultra: 599 }
                                return (
                                    <tr key={u._id} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold">{u.username || '—'}</div>
                                            <div className="text-xs text-white/50">{u.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded bg-neon-purple/10 text-neon-purple text-xs uppercase font-bold">{u.subscriptionPlan}</span>
                                            <span className="text-xs text-white/50 ml-2">₺{planPrices[u.subscriptionPlan] || 0}/ay</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${u.subscriptionStatus === 'active' ? 'bg-neon-green/10 text-neon-green' : 'bg-amber-500/10 text-amber-400'}`}>
                                                {u.subscriptionStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-white/60 text-xs">{u.subscriptionEndDate ? new Date(u.subscriptionEndDate).toLocaleDateString('tr-TR') : '—'}</td>
                                        <td className="px-4 py-3">{u.autoRenew ? '✓' : '—'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Summary */}
            <div className="mt-6 grid sm:grid-cols-4 gap-3">
                {['basic', 'pro', 'ultra'].map((p) => {
                    const count = users.filter((u) => u.subscriptionPlan === p).length
                    const prices: any = { basic: 99, pro: 299, ultra: 599 }
                    return (
                        <div key={p} className="rounded-xl bg-card border border-white/10 p-4">
                            <div className="text-xs uppercase tracking-widest text-white/50 mb-1">{p}</div>
                            <div className="text-2xl font-black">{count}</div>
                            <div className="text-xs text-neon-green mt-0.5">₺{(count * prices[p]).toLocaleString('tr-TR')}/ay</div>
                        </div>
                    )
                })}
                <div className="rounded-xl bg-gradient-to-br from-neon-green/10 to-neon-blue/10 border border-neon-green/30 p-4">
                    <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Toplam</div>
                    <div className="text-2xl font-black text-gaming-gradient">₺{users.reduce((s, u) => s + ((({ basic: 99, pro: 299, ultra: 599 } as any)[u.subscriptionPlan]) || 0), 0).toLocaleString('tr-TR')}/ay</div>
                </div>
            </div>
        </div>
    )
}
