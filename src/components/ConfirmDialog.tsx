import { useId, useLayoutEffect, useRef } from 'react'
import { BUTTON, DIALOG, LIGHT_SURFACE } from './ui'
import { useModal } from './useModal'

type Props = {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useModal()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const id = useId()

  // Start on the safe choice.
  useLayoutEffect(() => cancelRef.current?.focus(), [])

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      className={`${DIALOG} ${LIGHT_SURFACE} m-auto max-h-[calc(100dvh-2rem)] w-[min(calc(100%-2rem),26rem)] shadow-[8px_8px_0_0_var(--color-dead)]`}
    >
      <div className="p-6">
        <h2 id={`${id}-title`} className="font-display text-2xl tracking-wide">
          {title}
        </h2>
        <p id={`${id}-message`} className="mt-2 text-ink/80">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} className={BUTTON.secondary}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={BUTTON.danger}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
