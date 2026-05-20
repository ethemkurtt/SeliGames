import { Link } from '@tanstack/react-router'
import { Github, Twitter, Youtube } from 'lucide-react'

export function Footer() {
    return (
        <footer className="mt-32 border-t border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="container mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-4">
                {/* Brand */}
                <div className="md:col-span-1">
                    <img src="/app-logo.png" alt="SeliGames" className="h-10 w-auto mb-3 drop-shadow-[0_0_10px_rgba(0,255,157,0.3)]" />
                    <p className="text-sm text-white/60 leading-relaxed">
                        TikTok Live ile oyunlarını izleyicilerinin kontrolüne aç. Her hediye bir aksiyon.
                    </p>
                </div>

                {/* Links */}
                <FooterCol title="Ürün">
                    <FooterLink to="/features">Özellikler</FooterLink>
                    <FooterLink to="/mods">Modlar</FooterLink>
                    <FooterLink to="/download">İndir</FooterLink>
                </FooterCol>
                <FooterCol title="Hesap">
                    <FooterLink to="/login">Giriş Yap</FooterLink>
                    <FooterLink to="/register">Üye Ol</FooterLink>
                    <FooterLink to="/dashboard">Dashboard</FooterLink>
                    <FooterLink to="/subscription">Abonelik</FooterLink>
                </FooterCol>
                <FooterCol title="Destek">
                    <FooterLink href="mailto:destek@seligame.com">E-posta</FooterLink>
                    <FooterLink href="#" external>Discord</FooterLink>
                    <FooterLink href="#" external>YouTube</FooterLink>
                    <FooterLink href="#" external>Twitter/X</FooterLink>
                </FooterCol>
            </div>

            <div className="border-t border-white/10">
                <div className="container mx-auto px-4 sm:px-6 py-5 flex items-center justify-between flex-wrap gap-3">
                    <p className="text-xs text-white/50">
                        © {new Date().getFullYear()} SeliGames — Tüm hakları saklıdır.
                    </p>
                    <div className="flex items-center gap-3">
                        <a href="#" className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"><Github size={16} /></a>
                        <a href="#" className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"><Twitter size={16} /></a>
                        <a href="#" className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"><Youtube size={16} /></a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h4 className="text-xs font-black tracking-widest text-white/80 mb-3 uppercase">{title}</h4>
            <ul className="space-y-2">{children}</ul>
        </div>
    )
}
function FooterLink({ to, href, children, external }: { to?: string; href?: string; children: React.ReactNode; external?: boolean }) {
    if (href) return <li><a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className="text-sm text-white/60 hover:text-neon-green transition-colors">{children}</a></li>
    return <li><Link to={to!} className="text-sm text-white/60 hover:text-neon-green transition-colors">{children}</Link></li>
}
