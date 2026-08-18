import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { colors, fonts } from '@homelab-stackdoc/renderer'
import { fetchGithubStats } from '../lib/api'
import { UserMenu } from './UserMenu'

const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'http://stackdoc.localhost:3001'

interface AppNavProps {
  title?: string
  kicker?: string
  primaryAction?: React.ReactNode
}

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const active = location.pathname === to

  return (
    <button
      onClick={() => navigate(to)}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = colors.primary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? colors.primary : colors.textSecondary
      }}
      style={{
        background: 'transparent',
        border: 'none',
        color: active ? colors.primary : colors.textSecondary,
        fontFamily: fonts.mono,
        fontSize: 11,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        padding: '4px 0',
      }}
    >
      {children}
    </button>
  )
}

const ExternalNavLink: React.FC<{ href: string; title?: string; children: React.ReactNode }> = ({
  href,
  title,
  children,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    title={title}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = colors.primary
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = colors.textSecondary
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      color: colors.textSecondary,
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: '0.04em',
      textDecoration: 'none',
      padding: '4px 0',
    }}
  >
    {children}
  </a>
)

// Plain same-tab anchor for destinations outside the SPA's router (e.g. the docs site,
// served on its own subdomain) — a react-router NavLink would try to client-side navigate
// to a route that doesn't exist.
const SiteLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = colors.primary
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = colors.textSecondary
    }}
    style={{
      color: colors.textSecondary,
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: '0.04em',
      textDecoration: 'none',
      padding: '4px 0',
    }}
  >
    {children}
  </a>
)

// Octocat glyph — matches the icon UserMenu already uses for the GitHub OAuth button.
const GithubIcon: React.FC = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.3-3.2-.1-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.7-5.5 6 .5.4.9 1.1.9 2.3v3.4c0 .3.2.7.8.6A12 12 0 0012 .3" />
  </svg>
)

const DefaultNewDiagramButton: React.FC = () => {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => navigate('/editor')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        background: hovered ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
        border: `1px solid ${colors.primary}`,
        borderRadius: 5,
        color: colors.primary,
        cursor: 'pointer',
        fontFamily: fonts.mono,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        transition: 'background 0.15s',
      }}
    >
      NEW DIAGRAM
    </button>
  )
}

// Compact numeric formatting for the star/fork counts (1234 -> "1.2k"), keeps the badge from
// pushing the header layout around once real counts come in.
function formatCount(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
}

const GithubBadge: React.FC = () => {
  const [stats, setStats] = useState<{ stars: number; forks: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchGithubStats().then((result) => {
      if (cancelled || !result || result.stars === null || result.forks === null) return
      setStats({ stars: result.stars, forks: result.forks })
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (!stats) return null

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6 }}>
      <span>★ {formatCount(stats.stars)}</span>
      <span>⑂ {formatCount(stats.forks)}</span>
    </span>
  )
}

export const AppNav: React.FC<AppNavProps> = ({ title, kicker, primaryAction }) => (
  <header
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      padding: '14px 28px',
      borderBottom: `1px solid ${colors.border}`,
      background: 'rgba(8, 15, 30, 0.92)',
      backdropFilter: 'blur(8px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}
  >
    {/* Brand — anchor, not navigate(), so middle-click opens a new tab. */}
    <a
      href="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        textDecoration: 'none',
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ color: colors.primary }}>&gt;_</span>
      stackdoc
    </a>

    <span
      style={{
        padding: '2px 6px',
        border: `1px solid ${colors.green}40`,
        borderRadius: 3,
        color: colors.green,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.1em',
      }}
    >
      LIVE
    </span>

    {title && (
      <span
        style={{
          color: colors.textPrimary,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </span>
    )}

    {kicker && (
      <span
        style={{
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: 0,
        }}
      >
        {kicker}
      </span>
    )}

    <div style={{ flex: 1 }} />

    <nav style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
      <ExternalNavLink href="https://github.com/thatkazuk1/infra-stackdoc" title="github">
        <GithubIcon />
        <GithubBadge />
      </ExternalNavLink>
      <NavLink to="/templates">templates</NavLink>
      <NavLink to="/gallery">gallery</NavLink>
      <SiteLink href={DOCS_URL}>docs</SiteLink>
    </nav>

    {primaryAction ?? <DefaultNewDiagramButton />}

    <UserMenu />
  </header>
)
