import { createFileRoute } from '@tanstack/react-router'
import { LiveOverlay } from '@/components/live/LiveOverlay'

export const Route = createFileRoute('/live/likes/$overlayId')({
    component: LikesLive,
})

function LikesLive() {
    const { overlayId } = Route.useParams()
    return <LiveOverlay overlayId={overlayId} />
}
