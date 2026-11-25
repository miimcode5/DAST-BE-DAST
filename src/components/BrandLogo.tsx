import { useId } from 'react';

export function BrandMark({ className = 'h-10 w-10' }: { className?: string }) {
  const gradId = useId();

  return (
    <svg viewBox="0 0 512 512" fill="none" className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="24" y1="24" x2="488" y2="488" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#174D35" />
          <stop offset="100%" stopColor="#26734B" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="126" fill={`url(#${gradId})`} />
      <g transform="translate(256, 256) scale(1.0)">
        <g transform="rotate(45)">
          <rect
            x="-188"
            y="-38"
            width="44"
            height="78"
            rx="11"
            fill="#78B98A"
            fillOpacity="0.14"
            stroke="#F6F7F2"
            strokeWidth="12"
            strokeLinejoin="round"
          />
          <path
            d="M -144 -20 L -118 -20 C -104 -20 -95 -28 -86 -39 L -68 -60 C -61 -68 -48 -66 -43 -57 C -39 -50 -43 -41 -49 -35 L -67 -20 L -36 -20 A 8.5 8.5 0 0 1 -36 -3 L -80 -3"
            stroke="#F6F7F2"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M -80 -3 L -24 -3 A 8.5 8.5 0 0 1 -24 14 L -82 14"
            stroke="#F6F7F2"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M -82 14 L -34 14 A 8.5 8.5 0 0 1 -34 31 L -84 31"
            stroke="#F6F7F2"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M -84 31 L -50 31 A 8.5 8.5 0 0 1 -50 48 L -102 48 C -118 48 -130 29 -144 29"
            stroke="#F6F7F2"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g transform="rotate(225)">
          <rect
            x="-188"
            y="-38"
            width="44"
            height="78"
            rx="11"
            fill="#78B98A"
            fillOpacity="0.14"
            stroke="#F6F7F2"
            strokeWidth="12"
            strokeLinejoin="round"
          />
          <path
            d="M -144 -20 L -118 -20 C -104 -20 -95 -28 -86 -39 L -68 -60 C -61 -68 -48 -66 -43 -57 C -39 -50 -43 -41 -49 -35 L -67 -20 L -36 -20 A 8.5 8.5 0 0 1 -36 -3 L -80 -3"
            stroke="#F6F7F2"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M -80 -3 L -24 -3 A 8.5 8.5 0 0 1 -24 14 L -82 14"
            stroke="#F6F7F2"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M -82 14 L -34 14 A 8.5 8.5 0 0 1 -34 31 L -84 31"
            stroke="#F6F7F2"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M -84 31 L -50 31 A 8.5 8.5 0 0 1 -50 48 L -102 48 C -118 48 -130 29 -144 29"
            stroke="#F6F7F2"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="-186"
            y1="56"
            x2="-158"
            y2="56"
            stroke="#E9B949"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <circle cx="-138" cy="56" r="5.5" fill="#E9B949" />
        </g>
      </g>
    </svg>
  );
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <BrandMark className={compact ? 'h-9 w-9' : 'h-10 w-10'} />
      <div className="flex flex-col leading-tight">
        <span className="text-base font-extrabold tracking-tight text-[#174D35] sm:text-lg">
          دست‌به‌دست
        </span>
        {!compact && (
          <span className="text-[11px] font-medium text-[#26734B]">
            شبکه همیاری مردمی
          </span>
        )}
      </div>
    </div>
  );
}
