'use client'

/* eslint-disable @next/next/no-img-element -- las imágenes ya se optimizan al subirlas y pueden venir de cualquier dominio */
import { useState } from 'react'
import { Dumbbell, Play } from 'lucide-react'
import clsx from 'clsx'
import { exerciseImage, isDirectVideo, mediaUrl, youtubeId } from '@/lib/media'

type ExerciseMedia = {
  name: string
  localImagePath: string | null
  imageUrl: string | null
  localVideoPath?: string | null
  videoUrl?: string | null
  muscleGroup?: string | null
}

export function ExerciseThumb({ exercise, className }: { exercise: ExerciseMedia; className?: string }) {
  const src = exerciseImage(exercise)
  const [failed, setFailed] = useState(false)
  return (
    <div className={clsx('relative overflow-hidden bg-surface-2', className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={exercise.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgb(59_130_246/0.25),transparent_60%),radial-gradient(circle_at_80%_90%,rgb(34_211_238/0.18),transparent_55%)]">
          <Dumbbell className="size-8 text-brand-fg/60" />
        </div>
      )}
    </div>
  )
}

/** YouTube "ligero": muestra la miniatura y solo carga el iframe (≈1 MB) al tocar play */
function YouTubeLite({ id, title }: { id: string; title: string }) {
  const [active, setActive] = useState(false)
  if (active) {
    return (
      <iframe
        className="aspect-video w-full rounded-xl"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-black"
      aria-label={`Reproducir video de ${title}`}
    >
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="size-full object-cover opacity-80 transition group-hover:opacity-100"
      />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-14 place-items-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-110">
          <Play className="ml-0.5 size-6 fill-current" />
        </span>
      </span>
    </button>
  )
}

export function ExerciseVideo({ exercise }: { exercise: ExerciseMedia }) {
  const local = mediaUrl(exercise.localVideoPath)
  const ytId = youtubeId(exercise.videoUrl)
  const poster = exerciseImage(exercise) ?? undefined
  if (local || isDirectVideo(exercise.videoUrl)) {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        poster={poster}
        className="aspect-video w-full rounded-xl bg-black"
        src={local ?? exercise.videoUrl ?? undefined}
      >
        Tu navegador no puede reproducir este video.
      </video>
    )
  }
  if (ytId) return <YouTubeLite id={ytId} title={exercise.name} />
  if (exercise.videoUrl) {
    return (
      <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full">
        <Play className="size-4" /> Ver video
      </a>
    )
  }
  return null
}
