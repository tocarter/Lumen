export default function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="10" fill="var(--surface-2)" />
      <path
        d="M8 22h20"
        stroke="var(--gold)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10 22a8 8 0 0 1 16 0"
        fill="var(--gold)"
      />
      <path
        d="M18 8v3.5M11.2 11.2l2.1 2.1M24.8 11.2l-2.1 2.1"
        stroke="var(--teal)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
