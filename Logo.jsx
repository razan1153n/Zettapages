export function LogoMark({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="ZetaCloud">
      <defs>
        <linearGradient id="zeta-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="14" fill="url(#zeta-mark)" />
      <path
        d="M17.5 32.5h13.2c3.7 0 6.3-2.5 6.3-5.9 0-3.1-2.2-5.5-5.3-5.8-.6-4-3.9-6.8-8-6.8-3.9 0-7.1 2.4-8 6-3 .1-5.4 2.5-5.4 5.6 0 3.3 2.6 6.9 7.2 6.9z"
        fill="rgba(255,255,255,0.95)"
      />
      <circle cx="24" cy="27.4" r="3" fill="url(#zeta-mark)" />
    </svg>
  );
}

export function Logo({ className = "", markClassName = "h-9 w-9", textClassName = "text-lg" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      <span className={`font-heading font-extrabold tracking-tight ${textClassName}`}>
        Zeta<span className="zeta-text-gradient">Cloud</span>
      </span>
    </span>
  );
}