export function BrandMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#174D35" />
      <path
        d="M32 33C32 33 25 28.5 25 23C25 20.4 27.1 18.2 29.8 18.2C30.9 18.2 31.6 18.7 32 19.5C32.4 18.7 33.1 18.2 34.2 18.2C36.9 18.2 39 20.4 39 23C39 28.5 32 33 32 33Z"
        fill="#E9B949"
      />
      <path
        d="M15 29C15 27 16.6 25.5 18.6 25.5C20.6 25.5 22.2 27 22.2 29V35.5C22.2 39.8 25.7 43 30 43H32V49H29C21.3 49 15 42.8 15 35.2V29Z"
        fill="#FFFFFF"
      />
      <path
        d="M49 29C49 27 47.4 25.5 45.4 25.5C43.4 25.5 41.8 27 41.8 29V35.5C41.8 39.8 38.3 43 34 43H32V49H35C42.7 49 49 42.8 49 35.2V29Z"
        fill="#78B98A"
      />
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
