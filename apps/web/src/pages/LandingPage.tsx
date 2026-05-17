import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parse, layout } from '@homelab-stackdoc/core'
import { TopologyCanvas, colors, fonts } from '@homelab-stackdoc/renderer'
import type { PositionedGraph, Device, Connection } from '@homelab-stackdoc/core'
import { buildDeviceMap } from '../lib/device'
import { UserMenu } from '../components/UserMenu'
import SAMPLE_YAML from '../sample.yaml?raw'

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = colors.primary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = colors.textSecondary
      }}
      style={{
        background: 'transparent',
        border: 'none',
        color: colors.textSecondary,
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

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      padding: '4px 10px',
      background: 'rgba(0, 229, 255, 0.06)',
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      color: colors.textSecondary,
      fontFamily: fonts.mono,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.08em',
    }}
  >
    {children}
  </span>
)

const PreviewFrame: React.FC = () => {
  const [graph, setGraph] = useState<PositionedGraph | null>(null)
  const [deviceMap, setDeviceMap] = useState<Map<string, Device>>(new Map())
  const [connections, setConnections] = useState<Connection[]>([])
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    try {
      const result = parse(SAMPLE_YAML)
      if (!result.ok) {
        console.warn(
          'LandingPage: seed YAML failed to parse — preview will show empty fallback.',
          result.errors,
        )
        setErrored(true)
        return
      }
      const positioned = layout(result.document)
      setGraph(positioned)
      setDeviceMap(buildDeviceMap(result.document.devices))
      setConnections(result.document.connections ?? [])
    } catch (err) {
      console.warn('LandingPage: layout threw while building preview.', err)
      setErrored(true)
    }
  }, [])

  if (errored || !graph) {
    return <div style={{ width: '100%', height: '100%' }} />
  }

  return (
    <div
      style={{
        transform: 'scale(0.45)',
        transformOrigin: 'top left',
        width: 'calc(100% / 0.45)',
        height: 'calc(100% / 0.45)',
        pointerEvents: 'none',
      }}
    >
      <TopologyCanvas graph={graph} deviceMap={deviceMap} connections={connections} readOnly />
    </div>
  )
}

// ── LandingPage ────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [primaryCtaHovered, setPrimaryCtaHovered] = useState(false)
  const [ghostCtaHovered, setGhostCtaHovered] = useState(false)
  const [newDiagramHovered, setNewDiagramHovered] = useState(false)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        color: colors.textPrimary,
        fontFamily: fonts.mono,
      }}
    >
      {/* Nav strip */}
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
          zIndex: 10,
        }}
      >
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

        <div style={{ flex: 1 }} />

        <nav style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <NavLink to="/templates">templates</NavLink>
          <NavLink to="/gallery">gallery</NavLink>
          <ExternalNavLink href="https://github.com/meetKazuki/infra-stackdoc">
            github
          </ExternalNavLink>
        </nav>

        <button
          onClick={() => navigate('/editor')}
          onMouseEnter={() => setNewDiagramHovered(true)}
          onMouseLeave={() => setNewDiagramHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            background: newDiagramHovered ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
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

        <UserMenu />
      </header>

      {/* Hero */}
      <main
        style={{
          display: 'flex',
          gap: 40,
          padding: '60px 28px',
          maxWidth: 1280,
          margin: '0 auto',
          minHeight: 'calc(100vh - 60px)',
          alignItems: 'center',
        }}
      >
        {/* Left — text */}
        <div
          style={{
            width: 380,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <span
            style={{
              color: colors.textMuted,
              fontSize: 10,
              letterSpacing: '0.14em',
              fontWeight: 600,
            }}
          >
            ── HOMELAB · INFRASTRUCTURE · YAML
          </span>

          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              color: colors.textPrimary,
              fontFamily: fonts.mono,
            }}
          >
            Document your
            <br />
            <span style={{ color: colors.primary }}>homelab as YAML.</span>
            <br />
            render it as a live topology.
          </h1>

          <p
            style={{
              margin: 0,
              color: colors.textSecondary,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Treat your home infrastructure like production: one canonical file, validated on save,
            rendered as a diagram you can share. No drag-and-drop, no proprietary format, no
            lock-in.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              onClick={() => navigate('/editor')}
              onMouseEnter={() => setPrimaryCtaHovered(true)}
              onMouseLeave={() => setPrimaryCtaHovered(false)}
              style={{
                padding: '10px 16px',
                background: primaryCtaHovered
                  ? 'rgba(0, 229, 255, 0.18)'
                  : 'rgba(0, 229, 255, 0.1)',
                border: `1px solid ${colors.primary}`,
                borderRadius: 5,
                color: colors.primary,
                cursor: 'pointer',
                fontFamily: fonts.mono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                transition: 'background 0.15s',
              }}
            >
              $ STACKDOC NEW
            </button>
            <button
              onClick={() => navigate('/gallery')}
              onMouseEnter={() => setGhostCtaHovered(true)}
              onMouseLeave={() => setGhostCtaHovered(false)}
              style={{
                padding: '10px 16px',
                background: ghostCtaHovered ? 'rgba(0, 229, 255, 0.06)' : 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: 5,
                color: colors.textSecondary,
                cursor: 'pointer',
                fontFamily: fonts.mono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                transition: 'background 0.15s',
              }}
            >
              VIEW GALLERY
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 12,
            }}
          >
            <Badge>SELF-HOSTABLE</Badge>
            <Badge>MIT</Badge>
            <Badge>DOCKER</Badge>
            <Badge>PROXMOX-FRIENDLY</Badge>
          </div>
        </div>

        {/* Right — preview */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: 540,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            background: 'rgba(8, 15, 30, 0.4)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <PreviewFrame />
        </div>
      </main>
    </div>
  )
}
