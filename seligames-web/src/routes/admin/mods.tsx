import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Loader2, X, Save, Image as ImageIcon } from 'lucide-react'
import api from '@/lib/api'

export const Route = createFileRoute('/admin/mods')({
    component: ModsAdmin,
})

const empty = { title: '', gameTitle: '', description: '', category: 'open-world', version: '1.0.0', imageUrl: '', downloadUrl: '', isActive: true, tags: [] as string[] }

function ModsAdmin() {
    const [mods, setMods] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState<any>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => { load() }, [])
    async function load() {
        setLoading(true)
        try { const r = await api.get('/mods'); setMods(r.data || []) } finally { setLoading(false) }
    }

    async function save() {
        if (!editing) return
        setSaving(true)
        try {
            if (editing._id) await api.put(`/mods/${editing._id}`, editing)
            else await api.post('/mods', editing)
            setEditing(null); await load()
        } finally { setSaving(false) }
    }

    async function remove(m: any) {
        if (!confirm(`"${m.title}" silinsin mi? (soft delete)`)) return
        await api.delete(`/mods/${m._id}`); await load()
    }

    return (
        <div className="p-6 sm:p-10">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
                <div>
                    <h1 className="font-heading text-3xl sm:text-4xl font-black mb-1">Mod <span className="text-neon-purple">Yönetimi</span></h1>
                    <p className="text-white/60">{mods.length} mod kayıtlı</p>
                </div>
                <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gaming-gradient text-black font-bold text-sm hover:scale-[1.02] transition-all">
                    <Plus size={16} /> Yeni Mod
                </button>
            </div>

            {loading ? <Loader2 className="animate-spin mx-auto mt-10" /> : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {mods.map((m) => (
                        <div key={m._id} className="rounded-xl bg-card border border-white/10 overflow-hidden hover:border-neon-purple/40 transition-all">
                            <div className="aspect-video bg-gradient-to-br from-white/5 to-black/30 relative overflow-hidden">
                                {m.imageUrl
                                    ? <img src={m.imageUrl} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-white/20"><ImageIcon size={32} /></div>}
                                {!m.isActive && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-black tracking-widest text-red-400">PASİF</div>}
                            </div>
                            <div className="p-4">
                                <div className="text-[10px] tracking-widest font-black text-neon-green uppercase mb-1">{m.category || 'mod'}</div>
                                <div className="font-bold truncate">{m.title}</div>
                                <div className="text-xs text-white/50 truncate">{m.gameTitle}</div>
                                <div className="flex items-center justify-between mt-3 text-xs text-white/50">
                                    <span>v{m.version || '1.0.0'}</span>
                                    <span>{m.downloadCount || 0} indirme</span>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => setEditing({ ...m })} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10"><Edit2 size={12} /> Düzenle</button>
                                    <button onClick={() => remove(m)} className="inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit modal */}
            {editing && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-card border border-white/10 rounded-2xl p-6 w-full max-w-2xl my-8">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-heading text-xl font-black">{editing._id ? 'Mod Düzenle' : 'Yeni Mod'}</h2>
                            <button onClick={() => setEditing(null)} className="p-1.5 rounded hover:bg-white/5"><X size={18} /></button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <Row label="Başlık"><input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Row>
                            <Row label="Oyun Adı"><input value={editing.gameTitle} onChange={(e) => setEditing({ ...editing, gameTitle: e.target.value })} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Row>
                            <Row label="Versiyon"><input value={editing.version} onChange={(e) => setEditing({ ...editing, version: e.target.value })} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Row>
                            <Row label="Kategori">
                                <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm">
                                    <option value="open-world">Açık Dünya</option><option value="fps">FPS</option><option value="battle-royale">Battle Royale</option>
                                    <option value="moba">MOBA</option><option value="sandbox">Sandbox</option><option value="sports">Spor</option><option value="party">Parti</option><option value="other">Diğer</option>
                                </select>
                            </Row>
                            <Row label="Görsel URL" wide><input value={editing.imageUrl} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Row>
                            <Row label="İndirme URL (VPS)" wide><input value={editing.downloadUrl} onChange={(e) => setEditing({ ...editing, downloadUrl: e.target.value })} placeholder="https://vps.seligame.com/..." className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Row>
                            <Row label="Açıklama" wide><textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm font-sans" /></Row>
                            <Row label="Aktif">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={!!editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} className="accent-neon-green" />
                                    Listede göster
                                </label>
                            </Row>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10">İptal</button>
                            <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-1.5 py-2 px-7 rounded-lg bg-gaming-gradient text-black text-sm font-bold disabled:opacity-50">
                                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Row({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
    return (
        <div className={wide ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-1.5">{label}</label>
            {children}
        </div>
    )
}
