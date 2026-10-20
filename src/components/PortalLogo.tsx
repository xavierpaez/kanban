export function PortalLogo() {
  return (
    <div aria-hidden="true" className="group relative size-12 shrink-0 sm:size-14">
      <div className="absolute inset-0 animate-portal-spin rounded-full group-hover:[animation-iteration-count:infinite] bg-[conic-gradient(from_0deg,#effcd9,#97ce4c,#2f7a12,#c8f57f,#4f9a1c,#e3fbb8,#97ce4c,#effcd9)] shadow-[0_0_32px_rgb(151_206_76/0.7)]" />
      <div className="absolute inset-[18%] animate-portal-spin rounded-full bg-[repeating-conic-gradient(from_45deg,rgb(255_255_255/0.5)_0deg_12deg,transparent_12deg_40deg)] [animation-direction:reverse] [animation-duration:4s] group-hover:[animation-iteration-count:infinite]" />
      <div className="absolute inset-[30%] rounded-full bg-[radial-gradient(circle,#fbfff2,#c8f57f_55%,#7fbf3a)] blur-[1.5px]" />
    </div>
  )
}
