import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Gallery } from '../components/Gallery'
import { UserMenu } from '../components/UserMenu'

const colors = {
  background: '#080f1e',
  border: 'rgba(0, 229, 255, 0.12)',
  textPrimary: '#e0f7fa',
  textSecondary: '#78909c',
  textMuted: '#455a64',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

export const GalleryPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        fontFamily: fonts.mono,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: `1px solid ${colors.border}`,
          background: 'rgba(8, 15, 30, 0.92)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/editor')}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              color: colors.textSecondary,
              cursor: 'pointer',
              fontFamily: fonts.mono,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            ← EDITOR
          </button>
          <h1
            style={{
              margin: 0,
              color: colors.textPrimary,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            GALLERY
          </h1>
          <span
            style={{
              color: colors.textMuted,
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: 0,
            }}
          >
            // what the community is running
          </span>
        </div>
        <UserMenu />
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 24,
        }}
      >
        <Gallery />
      </div>
    </div>
  )
}
