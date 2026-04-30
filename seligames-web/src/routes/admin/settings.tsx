import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'

export const Route = createFileRoute('/admin/settings')({
    component: SettingsAdmin,
})

function SettingsAdmin() {
    const [s, setS] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    useEffect(() => { load() }, [])
    async function load() {
        const r = await api.get('/admin/settings'); setS(r.data)
    }
    async function save() {
        setSaving(true); setMsg('')
        try { await api.put('/admin/settings', s); setMsg('Kaydedildi.') }
        catch (e: any) { setMsg(e.response?.data?.error || 'Hata') }
        finally { setSaving(false); setTimeout(() => setMsg(''), 3000) }
    }

    if (!s) return <div className="p-10"><Loader2 className="animate-spin" /></div>

    function setField(k: string, v: any) { setS({ ...s, [k]: v }) }

    return (
        <div className="p-6 sm:p-10 max-w-4xl">
            <h1 className="font-heading text-3xl sm:text-4xl font-black mb-1">Site <span className="text-neon-purple">Ayarları</span></h1>
            <p className="text-white/60 mb-6">Public site içeriği — landing'te ve diğer marketing sayfalarında kullanılır</p>

            {msg && <div className="rounded-lg bg-neon-green/10 border border-neon-green/30 px-4 py-2.5 text-sm text-neon-green mb-5">{msg}</div>}

            <div className="space-y-5">
                <Card title="Marka">
                    <Field label="Site Adı"><input value={s.siteName || ''} onChange={(e) => setField('siteName', e.target.value)} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Field>
                    <Field label="Tagline"><input value={s.tagline || ''} onChange={(e) => setField('tagline', e.target.value)} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Field>
                    <Field label="Hero Subtitle"><textarea rows={2} value={s.heroSubtitle || ''} onChange={(e) => setField('heroSubtitle', e.target.value)} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm font-sans" /></Field>
                    <Field label="Banner Mesajı (anasayfa üstü)"><input value={s.bannerMessage || ''} onChange={(e) => setField('bannerMessage', e.target.value)} placeholder="Boş bırak — gizlenir" className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Field>
                </Card>

                <Card title="İletişim ve Sosyal">
                    <Field label="İletişim E-posta"><input type="email" value={s.contactEmail || ''} onChange={(e) => setField('contactEmail', e.target.value)} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Field>
                    <Field label="Discord URL"><input value={s.discordUrl || ''} onChange={(e) => setField('discordUrl', e.target.value)} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Field>
                    <Field label="Twitter/X URL"><input value={s.twitterUrl || ''} onChange={(e) => setField('twitterUrl', e.target.value)} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Field>
                    <Field label="YouTube URL"><input value={s.youtubeUrl || ''} onChange={(e) => setField('youtubeUrl', e.target.value)} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Field>
                </Card>

                <Card title="Masaüstü Uygulama">
                    <Field label="Sürüm"><input value={s.desktopVersion || ''} onChange={(e) => setField('desktopVersion', e.target.value)} className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Field>
                    <Field label="İndirme URL'si (VPS / S3)"><input value={s.desktopDownloadUrl || ''} onChange={(e) => setField('desktopDownloadUrl', e.target.value)} placeholder="https://vps.seligame.com/desktop/..." className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" /></Field>
                </Card>

                <PricingPlansEditor plans={s.pricingPlans || []} onChange={(plans) => setField('pricingPlans', plans)} />
            </div>

            <button onClick={save} disabled={saving} className="mt-8 inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gaming-gradient text-black font-bold hover:scale-[1.02] transition-all disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Tüm Ayarları Kaydet
            </button>
        </div>
    )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl bg-card border border-white/10 p-6 space-y-4">
            <h2 className="font-heading text-lg font-black">{title}</h2>
            {children}
        </div>
    )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-1.5">{label}</label>
            {children}
        </div>
    )
}

function PricingPlansEditor({ plans, onChange }: { plans: any[]; onChange: (p: any[]) => void }) {
    function update(i: number, patch: any) {
        const next = plans.slice(); next[i] = { ...next[i], ...patch }; onChange(next)
    }
    function remove(i: number) { onChange(plans.filter((_, j) => j !== i)) }
    function add() { onChange([...plans, { id: 'new', name: 'New Plan', price: 0, features: [] }]) }

    return (
        <Card title="Fiyatlandırma Planları">
            <div className="space-y-3">
                {plans.map((p, i) => (
                    <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-4">
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <input value={p.id} onChange={(e) => update(i, { id: e.target.value })} placeholder="id" className="px-2 py-1.5 rounded bg-input border border-white/10 text-xs" />
                            <input value={p.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Ad" className="px-2 py-1.5 rounded bg-input border border-white/10 text-xs" />
                            <input type="number" value={p.price} onChange={(e) => update(i, { price: Number(e.target.value) })} placeholder="₺" className="px-2 py-1.5 rounded bg-input border border-white/10 text-xs" />
                        </div>
                        <textarea
                            value={(p.features || []).join('\n')}
                            onChange={(e) => update(i, { features: e.target.value.split('\n').filter(Boolean) })}
                            rows={3}
                            placeholder="Her satır bir özellik"
                            className="w-full px-2 py-1.5 rounded bg-input border border-white/10 text-xs font-sans"
                        />
                        <div className="flex items-center justify-between mt-2">
                            <label className="flex items-center gap-1.5 text-xs">
                                <input type="checkbox" checked={!!p.featured} onChange={(e) => update(i, { featured: e.target.checked })} className="accent-neon-green" />
                                Öne çıkan
                            </label>
                            <button onClick={() => remove(i)} className="text-red-400 hover:bg-red-500/10 p-1 rounded text-xs"><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={add} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-all">
                <Plus size={14} /> Plan Ekle
            </button>
        </Card>
    )
}
