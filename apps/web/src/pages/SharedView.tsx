import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { parse, layout, type Device } from '@homelab-stackdoc/core'
import { TopologyCanvas } from '@homelab-stackdoc/renderer'
import { fetchConfig, forkConfig } from '../lib/api'
import type { SharedConfig } from '../lib/api'

const colors = {
  background: '#080f1e',
  backgroundSubtle: '#0c1527',
  border: 'rgba(0, 229, 255, 0.12)',
  borderHover: 'rgba(0, 229, 255, 0.35)',
  primary: '#00e5ff',
  green: '#00e676',
  red: '#ff1744',
  textPrimary: '#e0f7fa',
  textSecondary: '#78909c',
  textMuted: '#455a64',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

function buildDeviceMap(devices: Device[]): Map<string, Device> {
  const map = new Map<string, Device>()
  const walk = (devs: Device[]) => {
    for (const d of devs) {
      map.set(d.id, d)
      if (d.children) walk(d.children)
    }
  }
  walk(devices)
  return map
}

export const SharedView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [config, setConfig] = useState<SharedConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)

    fetchConfig(slug)
      .then(setConfig)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  const { graph, deviceMap, connections } = useMemo(() => {
    if (!config) return { graph: null, deviceMap: new Map(), connections: [] }

    const result = parse(config.yaml)
    if (!result.ok) return { graph: null, deviceMap: new Map(), connections: [] }

    try {
      const positioned = layout(result.document)
      const dMap = buildDeviceMap(result.document.devices)
      return {
        graph: positioned,
        deviceMap: dMap,
        connections: result.document.connections ?? [],
      }
    } catch {
      return { graph: null, deviceMap: new Map(), connections: [] }
    }
  }, [config])

  const handleFork = useCallback(async () => {
    if (!slug) return
    try {
      await forkConfig(slug)
      // Open in editor with the YAML pre-loaded
      navigate('/', { state: { yaml: config?.yaml } })
    } catch (err) {
      console.error('Fork failed:', err)
    }
  }, [slug, config, navigate])

  const handleOpenInEditor = useCallback(() => {
    navigate('/', { state: { yaml: config?.yaml } })
  }, [config, navigate])

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: colors.background,
          fontFamily: fonts.mono,
          color: colors.textMuted,
          fontSize: 13,
        }}
      >
        Loading topology...
      </div>
    )
  }

  // Error state
  if (error || !config) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: colors.background,
          fontFamily: fonts.mono,
          color: colors.textMuted,
          fontSize: 13,
          gap: 16,
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.4 }}>404</div>
        <div>{error || 'Config not found'}</div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            color: colors.primary,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: 12,
          }}
        >
          Go to Editor
        </button>
      </div>
    )
  }

  // No valid graph
  if (!graph) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: colors.background,
          fontFamily: fonts.mono,
          color: colors.textMuted,
          fontSize: 13,
          gap: 16,
        }}
      >
        <div style={{ fontSize: 32, opacity: 0.4 }}>⚠</div>
        <div>This config has invalid YAML</div>
        <button
          onClick={handleOpenInEditor}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            color: colors.primary,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: 12,
          }}
        >
          Open in Editor to Fix
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        background: colors.background,
        position: 'relative',
      }}
    >
      {/* Topology canvas — full screen */}
      <TopologyCanvas graph={graph} deviceMap={deviceMap} connections={connections} />

      {/* Bottom bar — shared config info */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(8,15,30,0.92)',
          backdropFilter: 'blur(8px)',
          borderTop: `1px solid ${colors.border}`,
          fontFamily: fonts.mono,
          zIndex: 10,
        }}
      >
        {/* Left: metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: colors.textSecondary, fontSize: 10 }}>Shared topology</span>
          {config.forkOf && (
            <span style={{ color: colors.textMuted, fontSize: 10 }}>
              forked from {config.forkOf}
            </span>
          )}
          <span style={{ color: colors.textMuted, fontSize: 10 }}>
            {config.viewCount} view{config.viewCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleOpenInEditor}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: 5,
              color: colors.textSecondary,
              cursor: 'pointer',
              fontFamily: fonts.mono,
              fontSize: 10,
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.borderHover
              e.currentTarget.style.color = colors.primary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.color = colors.textSecondary
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
            EDIT
          </button>
          <button
            onClick={handleFork}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              background: `${colors.primary}15`,
              border: `1px solid ${colors.primary}44`,
              borderRadius: 5,
              color: colors.primary,
              cursor: 'pointer',
              fontFamily: fonts.mono,
              fontSize: 10,
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${colors.primary}25`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${colors.primary}15`
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 3a3 3 0 00-1 5.83v6.34a3.001 3.001 0 102 0V15a2 2 0 002-2V9h3.17a3.001 3.001 0 100-2H9v6a4 4 0 01-4 4v.17A3.001 3.001 0 006 3z" />
            </svg>
            FORK
          </button>
        </div>
      </div>
    </div>
  )
}
