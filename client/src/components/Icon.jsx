const PATHS = {
  home: 'M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  plus: 'M12 5v14M5 12h14',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  drop: 'M12 2.7c-3 4.2-6 7.4-6 11.3a6 6 0 0 0 12 0c0-3.9-3-7.1-6-11.3z',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  calendar: 'M3 5h18v16H3zM16 3v4M8 3v4M3 10h18',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  filter: 'M22 3H2l8 9.5V19l4 2v-8.5L22 3z',
  x: 'M18 6L6 18M6 6l12 12',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9M10 21h4',
  download: 'M12 3v12M7 11l5 5 5-5M5 21h14',
};

export default function Icon({ name, size = 22, strokeWidth = 1.9, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Sweety">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b81" />
          <stop offset="1" stopColor="#ff2d55" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="115" fill="url(#logo-bg)" />
      <path
        d="M256 92c-12 0-22 8-29 19C192 168 138 232 138 306c0 66 53 114 118 114s118-48 118-114c0-74-54-138-89-195-7-11-17-19-29-19z"
        fill="#fff"
      />
      <path d="M196 322c0 34 26 60 60 60" fill="none" stroke="#ff2d55" strokeWidth="22" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}
