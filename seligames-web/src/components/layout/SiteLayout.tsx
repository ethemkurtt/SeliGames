import { Navbar } from './Navbar'
import { Footer } from './Footer'

export function SiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 pt-16">{children}</main>
            <Footer />
        </div>
    )
}
