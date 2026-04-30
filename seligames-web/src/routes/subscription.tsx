import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, CreditCard, AlertTriangle, RefreshCw } from 'lucide-react'
import api from '@/lib/api'

export const Route = createFileRoute('/subscription')({
    component: SubscriptionPage,
})

function SubscriptionPage() {
    const [profile, setProfile] = useState<any>(null)
    const [plans, setPlans] = useState<any[]>([])
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState('')
    const [history, setHistory] = useState<any[]>([])

    useEffect(() => {
        load()
        api.get('/site').then((r) => Array.isArray(r.data?.pricingPlans) && setPlans(r.data.pricingPlans)).catch(() => {})
        api.get('/subscription/history').then((r) => setHistory(r.data?.payments || [])).catch(() => {})
    }, [])

    async function load() {
        try { const r = await api.get('/subscription/status'); setProfile(r.data) } catch { /* */ }
    }

    async function changePlan(planId: string) {
        if (busy) return
        setBusy(true); setMsg('')
        try {
            const r = await api.post('/subscription/upgrade', { plan: planId })
            setMsg(`Plan güncellendi: ${r.data?.subscription?.plan}`)
            await load()
        } catch (e: any) { setMsg(e.response?.data?.error || 'Hata') }
        finally { setBusy(false) }
    }

    async function cancel() {
        if (!confirm('Aboneliğin iptal edilecek. Mevcut periyodun sonuna kadar aktif kalır. Emin misin?')) return
        setBusy(true); setMsg('')
        try { await api.post('/subscription/cancel'); setMsg('Abonelik iptal edildi.'); await load() }
        catch (e: any) { setMsg(e.response?.data?.error || 'Hata') }
        finally { setBusy(false) }
    }

    const sub = profile?.subscription
    const currentPlan = sub?.plan || 'free'

    return (
        <div className="p-6 sm:p-8 max-w-5xl mx-auto">
            <h1 className="font-heading text-3xl sm:text-4xl font-black mb-1">Abonelik <span className="text-gaming-gradient">Yönetimi</span></h1>
            <p className="text-white/60 mb-8">Mevcut planın, faturalama geçmişin, plan değişiklikleri.</p>

            {msg && (
                <div className="rounded-lg bg-neon-green/10 border border-neon-green/30 px-4 py-3 text-sm text-neon-green mb-5">{msg}</div>
            )}

            {/* Current plan */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-br from-neon-green/10 to-neon-blue/10 border border-white/10 p-6 mb-8">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Mevcut Plan</div>
                        <div className="font-heading text-3xl font-black text-gaming-gradient capitalize">{currentPlan}</div>
                        <div className="text-sm text-white/60 mt-2">
                            Durum: <span className={sub?.status === 'active' ? 'text-neon-green' : 'text-amber-400'}>{sub?.status || 'free'}</span>
                            {sub?.endDate && <> · Bitiş: {new Date(sub.endDate).toLocaleDateString('tr-TR')}</>}
                            {typeof sub?.daysRemaining === 'number' && sub.daysRemaining >= 0 && <> · Kalan: <b className="text-neon-green">{sub.daysRemaining}</b> gün</>}
                        </div>
                    </div>
                    <CreditCard className="text-neon-green" size={36} />
                </div>
                {currentPlan !== 'free' && (
                    <div className="flex flex-wrap gap-2 mt-5">
                        <button onClick={cancel} disabled={busy} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-all disabled:opacity-50">
                            <X size={14} /> Aboneliği İptal Et
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Plans grid */}
            <h2 className="font-heading text-xl font-black mb-4">Plan Değiştir</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {plans.map((p) => (
                    <div key={p.id} className={`rounded-xl border p-5 ${currentPlan === p.id ? 'border-neon-green bg-neon-green/5' : 'bg-card border-white/10'}`}>
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold">{p.name}</h3>
                            {currentPlan === p.id && <span className="px-2 py-0.5 rounded-full bg-neon-green/20 text-neon-green text-[10px] font-black">AKTİF</span>}
                        </div>
                        <div className="text-3xl font-black text-gaming-gradient mb-3">₺{p.price}</div>
                        <ul className="space-y-1.5 mb-4">
                            {(p.features || []).slice(0, 4).map((f: string) => (
                                <li key={f} className="flex items-start gap-1.5 text-xs text-white/70"><Check size={12} className="text-neon-green mt-0.5" /> {f}</li>
                            ))}
                        </ul>
                        <button
                            onClick={() => changePlan(p.id)}
                            disabled={busy || currentPlan === p.id}
                            className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {currentPlan === p.id ? 'Mevcut Plan' : `${p.name}'e Geç`}
                        </button>
                    </div>
                ))}
            </div>

            {/* Billing history */}
            <h2 className="font-heading text-xl font-black mb-4">Faturalama Geçmişi</h2>
            <div className="rounded-2xl bg-card border border-white/10 overflow-hidden">
                {history.length === 0 ? (
                    <div className="text-center py-10 text-white/50 text-sm">Henüz ödeme geçmişin yok.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-white/5">
                            <tr className="text-left text-white/60 text-xs uppercase tracking-widest">
                                <th className="px-5 py-3">Tarih</th>
                                <th className="px-5 py-3">Plan</th>
                                <th className="px-5 py-3 text-right">Tutar</th>
                                <th className="px-5 py-3">Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((h, i) => (
                                <tr key={i} className="border-t border-white/5">
                                    <td className="px-5 py-3 text-white/70">{new Date(h.paymentDate || h.createdAt).toLocaleDateString('tr-TR')}</td>
                                    <td className="px-5 py-3 capitalize">{h.plan}</td>
                                    <td className="px-5 py-3 text-right font-mono text-neon-green">{h.amount} {h.currency}</td>
                                    <td className="px-5 py-3"><span className={h.status === 'paid' ? 'text-neon-green' : 'text-amber-400'}>{h.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="mt-10 rounded-xl bg-amber-500/5 border border-amber-500/20 p-5 flex gap-3 text-sm">
                <AlertTriangle className="text-amber-400 flex-shrink-0" size={20} />
                <div className="text-amber-200/80">
                    <b>Otomatik Yenileme:</b> Tüm planlar her ay otomatik yenilenir. İptal edersen mevcut periyot sonunda Free plana geçersin.
                    Sorularını <a className="text-neon-green hover:underline" href="mailto:destek@seligame.com">destek@seligame.com</a> adresine yazabilirsin.
                </div>
            </div>
        </div>
    )
}
