import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MyConfigs } from '../components/MyConfigs'
import { useAuth } from '../context/AuthContext'
import { UserMenu } from '../components/UserMenu'

const colors = {
  background: '#080f1e',
  border: 'rgba(0, 229, 255, 0.12)',
  primary: '#00e5ff',
  textPrimary: '#e0f7fa',
  textSecondary: '#78909c',
  textMuted: '#455a64',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

export const MyConfigsPage: React.FC = () => {
  const { isLoggedIn, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate('/', { replace: true })
    }
  }, [isLoading, isLoggedIn, navigate])

  if (isLoading || !isLoggedIn) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: colors.background,
          color: colors.textMuted,
          fontFamily: fonts.mono,
          fontSize: 13,
        }}
      >
        Loading...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        fontFamily: fonts.mono,
      }}
    >
      {/* Header */}
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
            MY CONFIGS
          </h1>
        </div>
        <UserMenu />
      </div>

      {/* Body */}
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: 24,
        }}
      >
        <MyConfigs />
      </div>
    </div>
  )
}
