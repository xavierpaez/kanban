import { useState } from 'react'

// Image addresses that already failed on this page. Cards mount again when they change
// columns, so remembering failures here keeps them from retrying and flashing the broken image.
const failedImages = new Set<string>()

const FALLBACK_COLORS = ['bg-portal', 'bg-todo', 'bg-doing', 'bg-portal-glow']

/** A stable color per name, so different characters' fallbacks don't all look alike. */
function fallbackColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length] ?? 'bg-portal'
}

type Props = {
  name: string
  src: string
  /** Size and placement; the image and its fallback share it. */
  className: string
  lazy?: boolean
}

/**
 * A character's avatar. When the image fails to load, a lettered portal-green disc takes
 * its place, so a flaky image host never leaves a broken-image icon on a card.
 */
export function Avatar({ name, src, className, lazy = false }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (failedSrc === src || failedImages.has(src)) {
    return (
      <span
        aria-hidden="true"
        data-avatar-fallback=""
        className={`${className} grid place-items-center rounded-full border-2 border-ink ${fallbackColor(name)} font-display text-xs leading-none text-ink`}
      >
        {name.trim().charAt(0).toUpperCase() || '?'}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      draggable={false}
      decoding="async"
      loading={lazy ? 'lazy' : undefined}
      onError={() => {
        failedImages.add(src)
        setFailedSrc(src)
      }}
      className={`${className} rounded-full border-2 border-ink bg-space-800 object-cover`}
    />
  )
}
