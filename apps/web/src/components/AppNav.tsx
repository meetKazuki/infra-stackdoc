import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { colors, fonts } from '@homelab-stackdoc/renderer'
import { UserMenu } from './UserMenu'

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

const ExternalNavLink: React.FC<{ href: string; children: React.ReactNode }> = ({
  href,
  children,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
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
      <NavLink to="/templates">templates</NavLink>
      <NavLink to="/gallery">gallery</NavLink>
      <ExternalNavLink href="https://github.com/meetKazuki/infra-stackdoc">github</ExternalNavLink>
    </nav>

    {primaryAction ?? <DefaultNewDiagramButton />}

    <UserMenu />
  </header>
)
