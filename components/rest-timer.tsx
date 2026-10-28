'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'

type TimerApi = { start: (seconds: number, label?: string) => void }
const TimerContext = createContext<TimerApi | null>(null)

export function useRestTimer() {
  return useContext(TimerContext)
}

const PRESETS = [30, 45, 60, 90, 120, 180]

function fmt(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Temporizador de descanso flotante. Usa la hora de fin real, así no se desfasa si la pestaña se duerme. */
export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState(60)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [paused, setPaused] = useState<number | null>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [now, setNow] = useState(0)
  const audio = useRef<AudioContext | null>(null)

  const unlockAudio = () => {
    try {
      audio.current ??= new AudioContext()
      if (audio.current.state === 'suspended') void audio.current.resume()
    } catch {}
  }

  const beep = useCallback(() => {
    const ctx = audio.current
    if (ctx) {
      ;[0, 0.22, 0.44].forEach((t, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = i === 2 ? 1046 : 784
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + t)
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18)
        osc.connect(gain).connect(ctx.destination)
        osc.start(ctx.currentTime + t)
        osc.stop(ctx.currentTime + t + 0.2)
      })
    }
    navigator.vibrate?.([200, 100, 200])
  }, [])

  const start = useCallback((seconds: number, newLabel?: string) => {
    unlockAudio()
    setDuration(seconds)
    setPaused(null)
    setLabel(newLabel ?? null)
    setNow(Date.now())
    setEndAt(Date.now() + seconds * 1000)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!endAt) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endAt) {
        setEndAt(null)
        beep()
        toast.success('¡Descanso terminado! Siguiente serie 💪')
      }
    }, 250)
    return () => clearInterval(id)
  }, [endAt, beep])

  const running = endAt !== null
  const remaining = running ? Math.max(0, Math.ceil((endAt - now) / 1000)) : (paused ?? duration)
  const pct = (remaining / duration) * 100

  const toggle = () => {
    unlockAudio()
    if (running) {
      setPaused(remaining)
      setEndAt(null)
    } else {
      const secs = paused ?? duration
      setPaused(null)
      setNow(Date.now())
      setEndAt(Date.now() + secs * 1000)
    }
  }

  const r = 52
  const c = 2 * Math.PI * r

  return (
    <TimerContext.Provider value={{ start }}>
      {children}

      <div className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 md:bottom-6">
        {open && (
          <div className="card mb-3 w-72 animate-fade-in p-4 shadow-2xl shadow-black/50">
            <div className="mb-2 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Descanso</p>
                {label && <p className="truncate text-xs text-muted">{label}</p>}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)} aria-label="Minimizar">
                <X className="size-4" />
              </button>
            </div>
            <div className="relative mx-auto my-2 grid size-36 place-items-center">
              <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                <circle cx="60" cy="60" r={r} strokeWidth="8" className="fill-none stroke-surface-2" />
                <circle
                  cx="60"
                  cy="60"
                  r={r}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={c - (pct / 100) * c}
                  className={clsx('fill-none transition-[stroke-dashoffset] duration-300', remaining === 0 ? 'stroke-ok' : 'stroke-brand')}
                />
              </svg>
              <span className="text-4xl font-bold tabular-nums" aria-live="polite">
                {fmt(remaining)}
              </span>
            </div>
            <div className="mb-3 flex justify-center gap-2">
              <button className="btn btn-primary" onClick={toggle}>
                {running ? <Pause className="size-4" /> : <Play className="size-4" />}
                {running ? 'Pausar' : remaining === 0 ? 'Repetir' : 'Iniciar'}
              </button>
              <button className="btn btn-secondary" onClick={() => start(duration, label ?? undefined)} aria-label="Reiniciar">
                <RotateCcw className="size-4" />
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => (running ? setEndAt((e) => (e ? e + 15_000 : e)) : setPaused((p) => (p ?? duration) + 15))}
              >
                +15s
              </button>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {PRESETS.map((s) => (
                <button
                  key={s}
                  className={clsx('btn btn-sm px-0', duration === s ? 'btn-secondary text-fg' : 'btn-ghost')}
                  onClick={() => start(s, label ?? undefined)}
                >
                  {s < 60 ? `${s}s` : `${s / 60}${s % 60 ? '.5' : ''}m`}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className={clsx(
            'ml-auto flex h-12 items-center gap-2 rounded-full px-4 font-semibold shadow-xl shadow-black/40 transition active:scale-95',
            running ? 'bg-brand text-white' : 'border border-line-strong bg-elevated text-fg'
          )}
          aria-label="Temporizador de descanso"
        >
          <Timer className="size-5" />
          {running ? <span className="tabular-nums">{fmt(remaining)}</span> : <span className="hidden text-sm sm:inline">Descanso</span>}
        </button>
      </div>
    </TimerContext.Provider>
  )
}
