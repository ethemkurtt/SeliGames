import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/pricing')({
    component: PricingPage,
})

interface Plan {
    id: string
    name: string
    price: number
    features: string[]
    featured?: boolean
}

const fallbackPlans: Plan[] = [
    { id: 'free', name: 'Ücretsiz', price: 0, features: ['1 overlay', 'Temel hediye sesleri', 'Watermark', 'Topluluk desteği'] },
    { id: 'basic', name: 'Basic', price: 99, features: ['10 overlay', 'Tüm hediye sesleri', 'MP3 upload', 'E-posta desteği'] },
    { id: 'pro', name: 'Pro', price: 299, features: ['Sınırsız overlay', 'Mod sistemi (10 oyun)', 'Custom CSS', 'Öncelikli destek'], featured: true },
    { id: 'ultra', name: 'Ultra', price: 599, features: ['Pro + erken erişim', 'API access', 'Özel temalar', 'Birebir destek'] },
]

function PricingPage() {
    const { isAuthenticated } = useAuth()
    const [plans, setPlans] = useState<Plan[]>(fallbackPlans)

    useEffect(() => {
        api.get('/site').then((r) => {
            if (Array.isArray(r.data?.pricingPlans)) setPlans(r.data.pricingPlans)
        }).catch(() => {})
    }, [])

    return (
        <div>
            <section className="container mx-auto px-4 sm:px-6 pt-20 pb-12 text-center">
                <div className="inline-block px-3 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-[10px] font-black tracking-widest mb-4">
                    FİYATLANDIRMA
                </div>
                <h1 className="font-heading text-4xl sm:text-6xl font-black leading-tight">
                    Sana Uygun <span className="text-gaming-gradient">Plan Seç</span>
                </h1>
                <p className="mt-4 text-white/70 max-w-2xl mx-auto">
                    Tüm planlarda iptal etme garantisi var. Ücretsiz başla, ihtiyacın oldukça yükselt.
                </p>
            </section>

            <section className="container mx-auto px-4 sm:px-6 pb-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.06 }}
                            className={`relative rounded-2xl p-6 backdrop-blur-xl border transition-all ${
                                plan.featured
                                    ? 'bg-gradient-to-br from-neon-green/15 via-neon-blue/10 to-neon-purple/15 border-neon-green/50 shadow-2xl shadow-neon-green/20 scale-[1.03]'
                                    : 'bg-card border-white/10 hover:border-white/20'
                            }`}
                        >
                            {plan.featured && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gaming-gradient text-black text-[10px] font-black tracking-widest flex items-center gap-1">
                                    <Sparkles size={12} /> EN POPÜLER
                                </div>
                            )}

                            <h3 className="text-xl font-black mb-1">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-5xl font-black text-gaming-gradient">{plan.price === 0 ? '₺0' : `₺${plan.price}`}</span>
                                {plan.price > 0 && <span className="text-white/50 text-sm">/ay</span>}
                            </div>
                            <p className="text-xs text-white/50 mb-5">
                                {plan.price === 0 ? 'Sonsuza kadar ücretsiz' : 'İptal etme zamanlı'}
                            </p>

                            <Link
                                to={isAuthenticated ? '/subscription' : '/register'}
                                className={`block text-center py-3 rounded-xl font-bold mb-6 transition-all ${
                                    plan.featured
                                        ? 'bg-gaming-gradient text-black shadow-lg shadow-neon-green/30 hover:scale-[1.02]'
                                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {plan.price === 0 ? 'Ücretsiz Başla' : 'Bu Planı Seç'}
                            </Link>

                            <ul className="space-y-2.5">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                                        <Check className="text-neon-green flex-shrink-0 mt-0.5" size={16} />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-16 text-center max-w-2xl mx-auto">
                    <p className="text-white/60 text-sm leading-relaxed">
                        Tüm planlar 14 gün ücretsiz Pro deneme içerir. Banka kartı bilgisi sormuyoruz, deneme bitince otomatik Free plana iniyorsun.
                        Sorularını <a href="mailto:destek@seligame.com" className="text-neon-green hover:underline">destek@seligame.com</a>'a yazabilirsin.
                    </p>
                </div>
            </section>

            {/* FAQ */}
            <section className="container mx-auto px-4 sm:px-6 pb-20">
                <h2 className="font-heading text-2xl sm:text-3xl font-black text-center mb-8">Sıkça Sorulan Sorular</h2>
                <div className="max-w-3xl mx-auto space-y-3">
                    <FAQ q="İstediğim zaman iptal edebilir miyim?" a="Evet. Aboneliğini istediğin an /subscription sayfasından iptal edebilirsin. Mevcut periyodun sonuna kadar plan aktif kalır." />
                    <FAQ q="Plan değiştirmek mümkün mü?" a="Tabii. Yükseltme anında uygulanır, ücret farkı orantılı kesilir. Düşürme bir sonraki periyotta devreye girer." />
                    <FAQ q="Hangi ödeme yöntemleri kabul ediliyor?" a="Kredi kartı, banka kartı, PayTR ile havale ve ileride kripto. Tüm ödemeler 3D Secure korumalı." />
                    <FAQ q="Modlar nasıl indiriliyor?" a="Pro ve üstü planlarda mod sistemine erişim açık. /mods sayfasından seç, kur, yapılandır." />
                </div>
            </section>
        </div>
    )
}

function FAQ({ q, a }: { q: string; a: string }) {
    return (
        <details className="group rounded-xl bg-card border border-white/10 px-5 py-4 hover:border-white/20 transition-all">
            <summary className="cursor-pointer font-semibold text-white flex items-center justify-between">
                {q}
                <ArrowRight className="group-open:rotate-90 transition-transform text-neon-green" size={18} />
            </summary>
            <p className="text-sm text-white/60 mt-3 leading-relaxed">{a}</p>
        </details>
    )
}
