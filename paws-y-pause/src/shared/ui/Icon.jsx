const ICONS = {
  home: '⌂',
  timer: '◷',
  game: '★',
  admin: '▣',
  menu: '☰',
  close: '×',
  sun: '☼',
  moon: '◔',
  text: 'A',
  logout: '↪',
  settings: '⚙',
}

export default function Icon({ name, label }) {
  if (name === 'paw') {
    return (
      <svg aria-hidden={label ? undefined : 'true'} aria-label={label} role={label ? 'img' : undefined} viewBox="0 0 24 24" fill="currentColor">
        <ellipse cx="12" cy="15.5" rx="5.2" ry="4.2" />
        <ellipse cx="5.7" cy="10.6" rx="2.1" ry="2.7" transform="rotate(-25 5.7 10.6)" />
        <ellipse cx="10" cy="7.2" rx="2" ry="2.6" transform="rotate(-8 10 7.2)" />
        <ellipse cx="14.7" cy="7.2" rx="2" ry="2.6" transform="rotate(8 14.7 7.2)" />
        <ellipse cx="18.5" cy="10.6" rx="2.1" ry="2.7" transform="rotate(25 18.5 10.6)" />
      </svg>
    )
  }
  if (name === 'sun' || name === 'moon') {
    return (
      <svg aria-hidden={label ? undefined : 'true'} aria-label={label} role={label ? 'img' : undefined} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {name === 'sun' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8a8.6 8.6 0 1 0 11.3 11.3Z" />
        )}
      </svg>
    )
  }

  return (
    <span aria-hidden={label ? undefined : 'true'} aria-label={label} role={label ? 'img' : undefined}>
      {ICONS[name] ?? '•'}
    </span>
  )
}
