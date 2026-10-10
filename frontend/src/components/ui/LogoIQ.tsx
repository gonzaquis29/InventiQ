// Mismo logo que el favicon (public/favicon.svg): si cambias uno, cambia el otro.
export function LogoIQ({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="InventiQ"
    >
      <rect width="64" height="64" rx="15" fill="#0a0a0a" />
      <rect x="11" y="16" width="9" height="32" rx="2.5" fill="#ff5a2e" />
      <circle
        cx="40"
        cy="31"
        r="12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="8"
      />
      <path
        d="M42 38 L53 51"
        stroke="#ff5a2e"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
