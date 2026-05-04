import { createFileRoute } from '@tanstack/react-router'
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, Trash2, Search, Palette, Download, Save, Loader2, X,
    ArrowUp, ArrowLeft, ArrowRight, ArrowDown, Image as ImageIcon, Sparkles,
} from 'lucide-react'
import { toPng } from 'html-to-image'
import api from '@/lib/api'

export const Route = createFileRoute('/gift-designer')({
    component: GiftDesignerPage,
})

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'

// ─── Layout types & fonts ─────────────────────────────────────────────

type SlotKey = 'top' | 'left' | 'right' | 'bottom'

const LAYOUTS: { id: string; name: string; slots: SlotKey[]; columns?: Partial<Record<SlotKey, number>> }[] = [
    { id: 'classic', name: 'Klasik (Üst+Sol+Sağ)', slots: ['top', 'left', 'right'] },
    { id: 'top-only', name: 'Sadece Üst', slots: ['top'] },
    { id: 'sides-only', name: 'Sadece Yan', slots: ['left', 'right'] },
    { id: 'two-sides', name: 'İki Yan', slots: ['left', 'right'] },
    { id: 'double-side-cols', name: 'Çift Sütun Yan', slots: ['left', 'right'], columns: { left: 2, right: 2 } },
    { id: 'double-top-rows', name: 'Çift Satır Üst', slots: ['top'], columns: { top: 2 } },
    { id: 'four-corners', name: 'Dört Köşe', slots: ['top', 'left', 'right', 'bottom'] },
]

const FONTS = [
    { name: 'Luckiest Guy', family: 'Luckiest Guy', google: 'Luckiest+Guy' },
    { name: 'Bangers', family: 'Bangers', google: 'Bangers' },
    { name: 'Bebas Neue', family: 'Bebas Neue', google: 'Bebas+Neue' },
    { name: 'Anton', family: 'Anton', google: 'Anton' },
    { name: 'Russo One', family: 'Russo One', google: 'Russo+One' },
    { name: 'Permanent Marker', family: 'Permanent Marker', google: 'Permanent+Marker' },
    { name: 'Press Start 2P', family: 'Press Start 2P', google: 'Press+Start+2P' },
    { name: 'Pacifico', family: 'Pacifico', google: 'Pacifico' },
    { name: 'Lobster', family: 'Lobster', google: 'Lobster' },
    { name: 'Inter', family: 'Inter' },
]

// ─── Types ────────────────────────────────────────────────────────────

interface CatalogGift { name: string; coins: number; icon: string }

interface DesignItem {
    id: string
    giftName: string  // catalog name (or '' if none picked)
    iconUrl: string   // proxied URL
    text: string      // user-customizable label
    color: string     // text color override (or '' to inherit)
}

interface Design {
    name: string
    type: string
    font: string
    giftSize: number
    giftGap: number
    textGap: number
    lineHeight: number
    fontSize: number
    textColor: string
    borderColor: string
    borderWidth: number
    autoBlur: number
    grayscale: boolean
    slots: Record<SlotKey, DesignItem[]>
}

const DEFAULT_DESIGN: Design = {
    name: '',
    type: 'classic',
    font: 'Luckiest Guy',
    giftSize: 75,
    giftGap: 40,
    textGap: -10,
    lineHeight: -5,
    fontSize: 24,
    textColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 5,
    autoBlur: 0,
    grayscale: false,
    slots: { top: [], left: [], right: [], bottom: [] },
}

