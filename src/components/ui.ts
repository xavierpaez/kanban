// Shared class lists for the cartoon-style controls.
const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-ink px-5 py-2 font-semibold transition-[translate,box-shadow] duration-150 hover:-translate-y-px active:translate-y-px'
const BUTTON_SHADOW =
  'shadow-[3px_3px_0_0_var(--color-ink)] hover:shadow-[4px_4px_0_0_var(--color-ink)] active:shadow-[1px_1px_0_0_var(--color-ink)]'

export const BUTTON = {
  primary: `${BUTTON_BASE} ${BUTTON_SHADOW} bg-portal text-ink`,
  secondary: `${BUTTON_BASE} bg-white text-ink hover:bg-ink/5`,
  danger: `${BUTTON_BASE} ${BUTTON_SHADOW} bg-danger text-white`,
  dangerOutline: `${BUTTON_BASE} bg-white text-danger hover:bg-danger/5`,
}

export const INPUT =
  'w-full rounded-xl border-2 bg-white px-3 py-2.5 text-[15px] text-ink placeholder:text-ink/60 focus:outline-none focus:shadow-[0_0_0_2px_var(--color-card),0_0_0_5px_var(--color-ink)] aria-invalid:focus:shadow-[0_0_0_2px_var(--color-card),0_0_0_5px_var(--color-danger)]'

/** Light panels (dialogs, menus) use an ink focus ring, since the default glow is too pale on cream. */
export const LIGHT_SURFACE = 'text-ink [&_:focus-visible]:outline-ink'

/** Shared dialog look. Each dialog adds its own placement, width, and shadow color. */
export const DIALOG =
  'overflow-y-auto rounded-[28px] border-2 border-ink bg-card p-0 backdrop:bg-space-950/75 backdrop:backdrop-blur-sm transition-[opacity,scale] duration-200 starting:scale-95 starting:opacity-0'
