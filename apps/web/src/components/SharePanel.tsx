import React, { useState } from 'react'

const colors = {
  background: 'rgba(12, 21, 39, 0.95)',
  border: 'rgba(0, 229, 255, 0.12)',
  borderHover: 'rgba(0, 229, 255, 0.35)',
  primary: '#00e5ff',
  green: '#00e676',
  textPrimary: '#e0f7fa',
  textSecondary: '#78909c',
  textMuted: '#455a64',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

interface SharePanelProps {
  yaml: string
  onExportPng: () => void
  isExporting: boolean
}

const ActionButton: React.FC<{
  onClick: () => void
  icon: React.ReactNode
  label: string
  sublabel?: string
  disabled?: boolean
}> = ({ onClick, icon, label, sublabel, disabled }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 12px',
        background: hovered ? 'rgba(0, 229, 255, 0.06)' : 'transparent',
        border: `1px solid ${hovered ? colors.borderHover : colors.border}`,
        borderRadius: 6,
        color: colors.textPrimary,
        cursor: disabled ? 'wait' : 'pointer',
        fontFamily: fonts.mono,
        fontSize: 12,
        textAlign: 'left',
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ color: hovered ? colors.primary : colors.textSecondary, flexShrink: 0 }}>
        {icon}
      </span>
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>{sublabel}</div>
        )}
      </div>
    </button>
  )
}

export const SharePanel: React.FC<SharePanelProps> = ({ yaml, onExportPng, isExporting }) => {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yaml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = yaml
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadYaml = () => {
    const blob = new Blob([yaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'homelab-topology.yaml'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 52,
        right: 16,
        zIndex: 20,
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = colors.borderHover
          e.currentTarget.style.color = colors.primary
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = colors.border
          e.currentTarget.style.color = colors.textSecondary
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          color: colors.textSecondary,
          cursor: 'pointer',
          fontFamily: fonts.mono,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          transition: 'all 0.15s',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
        </svg>
        SHARE
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            width: 240,
            padding: 8,
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            backdropFilter: 'blur(12px)',
          }}
        >
          <ActionButton
            onClick={onExportPng}
            disabled={isExporting}
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
            }
            label={isExporting ? 'Exporting...' : 'Export as PNG'}
            sublabel="High-res image for Reddit"
          />

          <ActionButton
            onClick={handleCopyYaml}
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
            }
            label={copied ? 'Copied!' : 'Copy YAML'}
            sublabel="Share your config with others"
          />

          <ActionButton
            onClick={handleDownloadYaml}
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
            }
            label="Download YAML"
            sublabel="Save as homelab-topology.yaml"
          />
        </div>
      )}
    </div>
  )
}
