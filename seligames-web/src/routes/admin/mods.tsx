import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Plus, Edit2, Trash2, Loader2, X, Save, Image as ImageIcon, Upload, FileArchive, FileX2, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'

export const Route = createFileRoute('/admin/mods')({
    component: ModsAdmin,
})

const empty = { title: '', gameTitle: '', description: '', category: 'open-world', version: '1.0.0', imageUrl: '', downloadUrl: '', isActive: true, tags: [] as string[] }

// Resolve a possibly-relative imageUrl (e.g. "/uploads/mod-images/xxx.png")
// against the backend so img tags actually render. External https:// URLs
// pass through unchanged.
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'
// Optional `bust` (e.g. mod.updatedAt or Date.now()) tacks a ?t= query so
// the browser refetches when backend overwrites the same path.
function resolveImg(url?: string, bust?: string | number) {
    if (!url) return ''
    let full = url
    if (!/^https?:\/\//i.test(url)) {
        full = url.startsWith('/') ? `${API_BASE}${url}` : url
    }
    if (bust) {
        const b = typeof bust === 'string' ? new Date(bust).getTime() : bust
        if (b) full += (full.includes('?') ? '&' : '?') + 't=' + b
    }
    return full
}

function humanBytes(b: number) {
    if (!b || b < 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let v = b, i = 0
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

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
        // Required-field guard — backend wants downloadUrl; supply a sentinel
        // for in-house uploads so the new-mod POST doesn't 400 on the user.
        const payload = { ...editing }
        if (!payload.downloadUrl) payload.downloadUrl = 'internal'
        setSaving(true)
        try {
            let res
            if (editing._id) res = await api.put(`/mods/${editing._id}`, payload)
            else res = await api.post('/mods', payload)
            // Keep the modal open so the user can immediately upload the cover
            // image and the ZIP — both need a real _id, which the response
            // gives us for brand-new mods. Refresh the grid in the background.
            const saved = res?.data
            if (saved && saved._id) setEditing(saved)
            await load()
        } catch (e: any) {
            alert(e.response?.data?.error || e.message || 'Kayıt başarısız')
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
                                    ? <img src={resolveImg(m.imageUrl, m.updatedAt)} className="w-full h-full object-cover" />
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
                                <FileWidget mod={m} onUpdated={load} />
                                <div className="flex gap-2 mt-2">
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
                            <Row label="Görsel" wide>
                                <ImageWidget
                                    mod={editing}
                                    onUploaded={(url) => setEditing({ ...editing, imageUrl: url })}
                                    onUrlChange={(url) => setEditing({ ...editing, imageUrl: url })}
                                />
                            </Row>
                            <Row label="İndirme URL (VPS)" wide><input value={editing.downloadUrl} onChange={(e) => setEditing({ ...editing, downloadUrl: e.target.value })} placeholder="https://vps.seligame.com/..." className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Row>
                            <Row label="Açıklama" wide><textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm font-sans" /></Row>
                            <Row label="Aktif">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={!!editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} className="accent-neon-green" />
                                    Listede göster
                                </label>
                            </Row>
                        </div>
                        {!editing._id && (
                            <div className="mt-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                                ⓘ Önce <b>Kaydet</b> — sonra görsel ve ZIP yükleyebilirsin.
                            </div>
                        )}
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10">Kapat</button>
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

function ImageWidget({ mod, onUploaded, onUrlChange }: { mod: any; onUploaded: (url: string) => void; onUrlChange: (url: string) => void }) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    // Cache-busting tick. Backend overwrites the same path on every upload,
    // so the browser would happily serve the stale image otherwise.
    const [bust, setBust] = useState(0)
    const hasId = !!mod._id
    const previewBase = mod.imageUrl ? resolveImg(mod.imageUrl) : ''
    const preview = previewBase
        ? previewBase + (bust ? (previewBase.includes('?') ? '&' : '?') + 't=' + bust : '')
        : ''

    async function pick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        if (!hasId) {
            setErr('Önce "Kaydet"e bas — sonra görsel yükle')
            setTimeout(() => setErr(''), 4000)
            return
        }
        if (!/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
            setErr('Sadece PNG / JPG / WEBP / GIF')
            setTimeout(() => setErr(''), 3000)
            return
        }
        setErr(''); setBusy(true)
        try {
            const fd = new FormData()
            fd.append('image', file)
            const res = await api.post(`/mods/${mod._id}/image`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 5 * 60 * 1000,
            })
            const url = res.data?.mod?.imageUrl
            if (url) {
                onUploaded(url)
                setBust(Date.now())  // force the <img> to refetch
            }
        } catch (e: any) {
            setErr(e.response?.data?.error || e.message)
            setTimeout(() => setErr(''), 4000)
        } finally { setBusy(false) }
    }

    return (
        <div className="space-y-2">
            <div className="flex items-start gap-3">
                <div className="w-32 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-white/5 to-black/30 border border-white/10 flex-shrink-0 flex items-center justify-center">
                    {preview
                        ? <img src={preview} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        : <ImageIcon size={28} className="text-white/20" />}
                </div>
                <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            className="hidden"
                            onChange={pick}
                        />
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neon-purple/15 border border-neon-purple/30 text-neon-purple text-sm font-bold hover:bg-neon-purple/25 disabled:opacity-50 transition-all"
                            title={hasId ? 'Bilgisayardan görsel yükle (PNG/JPG/WEBP, ≤10MB)' : 'Önce modu kaydet'}
                        >
                            {busy ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                            {busy ? 'Yükleniyor…' : 'Görsel Yükle'}
                        </button>
                        {!hasId && <span className="text-[11px] text-white/40 self-center">Önce kaydet, sonra görsel yükleyebilirsin</span>}
                    </div>
                    <input
                        value={mod.imageUrl || ''}
                        onChange={(e) => onUrlChange(e.target.value)}
                        placeholder="…veya direkt URL yapıştır: https://…"
                        className="w-full px-3 py-2 rounded bg-input border border-white/10 text-xs font-mono"
                    />
                </div>
            </div>
            {err && <div className="text-xs text-red-400">{err}</div>}
        </div>
    )
}

function FileWidget({ mod, onUpdated }: { mod: any; onUpdated: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [progress, setProgress] = useState<number | null>(null)
    const [error, setError] = useState('')

    const hasFile = !!mod.fileUploadedAt

    async function upload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        if (!file.name.toLowerCase().endsWith('.zip')) {
            setError('Sadece .zip dosyası kabul ediliyor')
            setTimeout(() => setError(''), 3000)
            return
        }
        setError(''); setProgress(0)
        const fd = new FormData()
        fd.append('file', file)
        try {
            await api.post(`/mods/${mod._id}/upload`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
                // 30 min timeout for big uploads; can override per-mod if needed
                timeout: 30 * 60 * 1000,
                onUploadProgress: (ev) => {
                    if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100))
                },
            })
            setProgress(100)
            setTimeout(() => { setProgress(null); onUpdated() }, 600)
        } catch (e: any) {
            setError(e.response?.data?.error || e.message)
            setProgress(null)
            setTimeout(() => setError(''), 4000)
        }
    }

    async function deleteFile() {
        if (!confirm('Yüklenmiş dosya silinsin mi? Mod metadata kalır.')) return
        try {
            await api.delete(`/mods/${mod._id}/file`)
            onUpdated()
        } catch (e: any) { setError(e.response?.data?.error || e.message); setTimeout(() => setError(''), 3000) }
    }

    return (
        <div className="mt-2 mb-2">
            {progress !== null ? (
                <div>
                    <div className="flex items-center justify-between text-[10px] tracking-widest text-neon-green font-bold uppercase mb-1">
                        <span>Yükleniyor…</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-neon-green to-neon-blue transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            ) : hasFile ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-neon-green/5 border border-neon-green/20 text-xs">
                    <CheckCircle2 size={14} className="text-neon-green flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-neon-green font-semibold truncate" title={mod.fileName}>{mod.fileName || 'mod.zip'}</div>
                        <div className="text-white/40 text-[10px]">{humanBytes(mod.fileSize || 0)} · {new Date(mod.fileUploadedAt).toLocaleDateString('tr-TR')}</div>
                    </div>
                    <button
                        onClick={() => inputRef.current?.click()}
                        title="Yenisini yükle (üstüne yazar)"
                        className="text-white/60 hover:text-neon-green p-1 rounded hover:bg-white/5"
                    ><Upload size={12} /></button>
                    <button
                        onClick={deleteFile}
                        title="Dosyayı sil"
                        className="text-white/60 hover:text-red-400 p-1 rounded hover:bg-white/5"
                    ><FileX2 size={12} /></button>
                </div>
            ) : (
                <button
                    onClick={() => inputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-white/15 hover:border-neon-green/50 hover:bg-neon-green/5 text-xs font-semibold text-white/60 hover:text-neon-green transition-all"
                >
                    <FileArchive size={14} /> ZIP Yükle
                </button>
            )}
            {error && (
                <div className="mt-1 text-[10px] text-red-400">{error}</div>
            )}
            <input
                ref={inputRef} type="file" accept=".zip,application/zip"
                className="hidden" onChange={upload}
            />
        </div>
    )
}
