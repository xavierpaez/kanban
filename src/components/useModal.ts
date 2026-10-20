import { useLayoutEffect, useRef } from 'react'

/**
 * Shows a native `<dialog>` as a modal for as long as the component is mounted. The browser
 * traps focus and makes the page inert; closing on unmount returns focus to where it was.
 */
export function useModal() {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return ref
}
