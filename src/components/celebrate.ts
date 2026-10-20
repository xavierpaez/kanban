import confetti from 'canvas-confetti'

// The Done-column celebration: a confetti burst from the card, plus a pop of the card and
// its check badge. The confetti draws on its own canvas, which is removed when the burst ends.

// Theme colors from `styles.css`: portal, portal-glow, todo, doing, card. A canvas can't read CSS variables.
const COLORS = ['#97ce4c', '#c8f57f', '#6fd6f7', '#ffd23f', '#fffbef']

/** Celebrates `card` arriving in Done. Callers skip it under reduced motion. */
export function celebrate(card: HTMLElement) {
  card.animate([{ scale: '1' }, { scale: '1.07', rotate: '-1.5deg' }, { scale: '1' }], {
    duration: 420,
    easing: 'cubic-bezier(0.3, 1.5, 0.5, 1)',
  })
  card.querySelector('[data-done-badge]')?.animate([{ scale: '0', rotate: '-90deg' }, { scale: '1', rotate: '0deg' }], {
    duration: 450,
    easing: 'cubic-bezier(0.3, 1.6, 0.5, 1)',
  })

  const rect = card.getBoundingClientRect()
  const canvas = document.createElement('canvas')
  canvas.dataset.testid = 'confetti'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.className = 'pointer-events-none fixed inset-0 z-60 size-full'
  document.body.append(canvas)

  const fire = confetti.create(canvas, { resize: true })
  const done = fire({
    particleCount: 60,
    spread: 100,
    startVelocity: 35,
    ticks: 120,
    colors: COLORS,
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 3) / window.innerHeight,
    },
  })
  void Promise.resolve(done).finally(() => {
    fire.reset()
    canvas.remove()
  })
}
