import { toPersianDigits } from '../lib/formatters';

interface KindnessIllustrationProps {
  compact?: boolean;
  verifiedCount?: number;
  connectedChains?: number;
}

/**
 * Custom lightweight SVG illustration representing the continuous kindness chain:
 * linked rings, warm human nodes, gentle connection arc, and reaching hands motif.
 */
export function KindnessIllustration({
  compact = false,
  verifiedCount = 0,
  connectedChains = 0,
}: KindnessIllustrationProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-[#DCEBDD] bg-[#F6F7F2]/90 ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 360 150"
        className={`w-full ${compact ? 'h-32 sm:h-36' : 'h-36 sm:h-44'}`}
        fill="none"
      >
        {/* Soft background hills / community horizon */}
        <path
          d="M0 132 Q90 104 180 122 T360 112 L360 150 L0 150 Z"
          fill="#DCEBDD"
          opacity="0.65"
        />
        <path
          d="M0 140 Q120 118 230 134 T360 128 L360 150 L0 150 Z"
          fill="#78B98A"
          opacity="0.22"
        />

        {/* Continuous linking chain paths */}
        <path
          d="M54 88 C95 36, 145 36, 180 76 C215 114, 265 112, 306 64"
          stroke="#DCEBDD"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M54 88 C95 36, 145 36, 180 76 C215 114, 265 112, 306 64"
          stroke="#26734B"
          strokeWidth="2.5"
          strokeDasharray="6 8"
          strokeLinecap="round"
          className="animate-chain-dash"
        />

        {/* Interlocked rings representing mutual aid */}
        <g opacity="0.9">
          <circle cx="116" cy="56" r="16" stroke="#78B98A" strokeWidth="3.5" fill="#FFFFFF" />
          <circle cx="136" cy="56" r="16" stroke="#174D35" strokeWidth="3.5" fill="none" />
        </g>

        <g opacity="0.92">
          <circle cx="226" cy="96" r="15" stroke="#174D35" strokeWidth="3.5" fill="#FFFFFF" />
          <circle cx="245" cy="94" r="15" stroke="#E9B949" strokeWidth="3.5" fill="none" />
        </g>

        {/* Node 1: Starter of kindness */}
        <g>
          <circle cx="54" cy="88" r="20" fill="#174D35" />
          <circle cx="54" cy="83" r="6" fill="#DCEBDD" />
          <path
            d="M42 100 C45 93, 63 93, 66 100"
            stroke="#DCEBDD"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* Center Node: Hands reaching & passing help onward */}
        <g>
          <circle cx="180" cy="76" r="24" fill="#FFFFFF" stroke="#174D35" strokeWidth="3" />
          {/* Two stylized reaching hands */}
          <path
            d="M167 79 L176 72 C178 70, 181 71, 182 74 L175 81"
            stroke="#174D35"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M193 73 L184 80 C182 82, 179 81, 178 78 L185 71"
            stroke="#26734B"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="180" cy="59" r="4.5" fill="#E9B949" />
        </g>

        {/* Node 3: Chain multiplier */}
        <g>
          <circle cx="306" cy="64" r="20" fill="#26734B" />
          <circle cx="306" cy="59" r="6" fill="#F6F7F2" />
          <path
            d="M294 76 C297 69, 315 69, 318 76"
            stroke="#F6F7F2"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="324" cy="46" r="5" fill="#E9B949" />
        </g>
      </svg>

      {!compact && (verifiedCount > 0 || connectedChains > 0) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-[#174D35]">
          <span className="rounded-full bg-white px-3 py-1 shadow-2xs">
            {toPersianDigits(verifiedCount)} همیاری تأییدشده
          </span>
          <span className="rounded-full bg-[#E9B949]/25 px-3 py-1 text-[#6F4E06]">
            {toPersianDigits(connectedChains)} پیوند زنجیره‌ساز
          </span>
        </div>
      )}
    </div>
  );
}
