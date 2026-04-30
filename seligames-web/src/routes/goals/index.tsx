import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Switch from '@mui/material/Switch'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import FavoriteIcon from '@mui/icons-material/Favorite'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import ShareIcon from '@mui/icons-material/Share'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import ChatIcon from '@mui/icons-material/Chat'
import TuneIcon from '@mui/icons-material/Tune'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import api from '@/lib/api'

export const Route = createFileRoute('/goals/')({
    component: GoalsPage,
})

interface GoalStyle {
    barColor: string
    backgroundColor: string
    textColor: string
    fontSize: number
    borderRadius: number
    showPercentage: boolean
    showNumbers: boolean
    animation: string
    theme: string
}

interface Goal {
    _id: string
    overlayId: string
    title: string
    type: string
    targetValue: number
    currentValue: number
    giftFilter?: string
    style: GoalStyle
    isActive: boolean
    isCompleted: boolean
    createdAt: string
}

const GOAL_TYPES = [
    { value: 'like', label: 'Beğeni', icon: <FavoriteIcon /> },
    { value: 'follow', label: 'Takipçi', icon: <PersonAddIcon /> },
    { value: 'share', label: 'Paylaşım', icon: <ShareIcon /> },
    { value: 'gift', label: 'Hediye', icon: <CardGiftcardIcon /> },
    { value: 'comment', label: 'Yorum', icon: <ChatIcon /> },
    { value: 'custom', label: 'Özel', icon: <TuneIcon /> },
]

const THEMES = [
    { value: 'neon', label: 'Neon' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'gradient', label: 'Gradient' },
    { value: 'glass', label: 'Glass' },
]

const ANIMATIONS = [
    { value: 'smooth', label: 'Smooth' },
    { value: 'bounce', label: 'Bounce' },
    { value: 'pulse', label: 'Pulse' },
    { value: 'none', label: 'Yok' },
]

const OVERLAY_BASE_URL = window.location.origin

function getTypeIcon(type: string) {
    return GOAL_TYPES.find(t => t.value === type)?.icon || <TuneIcon />
}

function getTypeLabel(type: string) {
    return GOAL_TYPES.find(t => t.value === type)?.label || type
}