// Default placeholder when no gift picked yet (purple TikTok music note style)
const PLACEHOLDER_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23bd00ff"/><stop offset="100%" stop-color="%23ff006e"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(%23g)" opacity="0.3"/><text x="50%" y="58%" text-anchor="middle" font-size="44" font-family="Arial" fill="%23bd00ff" font-weight="bold">♪</text></svg>`)

const proxify = (url: string) => url ? `${API_BASE}/api/proxy/image?url=${encodeURIComponent(url)}` : PLACEHOLDER_ICON

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// ─── Component ────────────────────────────────────────────────────────

function GiftDesignerPage() {
    const [design, setDesign] = useState<Design>(() => {
        try {
            const stored = localStorage.getItem('giftDesign')
            return stored ? { ...DEFAULT_DESIGN, ...JSON.parse(stored) } : DEFAULT_DESIGN
        } catch { return DEFAULT_DESIGN }
    })
    const [catalog, setCatalog] = useState<CatalogGift[]>([])
    const [picker, setPicker] = useState<{ slot: SlotKey; itemId: string } | null>(null)
    const [exporting, setExporting] = useState(false)
    const previewRef = useRef<HTMLDivElement>(null)

    const layout = LAYOUTS.find((l) => l.id === design.type) || LAYOUTS[0]

    // Load catalog
    useEffect(() => {
        api.get('/gifts').then((r) => setCatalog(r.data || [])).catch(() => { })
    }, [])

    // Load Google Font
    useEffect(() => {
        const f = FONTS.find((x) => x.family === design.font)
        if (!f?.google) return
        const id = `gd-font-${f.google}`
        if (document.getElementById(id)) return
        const link = document.createElement('link')
        link.id = id
        link.rel = 'stylesheet'
        link.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`
        document.head.appendChild(link)
    }, [design.font])

    // Persist to localStorage
    useEffect(() => {
        try { localStorage.setItem('giftDesign', JSON.stringify(design)) } catch { }
    }, [design])

    function set<K extends keyof Design>(key: K, val: Design[K]) {
        setDesign((d) => ({ ...d, [key]: val }))
    }

    function updateSlot(slot: SlotKey, mutator: (items: DesignItem[]) => DesignItem[]) {
        setDesign((d) => ({ ...d, slots: { ...d.slots, [slot]: mutator(d.slots[slot] || []) } }))
    }

    function addItem(slot: SlotKey) {
        updateSlot(slot, (items) => [...items, { id: newId(), giftName: '', iconUrl: '', text: '', color: '' }])
    }

    function removeItem(slot: SlotKey, id: string) {
        updateSlot(slot, (items) => items.filter((i) => i.id !== id))
    }

    function patchItem(slot: SlotKey, id: string, patch: Partial<DesignItem>) {
        updateSlot(slot, (items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    }

    function pickGift(gift: CatalogGift) {
        if (!picker) return
        patchItem(picker.slot, picker.itemId, { giftName: gift.name, iconUrl: gift.icon })
        setPicker(null)
    }

    async function exportPng() {
        if (!previewRef.current) return
        setExporting(true)
        try {
            const dataUrl = await toPng(previewRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: undefined, // keep transparent
                fetchRequestInit: { mode: 'cors' as RequestMode },
            })
            const link = document.createElement('a')
            link.download = `${(design.name || 'hediye-tasarim').replace(/\s+/g, '_')}.png`
            link.href = dataUrl
            link.click()
        } catch (err) {
            console.error('PNG export error:', err)
            alert('PNG indirme hatası — bazı görseller yüklenemedi')
        } finally {
            setExporting(false)
        }
    }

    function clearAll() {
        if (!confirm('Tüm tasarım sıfırlansın mı?')) return
        setDesign(DEFAULT_DESIGN)
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <header className="mb-6">
                <h1 className="font-heading text-3xl sm:text-4xl font-black mb-1">
                    Hediye <span className="text-gaming-gradient">Tasarımı</span>
                </h1>
                <p className="text-white/60 text-sm">
                    Hediyelerinizi tasarlayın ve transparan PNG olarak indirin — yayında izleyicilere göstermek için
                </p>
            </header>

            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5">
                {/* LEFT — slots */}
                <aside className="space-y-4">
                    {layout.slots.map((slotKey) => (
                        <SlotPanel
                            key={slotKey}
                            slot={slotKey}
                            items={design.slots[slotKey] || []}
                            onAdd={() => addItem(slotKey)}
                            onRemove={(id) => removeItem(slotKey, id)}
                            onPatch={(id, p) => patchItem(slotKey, id, p)}
                            onPick={(id) => setPicker({ slot: slotKey, itemId: id })}
                        />
                    ))}
                </aside>

                {/* RIGHT — settings + preview */}
                <section className="space-y-4">
                    <div className="rounded-2xl bg-card border border-white/10 p-5">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-4 flex items-center gap-2">
                            <Sparkles size={16} className="text-neon-purple" /> Temel
                        </h3>
                        <div className="grid sm:grid-cols-3 gap-3">
                            <Field label="Tasarım Adı *">
                                <input value={design.name} onChange={(e) => set('name', e.target.value)} placeholder="Örn: Minecraft Hediyeleri"
                                    className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm" />
                            </Field>
                            <Field label="Tasarım Tipi *">
                                <select value={design.type} onChange={(e) => set('type', e.target.value)}
                                    className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm">
                                    {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Font *">
                                <select value={design.font} onChange={(e) => set('font', e.target.value)}
                                    className="w-full px-3 py-2 rounded bg-input border border-white/10 text-sm">
                                    {FONTS.map((f) => <option key={f.family} value={f.family}>{f.name}</option>)}
                                </select>
                            </Field>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-card border border-white/10 p-5">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-4 flex items-center gap-2">
                            📏 Boyutlar
                        </h3>
                        <div className="grid sm:grid-cols-4 gap-3">
                            <NumberField label="Hediye Boyutu *" value={design.giftSize} onChange={(v) => set('giftSize', v)} step={5} min={20} max={300} />
                            <NumberField label="Hediye Mesafesi *" value={design.giftGap} onChange={(v) => set('giftGap', v)} step={5} min={0} max={200} />
                            <NumberField label="Yazı Mesafesi *" value={design.textGap} onChange={(v) => set('textGap', v)} step={1} min={-50} max={100} />
                            <NumberField label="Satır Arası *" value={design.lineHeight} onChange={(v) => set('lineHeight', v)} step={1} min={-30} max={100} />
                        </div>
                    </div>

                    <div className="rounded-2xl bg-card border border-white/10 p-5">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-4 flex items-center gap-2">
                            <Palette size={16} className="text-neon-purple" /> Stil
                        </h3>
                        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <NumberField label="Yazı Boyutu *" value={design.fontSize} onChange={(v) => set('fontSize', v)} step={1} min={8} max={96} />
                            <ColorField label="Yazı Rengi *" value={design.textColor} onChange={(v) => set('textColor', v)} />
                            <ColorField label="Border Rengi *" value={design.borderColor} onChange={(v) => set('borderColor', v)} />
                            <NumberField label="Border Kalınlığı *" value={design.borderWidth} onChange={(v) => set('borderWidth', v)} step={1} min={0} max={20} />
                            <NumberField label="Oto Blur" value={design.autoBlur} onChange={(v) => set('autoBlur', v)} step={1} min={0} max={20} />
                            <Field label="Gri Hediye">
                                <button
                                    onClick={() => set('grayscale', !design.grayscale)}
                                    className={`w-11 h-6 rounded-full transition-colors ${design.grayscale ? 'bg-neon-green' : 'bg-white/10'} relative`}
                                >
                                    <span className={`absolute top-0.5 ${design.grayscale ? 'right-0.5' : 'left-0.5'} w-5 h-5 rounded-full bg-white transition-all`} />
                                </button>
                            </Field>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={clearAll} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 hover:text-red-400 transition-all">
                            <Trash2 size={14} /> Sıfırla
                        </button>
                        <div className="flex-1" />
                        <button
                            onClick={exportPng} disabled={exporting}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 border border-white/15 text-sm font-bold hover:bg-white/15 transition-all disabled:opacity-50"
                        >
                            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            PNG İndir
                        </button>
                        <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gaming-gradient text-black text-sm font-bold hover:scale-[1.02] transition-all">
                            <Save size={16} /> Kaydet
                        </button>
                    </div>

                    {/* Preview */}
                    <div className="rounded-2xl bg-card border border-white/10 p-5">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-3 flex items-center gap-2">
                            👁 Canlı Önizleme
                        </h3>
                        <PreviewCanvas ref={previewRef} design={design} layout={layout} />
                        <p className="text-center text-xs text-white/40 mt-3">Yaptığınız değişiklikler otomatik olarak güncellenir</p>
                    </div>
                </section>
            </div>

            {/* Gift picker dialog */}
            <AnimatePresence>
                {picker && (
                    <GiftPicker
                        catalog={catalog}
                        onPick={pickGift}
                        onClose={() => setPicker(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── Slot panel (left column) ─────────────────────────────────────────

function SlotPanel({ slot, items, onAdd, onRemove, onPatch, onPick }: {
    slot: SlotKey; items: DesignItem[];
    onAdd: () => void;
    onRemove: (id: string) => void;
    onPatch: (id: string, p: Partial<DesignItem>) => void;
    onPick: (id: string) => void;
}) {
    const meta: Record<SlotKey, { label: string; icon: any; accent: string }> = {
        top: { label: 'Üst Hediyeler', icon: ArrowUp, accent: 'text-neon-purple' },
        left: { label: 'Sol Hediyeler', icon: ArrowLeft, accent: 'text-neon-blue' },
        right: { label: 'Sağ Hediyeler', icon: ArrowRight, accent: 'text-neon-green' },
        bottom: { label: 'Alt Hediyeler', icon: ArrowDown, accent: 'text-neon-yellow' },
    }
    const m = meta[slot]
    const Icon = m.icon

    return (
        <div className="rounded-2xl bg-card border border-white/10 p-4">
            <div className={`flex items-center gap-2 mb-3 font-black tracking-wide ${m.accent}`}>
                <Icon size={16} /> {m.label}
            </div>
            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/3 border border-white/5">
                        <div className="text-white/30 cursor-grab"><svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="3" r="1" /><circle cx="6" cy="3" r="1" /><circle cx="2" cy="7" r="1" /><circle cx="6" cy="7" r="1" /><circle cx="2" cy="11" r="1" /><circle cx="6" cy="11" r="1" /></svg></div>
                        <button
                            onClick={() => onPick(item.id)}
                            title="Hediye seç"
                            className="w-9 h-9 rounded bg-white/5 border border-white/10 flex items-center justify-center hover:border-neon-purple/40 transition-all overflow-hidden"
                        >
                            {item.iconUrl ? (
                                <img src={proxify(item.iconUrl)} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <ImageIcon size={16} className="text-white/30" />
                            )}
                        </button>
                        <input
                            value={item.text}
                            onChange={(e) => onPatch(item.id, { text: e.target.value })}
                            placeholder={item.giftName || 'metin'}
                            className="flex-1 min-w-0 px-2 py-1.5 rounded bg-transparent border border-white/5 text-sm text-white"
                        />
                        <ColorIconPicker
                            value={item.color || ''}
                            onChange={(c) => onPatch(item.id, { color: c })}
                        />
                        <button
                            onClick={() => onPick(item.id)}
                            className="w-7 h-7 rounded bg-neon-purple/20 border border-neon-purple/40 hover:bg-neon-purple/30 text-neon-purple flex items-center justify-center"
                            title="Hediye seç"
                        >
                            <Plus size={14} />
                        </button>
                        <button
                            onClick={() => onRemove(item.id)}
                            className="w-7 h-7 rounded bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 flex items-center justify-center"
                            title="Sil"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <button
                onClick={onAdd}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-neon-purple/15 border border-neon-purple/30 text-neon-purple text-sm font-bold hover:bg-neon-purple/25 transition-all"
            >
                <Plus size={14} /> Yeni Hediye Ekle
            </button>
        </div>
    )
}

function ColorIconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const ref = useRef<HTMLInputElement>(null)
    return (
        <button
            onClick={() => ref.current?.click()}
            className="w-7 h-7 rounded bg-white/5 border border-white/10 hover:border-neon-purple/40 flex items-center justify-center relative overflow-hidden"
            title="Renk"
        >
            <Palette size={14} className="text-white/60" />
            <input
                ref={ref} type="color" value={value || '#FFFFFF'}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {value && <div className="absolute -bottom-0.5 right-0 left-0 h-1" style={{ background: value }} />}
        </button>
    )
}

// ─── Form fields ──────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs text-white/60 mb-1.5">{label}</label>
            {children}
        </div>
    )
}

function NumberField({ label, value, onChange, step = 1, min, max }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
    return (
        <Field label={label}>
            <div className="flex items-center bg-input rounded border border-white/10 overflow-hidden">
                <button onClick={() => onChange(Math.max(min ?? -Infinity, value - step))} className="px-2 py-1.5 hover:bg-white/5 text-white/60">−</button>
                <input
                    type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
                    className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm text-center outline-none"
                />
                <button onClick={() => onChange(Math.min(max ?? Infinity, value + step))} className="px-2 py-1.5 hover:bg-white/5 text-white/60">+</button>
            </div>
        </Field>
    )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <Field label={label}>
            <div className="flex items-center bg-input rounded border border-white/10 overflow-hidden">
                <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="w-9 h-9 cursor-pointer bg-transparent border-0 p-0.5" />
                <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0 px-2 py-1.5 text-xs text-center bg-transparent outline-none font-mono uppercase" />
            </div>
        </Field>
    )
}

// ─── Preview canvas ───────────────────────────────────────────────────

const PreviewCanvas = forwardRef<HTMLDivElement, { design: Design; layout: typeof LAYOUTS[number] }>(
    function PreviewCanvas({ design, layout }, ref) {
        const wrapStyle: React.CSSProperties = {
            width: '100%',
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: 8,
            position: 'relative',
            overflow: 'hidden',
        }
        return (
            <div style={wrapStyle}>
                <div
                    ref={ref}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        fontFamily: `'${design.font}', sans-serif`,
                        color: design.textColor,
                        background: 'transparent',
                    }}
                >
                    {layout.slots.map((slot) => (
                        <SlotRender key={slot} slot={slot} design={design} layout={layout} />
                    ))}
                </div>
            </div>
        )
    }
)

function SlotRender({ slot, design, layout }: { slot: SlotKey; design: Design; layout: typeof LAYOUTS[number] }) {
    const items = design.slots[slot] || []
    if (!items.length) return null

    const cols = layout.columns?.[slot] ?? 1
    const isHorizontal = slot === 'top' || slot === 'bottom'

    const positionStyle: React.CSSProperties = (() => {
        const PADDING = 24
        if (slot === 'top') return { position: 'absolute', top: PADDING, left: PADDING, display: 'flex', flexDirection: cols > 1 ? 'column' : 'row', flexWrap: 'wrap', gap: design.lineHeight }
        if (slot === 'bottom') return { position: 'absolute', bottom: PADDING, left: PADDING, display: 'flex', flexDirection: cols > 1 ? 'column' : 'row', gap: design.lineHeight }
        if (slot === 'left') return { position: 'absolute', bottom: PADDING, left: PADDING, display: 'flex', flexDirection: cols > 1 ? 'row' : 'column', gap: design.lineHeight }
        return { position: 'absolute', bottom: PADDING, right: PADDING, display: 'flex', flexDirection: cols > 1 ? 'row' : 'column', gap: design.lineHeight, alignItems: 'flex-end' }
    })()

    // Group items into rows for cols > 1
    const rows: DesignItem[][] = []
    if (cols > 1 && isHorizontal) {
        // top with N rows: split items evenly into N rows horizontal
        const perRow = Math.ceil(items.length / cols)
        for (let i = 0; i < cols; i++) rows.push(items.slice(i * perRow, (i + 1) * perRow))
    } else if (cols > 1 && !isHorizontal) {
        // sides with N columns: split into N columns
        const perCol = Math.ceil(items.length / cols)
        for (let i = 0; i < cols; i++) rows.push(items.slice(i * perCol, (i + 1) * perCol))
    } else {
        rows.push(items)
    }

    return (
        <div style={positionStyle}>
            {rows.map((row, rIdx) => (
                <div
                    key={rIdx}
                    style={{
                        display: 'flex',
                        flexDirection: isHorizontal ? 'row' : 'column',
                        gap: design.giftGap,
                        alignItems: slot === 'right' ? 'flex-end' : 'flex-start',
                    }}
                >
                    {row.map((item) => (
                        <GiftCard key={item.id} item={item} design={design} />
                    ))}
                </div>
            ))}
        </div>
    )
}

function GiftCard({ item, design }: { item: DesignItem; design: Design }) {
    const text = item.text || item.giftName || ''
    const color = item.color || design.textColor
    const stroke = design.borderWidth > 0
        ? Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            const x = Math.cos(a) * design.borderWidth
            const y = Math.sin(a) * design.borderWidth
            return `${x.toFixed(1)}px ${y.toFixed(1)}px 0 ${design.borderColor}`
        }).join(', ')
        : 'none'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <img
                src={proxify(item.iconUrl)}
                alt=""
                crossOrigin="anonymous"
                style={{
                    width: design.giftSize,
                    height: design.giftSize,
                    objectFit: 'contain',
                    filter: `${design.grayscale ? 'grayscale(100%)' : ''} ${design.autoBlur ? `blur(${design.autoBlur}px)` : ''}`.trim() || 'none',
                }}
            />
            {text && (
                <div
                    style={{
                        marginTop: design.textGap,
                        fontSize: design.fontSize,
                        color,
                        textShadow: stroke,
                        fontFamily: `'${design.font}', sans-serif`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {text}
                </div>
            )}
        </div>
    )
}

