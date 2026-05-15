import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTemplate, fetchTemplates, createTemplateFromSlug } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { TemplateCategory, TemplateSummary } from '../lib/api.types'

const colors = {
  background: '#080f1e',
  cardBackground: 'rgba(12, 21, 39, 0.6)',
  border: 'rgba(0, 229, 255, 0.12)',
  borderHover: 'rgba(0, 229, 255, 0.35)',
  primary: '#00e5ff',
  red: '#ff1744',
  textPrimary: '#e0f7fa',
  textSecondary: '#78909c',
  textMuted: '#455a64',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

interface CategoryOption {
  value: TemplateCategory | null
  label: string
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: null, label: 'ALL' },
  { value: 'general', label: 'GENERAL' },
  { value: 'networking', label: 'NETWORKING' },
  { value: 'media', label: 'MEDIA' },
  { value: 'virtualization', label: 'VIRTUALIZATION' },
  { value: 'storage', label: 'STORAGE' },
  { value: 'monitoring', label: 'MONITORING' },
  { value: 'home-automation', label: 'HOME AUTOMATION' },
]

export const Templates: React.FC = () => {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<TemplateCategory | null>(null)
  const [usingSlug, setUsingSlug] = useState<string | null>(null)

  const load = useCallback(async (cat: TemplateCategory | null) => {
    setError(null)
    setTemplates(null)
    try {
      const result = await fetchTemplates(cat ?? undefined)
      setTemplates(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    }
  }, [])

  useEffect(() => {
    load(category)
  }, [load, category])

  const handleUse = async (template: TemplateSummary) => {
    setUsingSlug(template.slug)
    try {
      if (isLoggedIn) {
        // Logged-in path: server-side fork creates a new config owned by the
        // user. Land them on the editor for that config so they can save.
        const created = await createTemplateFromSlug(template.slug)
        navigate(`/edit/${created.slug}`)
      } else {
        // Anonymous path: don't persist anything yet. Just preload the YAML
        // into the editor; the user can choose to save (and sign in) later.
        const detail = await fetchTemplate(template.slug)
        navigate('/', { state: { yaml: detail.yaml } })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to use template')
      setUsingSlug(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CategoryFilter selected={category} onSelect={setCategory} />

      {error && (
        <div style={{ color: colors.red, fontFamily: fonts.mono, fontSize: 12, padding: 16 }}>
          {error}
        </div>
      )}

      {!error && templates === null && (
        <div
          style={{
            padding: 24,
            color: colors.textMuted,
            fontFamily: fonts.mono,
            fontSize: 12,
          }}
        >
          Loading templates...
        </div>
      )}

      {!error && templates !== null && templates.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: colors.textMuted,
            fontFamily: fonts.mono,
            fontSize: 12,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>∅</div>
          <div>No templates in this category yet.</div>
        </div>
      )}

      {!error && templates !== null && templates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map((template) => (
            <TemplateCard
              key={template.slug}
              template={template}
              onPreview={() => navigate(`/s/${template.slug}`)}
              onUse={() => handleUse(template)}
              using={usingSlug === template.slug}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const CategoryFilter: React.FC<{
  selected: TemplateCategory | null
  onSelect: (cat: TemplateCategory | null) => void
}> = ({ selected, onSelect }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
    {CATEGORY_OPTIONS.map((opt) => (
      <CategoryPill
        key={opt.value ?? 'all'}
        label={opt.label}
        active={selected === opt.value}
        onClick={() => onSelect(opt.value)}
      />
    ))}
  </div>
)

const CategoryPill: React.FC<{
  label: string
  active: boolean
  onClick: () => void
}> = ({ label, active, onClick }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '5px 10px',
        background: active ? `${colors.primary}15` : 'transparent',
        border: `1px solid ${active || hovered ? colors.borderHover : colors.border}`,
        borderRadius: 5,
        color: active ? colors.primary : colors.textSecondary,
        cursor: 'pointer',
        fontFamily: fonts.mono,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

const TemplateCard: React.FC<{
  template: TemplateSummary
  onPreview: () => void
  onUse: () => void
  using: boolean
}> = ({ template, onPreview, onUse, using }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 16,
        background: colors.cardBackground,
        border: `1px solid ${hovered ? colors.borderHover : colors.border}`,
        borderRadius: 8,
        fontFamily: fonts.mono,
        transition: 'border-color 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: colors.textPrimary,
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {template.title}
          </div>
          <div
            style={{
              color: colors.textMuted,
              fontSize: 10,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {template.category && <span>{template.category}</span>}
            <span>
              {template.viewCount} view{template.viewCount !== 1 ? 's' : ''}
            </span>
          </div>
          {template.tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 8,
              }}
            >
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '2px 8px',
                    background: 'rgba(0, 229, 255, 0.06)',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    color: colors.textSecondary,
                    fontSize: 9,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <CardButton onClick={onPreview} label="PREVIEW" disabled={using} />
          <CardButton onClick={onUse} label={using ? '...' : 'USE'} primary disabled={using} />
        </div>
      </div>
    </div>
  )
}

const CardButton: React.FC<{
  onClick: () => void
  label: string
  primary?: boolean
  disabled?: boolean
}> = ({ onClick, label, primary, disabled }) => {
  const [hovered, setHovered] = useState(false)
  const baseColor = primary ? colors.primary : colors.textSecondary
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '5px 10px',
        background: hovered && !disabled ? `${baseColor}15` : 'transparent',
        border: `1px solid ${hovered && !disabled ? baseColor : colors.border}`,
        borderRadius: 5,
        color: hovered && !disabled ? baseColor : colors.textSecondary,
        cursor: disabled ? 'wait' : 'pointer',
        fontFamily: fonts.mono,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}