function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

    const [form, setForm] = useState({
        title: '',
        type: 'like',
        targetValue: 100,
        giftFilter: '',
        style: {
            barColor: '#00ff9d',
            backgroundColor: 'rgba(0,0,0,0.6)',
            textColor: '#ffffff',
            fontSize: 18,
            borderRadius: 12,
            showPercentage: true,
            showNumbers: true,
            animation: 'smooth',
            theme: 'neon',
        }
    })

    useEffect(() => {
        fetchGoals()
    }, [])

    const fetchGoals = async () => {
        try {
            const res = await api.get('/goals')
            setGoals(res.data)
        } catch {
            setSnackbar({ open: true, message: 'Goal\'lar yüklenemedi', severity: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const openCreateDialog = () => {
        setEditingGoal(null)
        setForm({
            title: '', type: 'like', targetValue: 100, giftFilter: '',
            style: { barColor: '#00ff9d', backgroundColor: 'rgba(0,0,0,0.6)', textColor: '#ffffff', fontSize: 18, borderRadius: 12, showPercentage: true, showNumbers: true, animation: 'smooth', theme: 'neon' }
        })
        setDialogOpen(true)
    }

    const openEditDialog = (goal: Goal) => {
        setEditingGoal(goal)
        setForm({
            title: goal.title,
            type: goal.type,
            targetValue: goal.targetValue,
            giftFilter: goal.giftFilter || '',
            style: { ...goal.style }
        })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        try {
            if (editingGoal) {
                await api.put(`/goals/${editingGoal._id}`, form)
                setSnackbar({ open: true, message: 'Goal güncellendi!', severity: 'success' })
            } else {
                await api.post('/goals', form)
                setSnackbar({ open: true, message: 'Yeni goal oluşturuldu!', severity: 'success' })
            }
            setDialogOpen(false)
            fetchGoals()
        } catch {
            setSnackbar({ open: true, message: 'Hata oluştu', severity: 'error' })
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/goals/${id}`)
            setSnackbar({ open: true, message: 'Goal silindi', severity: 'success' })
            fetchGoals()
        } catch {
            setSnackbar({ open: true, message: 'Silinemedi', severity: 'error' })
        }
    }

    const handleReset = async (id: string) => {
        try {
            await api.post(`/goals/${id}/reset`)
            setSnackbar({ open: true, message: 'Goal sıfırlandı', severity: 'success' })
            fetchGoals()
        } catch {
            setSnackbar({ open: true, message: 'Sıfırlanamadı', severity: 'error' })
        }
    }

    const handleToggleActive = async (goal: Goal) => {
        try {
            await api.put(`/goals/${goal._id}`, { ...goal, isActive: !goal.isActive })
            fetchGoals()
        } catch {
            setSnackbar({ open: true, message: 'Güncellenemedi', severity: 'error' })
        }
    }

    const copyOverlayUrl = (overlayId: string) => {
        const url = `${OVERLAY_BASE_URL}/overlay/goal/${overlayId}`
        navigator.clipboard.writeText(url)
        setSnackbar({ open: true, message: 'Overlay URL kopyalandı!', severity: 'success' })
    }

    const percentage = (current: number, target: number) => Math.min((current / target) * 100, 100)

    return (
        <Box sx={{ minHeight: '100vh', pb: 8 }}>
            {/* Hero */}
            <Box sx={{
                pt: { xs: 6, md: 10 }, pb: { xs: 4, md: 6 },
                background: 'linear-gradient(to bottom, rgba(0, 255, 157, 0.06), transparent)',
            }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
                        <Box>
                            <Typography variant="h2" sx={{
                                fontWeight: 700, mb: 1,
                                background: 'linear-gradient(135deg, #00ff9d, #00f0ff)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                fontSize: { xs: '2rem', md: '2.75rem' }
                            }}>
                                Goal Overlays
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'chrome.400', maxWidth: 600 }}>
                                Canlı yayınında hedefler belirle, izleyicilerin katkılarını gerçek zamanlı olarak ekranda göster.
                                OBS veya TikTok Live Studio'ya overlay URL'sini ekle.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateDialog}
                            sx={{
                                px: 4, py: 1.5,
                                background: 'linear-gradient(135deg, #00ff9d, #00f0ff)',
                                color: '#000', fontWeight: 700,
                                '&:hover': { transform: 'scale(1.05)', boxShadow: '0 0 30px rgba(0,255,157,0.4)' },
                                transition: 'all 0.3s'
                            }}
                        >
                            Yeni Goal
                        </Button>
                    </Box>
                </Container>
            </Box>

            <Container maxWidth="lg">
                {/* How it works */}
                <Box sx={{
                    display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 6,
                }}>
                    {[
                        { step: '1', title: 'Goal Oluştur', desc: 'Hedef türünü ve sayısını belirle, görselini özelleştir.' },
                        { step: '2', title: 'URL\'yi Kopyala', desc: 'Overlay URL\'sini OBS veya Live Studio\'ya browser source olarak ekle.' },
                        { step: '3', title: 'Canlı Yayın', desc: 'Yayında izleyiciler etkileşime geçtikçe hedef çubuğu gerçek zamanlı dolar.' },
                    ].map((item) => (
                        <Box key={item.step} sx={{
                            p: 3, borderRadius: 3,
                            bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', gap: 2, alignItems: 'flex-start'
                        }}>
                            <Box sx={{
                                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #00ff9d, #00f0ff)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, color: '#000', fontSize: '1.1rem'
                            }}>
                                {item.step}
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', mb: 0.5 }}>
                                    {item.title}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'chrome.400' }}>
                                    {item.desc}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>

                {/* Goals List */}
                {loading ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography sx={{ color: 'chrome.400' }}>Yükleniyor...</Typography>
                    </Box>
                ) : goals.length === 0 ? (
                    <Box sx={{
                        textAlign: 'center', py: 10,
                        border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 4
                    }}>
                        <CardGiftcardIcon sx={{ fontSize: 64, color: 'chrome.600', mb: 2 }} />
                        <Typography variant="h5" sx={{ color: 'chrome.400', mb: 1 }}>
                            Henüz goal yok
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'chrome.500', mb: 3 }}>
                            İlk goal overlay'ini oluştur ve yayınına etkileşim kat!
                        </Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}
                            sx={{ background: 'linear-gradient(135deg, #00ff9d, #00f0ff)', color: '#000', fontWeight: 700 }}>
                            İlk Goal'ü Oluştur
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <AnimatePresence>
                            {goals.map((goal, i) => (
                                <motion.div
                                    key={goal._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Box sx={{
                                        p: 3, borderRadius: 3,
                                        bgcolor: 'rgba(26,26,26,0.6)', backdropFilter: 'blur(20px)',
                                        border: '1px solid',
                                        borderColor: goal.isActive ? 'rgba(0,255,157,0.2)' : 'rgba(255,255,255,0.05)',
                                        transition: 'all 0.3s',
                                        '&:hover': { borderColor: 'rgba(0,255,157,0.4)', transform: 'translateY(-2px)' }
                                    }}>
                                        {/* Header */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box sx={{
                                                    p: 1, borderRadius: 2,
                                                    bgcolor: goal.isActive ? 'rgba(0,255,157,0.1)' : 'rgba(255,255,255,0.05)',
                                                    color: goal.isActive ? '#00ff9d' : 'chrome.500',
                                                    display: 'flex'
                                                }}>
                                                    {getTypeIcon(goal.type)}
                                                </Box>
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'white', lineHeight: 1.3 }}>
                                                        {goal.title}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                        <Chip label={getTypeLabel(goal.type)} size="small"
                                                            sx={{ bgcolor: 'rgba(0,240,255,0.1)', color: '#00f0ff', fontSize: '0.75rem' }} />
                                                        {goal.isCompleted && (
                                                            <Chip label="Tamamlandı" size="small"
                                                                sx={{ bgcolor: 'rgba(0,255,157,0.2)', color: '#00ff9d', fontSize: '0.75rem' }} />
                                                        )}
                                                        {!goal.isActive && (
                                                            <Chip label="Pasif" size="small"
                                                                sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'chrome.500', fontSize: '0.75rem' }} />
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Switch
                                                    checked={goal.isActive}
                                                    onChange={() => handleToggleActive(goal)}
                                                    size="small"
                                                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00ff9d' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00ff9d' } }}
                                                />
                                                <Tooltip title="Overlay URL Kopyala">
                                                    <IconButton onClick={() => copyOverlayUrl(goal.overlayId)} sx={{ color: '#00f0ff' }}>
                                                        <ContentCopyIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Önizleme">
                                                    <IconButton component="a" href={`/overlay/goal/${goal.overlayId}`} target="_blank" sx={{ color: 'chrome.400' }}>
                                                        <OpenInNewIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Düzenle">
                                                    <IconButton onClick={() => openEditDialog(goal)} sx={{ color: 'chrome.400' }}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Sıfırla">
                                                    <IconButton onClick={() => handleReset(goal._id)} sx={{ color: 'chrome.400' }}>
                                                        <RestartAltIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Sil">
                                                    <IconButton onClick={() => handleDelete(goal._id)} sx={{ color: '#ff4444' }}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>

                                        {/* Progress Bar */}
                                        <Box sx={{ mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" sx={{ color: 'chrome.300' }}>
                                                    {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: goal.style.barColor, fontWeight: 600 }}>
                                                    %{percentage(goal.currentValue, goal.targetValue).toFixed(1)}
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={percentage(goal.currentValue, goal.targetValue)}
                                                sx={{
                                                    height: 12, borderRadius: 6,
                                                    bgcolor: 'rgba(255,255,255,0.05)',
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 6,
                                                        background: `linear-gradient(90deg, ${goal.style.barColor}, ${goal.style.barColor}dd)`,
                                                        boxShadow: `0 0 12px ${goal.style.barColor}66`
                                                    }
                                                }}
                                            />
                                        </Box>

                                        {/* Overlay URL */}
                                        <Box sx={{
                                            display: 'flex', alignItems: 'center', gap: 1, mt: 2,
                                            p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <Typography variant="caption" sx={{ color: 'chrome.500', flex: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {OVERLAY_BASE_URL}/overlay/goal/{goal.overlayId}
                                            </Typography>
                                            <Button size="small" onClick={() => copyOverlayUrl(goal.overlayId)}
                                                sx={{ color: '#00ff9d', fontSize: '0.75rem', minWidth: 'auto' }}>
                                                Kopyala
                                            </Button>
                                        </Box>
                                    </Box>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </Box>
                )}
            </Container>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { bgcolor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, color: 'white' }}>
                    {editingGoal ? 'Goal Düzenle' : 'Yeni Goal Oluştur'}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
                    <TextField label="Başlık" fullWidth value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="Örn: 10K Beğeni Hedefi" />

                    <TextField label="Hedef Türü" select fullWidth value={form.type}
                        onChange={e => setForm({ ...form, type: e.target.value })}>
                        {GOAL_TYPES.map(t => (
                            <MenuItem key={t.value} value={t.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {t.icon} {t.label}
                                </Box>
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField label="Hedef Sayısı" type="number" fullWidth value={form.targetValue}
                        onChange={e => setForm({ ...form, targetValue: parseInt(e.target.value) || 1 })}
                        inputProps={{ min: 1 }} />

                    {form.type === 'gift' && (
                        <TextField label="Hediye Filtresi (opsiyonel)" fullWidth value={form.giftFilter}
                            onChange={e => setForm({ ...form, giftFilter: e.target.value })}
                            placeholder="Belirli bir hediye adı (boş = tümü)"
                            helperText="Sadece belirli bir hediye türünü saymak için yazın" />
                    )}

                    <Typography variant="subtitle2" sx={{ color: 'chrome.300', mt: 1 }}>
                        Görünüm Ayarları
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField label="Tema" select fullWidth value={form.style.theme}
                            onChange={e => setForm({ ...form, style: { ...form.style, theme: e.target.value } })}>
                            {THEMES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                        </TextField>

                        <TextField label="Animasyon" select fullWidth value={form.style.animation}
                            onChange={e => setForm({ ...form, style: { ...form.style, animation: e.target.value } })}>
                            {ANIMATIONS.map(a => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
                        </TextField>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'chrome.400', mb: 0.5, display: 'block' }}>Bar Rengi</Typography>
                            <input type="color" value={form.style.barColor}
                                onChange={e => setForm({ ...form, style: { ...form.style, barColor: e.target.value } })}
                                style={{ width: '100%', height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ color: 'chrome.400', mb: 0.5, display: 'block' }}>Yazı Rengi</Typography>
                            <input type="color" value={form.style.textColor}
                                onChange={e => setForm({ ...form, style: { ...form.style, textColor: e.target.value } })}
                                style={{ width: '100%', height: 40, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
                        </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <TextField label="Font Boyutu" type="number" value={form.style.fontSize}
                            onChange={e => setForm({ ...form, style: { ...form.style, fontSize: parseInt(e.target.value) || 18 } })}
                            inputProps={{ min: 10, max: 48 }} />
                        <TextField label="Köşe Yuvarlaklığı" type="number" value={form.style.borderRadius}
                            onChange={e => setForm({ ...form, style: { ...form.style, borderRadius: parseInt(e.target.value) || 0 } })}
                            inputProps={{ min: 0, max: 50 }} />
                    </Box>

                    {/* Live Preview */}
                    <Typography variant="subtitle2" sx={{ color: 'chrome.300', mt: 1 }}>
                        Önizleme
                    </Typography>
                    <Box sx={{
                        p: 3, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <GoalPreview form={form} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ color: 'chrome.400' }}>İptal</Button>
                    <Button onClick={handleSave} variant="contained"
                        disabled={!form.title || !form.targetValue}
                        sx={{ background: 'linear-gradient(135deg, #00ff9d, #00f0ff)', color: '#000', fontWeight: 700 }}>
                        {editingGoal ? 'Güncelle' : 'Oluştur'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}
                    sx={{ bgcolor: snackbar.severity === 'success' ? 'rgba(0,255,157,0.15)' : 'rgba(255,0,0,0.15)', color: 'white' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    )
}

function GoalPreview({ form }: { form: any }) {
    const pct = 65

    return (
        <Box sx={{ fontFamily: 'Inter, sans-serif' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: form.style.textColor, fontSize: form.style.fontSize, fontWeight: 700 }}>
                    {form.title || 'Goal Başlığı'}
                </Typography>
                <Typography sx={{ color: form.style.barColor, fontSize: form.style.fontSize * 0.8, fontWeight: 600 }}>
                    {Math.round(form.targetValue * 0.65).toLocaleString()} / {form.targetValue.toLocaleString()}
                </Typography>
            </Box>
            <Box sx={{
                height: 24, borderRadius: `${form.style.borderRadius}px`,
                bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative'
            }}>
                <Box sx={{
                    width: `${pct}%`, height: '100%',
                    borderRadius: `${form.style.borderRadius}px`,
                    background: `linear-gradient(90deg, ${form.style.barColor}, ${form.style.barColor}cc)`,
                    boxShadow: `0 0 16px ${form.style.barColor}55`,
                    transition: 'width 0.5s ease'
                }} />
                <Typography sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    color: 'white', fontSize: 12, fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                }}>
                    {pct}%
                </Typography>
            </Box>
        </Box>
    )
}
