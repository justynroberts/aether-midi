// MIT License - Copyright (c) fintonlabs.com

interface LogoProps {
  size?: number
  className?: string
}

export function AetherLogo({ size = 28, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle */}
      <circle
        cx="16"
        cy="16"
        r="14.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      {/* Left leg of the A */}
      <path
        d="M10 24 L16 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Right leg of the A */}
      <path
        d="M16 8 L22 24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Crossbar — sine wave */}
      <path
        d="M11.5 19 Q13 16.5 14.5 19 Q16 21.5 17.5 19 Q19 16.5 20.5 19"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function AetherWordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <AetherLogo size={22} />
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-wide">AETHER</span>
        <span
          className="text-[9px] tracking-wide"
          style={{ color: 'var(--text-dim)' }}
        >
          by Fintonlabs
        </span>
      </div>
    </div>
  )
}
