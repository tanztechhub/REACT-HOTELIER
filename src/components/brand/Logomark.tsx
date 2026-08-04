import { useId } from 'react'

interface LogomarkProps {
  className?: string
}

export default function Logomark({ className }: LogomarkProps) {
  const gradientId = useId()

  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1C74D1" />
          <stop offset="1" stopColor="#43A047" />
        </linearGradient>
      </defs>
      <path
        d="M32 4 L57 18 V46 L32 60 L7 46 V18 Z"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M23 24 V40 M23 40 L28 34 V24 M41 24 V40 M41 24 L36 30 V40"
        fill="none"
        stroke="currentColor"
        className="text-white"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
