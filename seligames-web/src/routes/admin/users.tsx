import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Search, Trash2, Edit2, Save, X, Loader2 } from 'lucide-react'
import api from '@/lib/api'

export const Route = createFileRoute('/admin/users')({
    component: UsersAdmin,
})

function UsersAdmin() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [q, setQ] = useState('')
    const [planFilter, setPlanFilter] = useState('all')
    const [roleFilter, setRoleFilter] = useState('all')
    const [editing, setEditing] = useState<any>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => { load() }, [q, planFilter, roleFilter])

    async function load() {
        setLoading(true)
        try {
            const r = await api.get('/admin/users', { params: { q, plan: planFilter, role: roleFilter, limit: 100 } })
            setUsers(r.data?.users || [])
        } finally { setLoading(false) }
    }

    async function save() {
        if (!editing) return
        setSaving(true)
        try {
            await api.put(`/admin/users/${editing._id}`, {
                username: editing.username,
                role: editing.role,
                subscriptionPlan: editing.subscriptionPlan,
                subscriptionStatus: editing.subscriptionStatus,
            })
            setEditing(null)
            await load()
        } finally { setSaving(false) }
    }

    async function remove(u: any) {
        if (!confirm(`${u.email} silinsin mi?`)) return
        await api.delete(`/admin/users/${u._id}`)
        await load()
    }

    return (
        <div className="p-6 sm:p-10">
            <h1 className="font-heading text-3xl sm:text-4xl font-black mb-1">Kullanıcı <span className="text-neon-purple">Yönetimi</span></h1>
            <p className="text-white/60 mb-6">{users.length} kullanıcı listeleniyor</p>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email/kullanıcı adı/tiktok ara..." className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-input border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-neon-purple/40" />
                </div>
                <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="px-3 py-2.5 rounded-lg bg-input border border-white/10 text-sm">
                    <option value="all">Tüm planlar</option>
                    <option value="free">Free</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="ultra">Ultra</option>
                </select>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2.5 rounded-lg bg-input border border-white/10 text-sm">
                    <option value="all">Tüm roller</option><option value="user">User</option><option value="admin">Admin</option>
                </select>
            </div>

            {/* Table */}
            <div className="rounded-2xl bg-card border border-white/10 overflow-hidden">
                {loading ? (
                    <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-neon-purple" /></div>
                ) : users.length === 0 ? (
                    <div className="text-center py-10 text-white/50 text-sm">Sonuç yok</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 sticky top-0">
                                <tr className="text-left text-white/60 text-xs uppercase tracking-widest">
                                    <th className="px-4 py-3">Kullanıcı</th>
                                    <th className="px-4 py-3">E-posta</th>
                                    <th className="px-4 py-3">TikTok</th>
                                    <th className="px-4 py-3">Plan</th>
                                    <th className="px-4 py-3">Durum</th>
                                    <th className="px-4 py-3">Rol</th>
                                    <th className="px-4 py-3 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u._id} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gaming-gradient flex items-center justify-center font-bold text-black text-xs">
                                                    {(u.username || u.email).charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold">{u.username || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-white/70">{u.email}</td>
                                        <td className="px-4 py-3 text-white/50">{u.tiktokUsername || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded bg-white/5 text-xs uppercase">{u.subscriptionPlan || 'free'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${u.subscriptionStatus === 'active' ? 'bg-neon-green/10 text-neon-green' : 'bg-amber-500/10 text-amber-400'}`}>
                                                {u.subscriptionStatus || 'active'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-neon-purple/10 text-neon-purple' : 'bg-white/5 text-white/60'}`}>{u.role || 'user'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => setEditing({ ...u })} className="text-white/60 hover:text-neon-green p-1.5 rounded hover:bg-white/5"><Edit2 size={14} /></button>
                                            <button onClick={() => remove(u)} className="text-white/60 hover:text-red-400 p-1.5 rounded hover:bg-white/5"><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit modal */}
            {editing && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
                    <div className="bg-card border border-white/10 rounded-2xl p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-heading text-xl font-black">Kullanıcıyı Düzenle</h2>
                            <button onClick={() => setEditing(null)} className="p-1.5 rounded hover:bg-white/5"><X size={18} /></button>
                        </div>
                        <div className="space-y-3">
                            <Row label="Kullanıcı Adı"><input value={editing.username || ''} onChange={(e) => setEditing({ ...editing, username: e.target.value })} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Row>
                            <Row label="Plan">
                                <select value={editing.subscriptionPlan || 'free'} onChange={(e) => setEditing({ ...editing, subscriptionPlan: e.target.value })} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm">
                                    <option value="free">Free</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="ultra">Ultra</option>
                                </select>
                            </Row>
                            <Row label="Durum">
                                <select value={editing.subscriptionStatus || 'active'} onChange={(e) => setEditing({ ...editing, subscriptionStatus: e.target.value })} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm">
                                    <option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option><option value="trial">Trial</option>
                                </select>
                            </Row>
                            <Row label="Rol">
                                <select value={editing.role || 'user'} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm">
                                    <option value="user">User</option><option value="admin">Admin</option>
                                </select>
                            </Row>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10">İptal</button>
                            <button onClick={save} disabled={saving} className="flex-2 inline-flex items-center justify-center gap-1.5 py-2 px-5 rounded-lg bg-gaming-gradient text-black text-sm font-bold disabled:opacity-50">
                                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-1.5">{label}</label>
            {children}
        </div>
    )
}