// ─── Gift picker dialog ───────────────────────────────────────────────

function GiftPicker({ catalog, onPick, onClose }: { catalog: CatalogGift[]; onPick: (g: CatalogGift) => void; onClose: () => void }) {
    const [q, setQ] = useState('')
    const filtered = useMemo(() => {
        if (!q.trim()) return catalog
        const t = q.toLowerCase()
        return catalog.filter((g) => g.name.toLowerCase().includes(t) || String(g.coins).includes(t))
    }, [q, catalog])

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card border border-white/10 rounded-2xl p-5 w-full max-w-3xl max-h-[85vh] flex flex-col"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading text-xl font-black">Hediye Seç</h2>
                    <button onClick={onClose} className="p-1.5 rounded hover:bg-white/5"><X size={18} /></button>
                </div>
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                    <input
                        autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                        placeholder="İsim veya coin ara..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-input border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-neon-purple/40"
                    />
                </div>
                <div className="overflow-y-auto -mx-2 px-2">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                        {filtered.map((g) => (
                            <button
                                key={g.name}
                                onClick={() => onPick(g)}
                                className="rounded-lg bg-white/5 border border-white/10 hover:border-neon-purple/50 hover:bg-neon-purple/10 p-2 text-center transition-all"
                            >
                                <img src={proxify(g.icon)} alt={g.name} className="w-12 h-12 mx-auto object-contain" loading="lazy" />
                                <div className="text-[11px] font-semibold mt-1 truncate" title={g.name}>{g.name}</div>
                                <div className="text-[10px] text-yellow-400">💎 {g.coins}</div>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-xs text-white/40 text-center mt-3">
                    {filtered.length} / {catalog.length} hediye
                </div>
            </motion.div>
        </motion.div>
    )
}
