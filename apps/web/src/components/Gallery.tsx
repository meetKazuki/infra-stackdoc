import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchGallery } from '../lib/api'
import type { GallerySort, GallerySummary } from '../lib/api.types'

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

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const SORT_OPTIONS: { value: GallerySort; label: string }[] = [
  { value: 'recent', label: 'RECENT' },
  { value: 'popular', label: 'POPULAR' },
  { value: 'most_forked', label: 'MOST FORKED' },
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export const Gallery: React.FC = () => {
  const navigate = useNavigate()

  const [items, setItems] = useState<GallerySummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sort, setSort] = useState<GallerySort>('recent')
  const [tag, setTag] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [sort, tag, search])

  const requestIdRef = useRef(0)

  const load = useCallback(
    async (pageToLoad: number) => {
      const requestId = ++requestIdRef.current
      setLoading(true)
      setError(null)
      try {
        const result = await fetchGallery({
          sort,
          tag: tag ?? undefined,
          search: search || undefined,
          page: pageToLoad,
          limit: PAGE_SIZE,
        })
        if (requestId !== requestIdRef.current) return
        setTotal(result.total)
        setItems((prev) => (pageToLoad === 1 ? result.data : [...prev, ...result.data]))
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to load gallery')
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [sort, tag, search],
  )

  useEffect(() => {
    load(page)
  }, [load, page])

  const handleTagClick = (clicked: string) => {
    setTag((current) => (current === clicked ? null : clicked))
  }

  const hasMore = items.length < total

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FilterBar
        sort={sort}
        onSortChange={setSort}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        tag={tag}
        onClearTag={() => setTag(null)}
      />

      <ResultsMeta items={items.length} total={total} loading={loading} />

      {error && (
        <div style={{ color: colors.red, fontFamily: fonts.mono, fontSize: 12, padding: 16 }}>
          {error}
        </div>
      )}

      {!error && items.length === 0 && !loading && (
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
          <div>No configs match these filters.</div>
        </div>
      )}

      {items.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {items.map((item) => (
            <GalleryCard
              key={item.slug}
              item={item}
              onOpen={() => navigate(`/s/${item.slug}`)}
              onTagClick={handleTagClick}
              activeTag={tag}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 24px' }}>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={loading}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              color: loading ? colors.textMuted : colors.primary,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: fonts.mono,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            {loading ? 'LOADING...' : 'LOAD MORE'}
          </button>
        </div>
      )}
    </div>
  )
}

const FilterBar: React.FC<{
  sort: GallerySort
  onSortChange: (s: GallerySort) => void
  searchInput: string
  onSearchChange: (v: string) => void
  tag: string | null
  onClearTag: () => void
}> = ({ sort, onSortChange, searchInput, onSearchChange, tag, onClearTag }) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
    }}
  >
    <input
      type="text"
      placeholder="Search titles..."
      value={searchInput}
      onChange={(e) => onSearchChange(e.target.value)}
      style={{
        flex: '1 1 200px',
        padding: '6px 10px',
        background: colors.cardBackground,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        color: colors.textPrimary,
        fontFamily: fonts.mono,
        fontSize: 12,
        outline: 'none',
      }}
    />

    <select
      value={sort}
      onChange={(e) => onSortChange(e.target.value as GallerySort)}
      style={{
        padding: '6px 10px',
        background: colors.cardBackground,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        color: colors.textPrimary,
        fontFamily: fonts.mono,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>

    {tag && (
      <button
        onClick={onClearTag}
        title="Clear tag filter"
        style={{
          padding: '5px 10px',
          background: `${colors.primary}15`,
          border: `1px solid ${colors.primary}`,
          borderRadius: 5,
          color: colors.primary,
          cursor: 'pointer',
          fontFamily: fonts.mono,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        TAG: {tag} ✕
      </button>
    )}
  </div>
)

const ResultsMeta: React.FC<{ items: number; total: number; loading: boolean }> = ({
  items,
  total,
  loading,
}) => {
  if (loading && total === 0) {
    return (
      <div style={{ color: colors.textMuted, fontFamily: fonts.mono, fontSize: 11 }}>
        Loading gallery...
      </div>
    )
  }
  if (total === 0) return null
  return (
    <div style={{ color: colors.textMuted, fontFamily: fonts.mono, fontSize: 11 }}>
      Showing {items} of {total}
    </div>
  )
}

const GalleryCard: React.FC<{
  item: GallerySummary
  onOpen: () => void
  onTagClick: (tag: string) => void
  activeTag: string | null
}> = ({ item, onOpen, onTagClick, activeTag }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 16,
        background: colors.cardBackground,
        border: `1px solid ${hovered ? colors.borderHover : colors.border}`,
        borderRadius: 8,
        fontFamily: fonts.mono,
        transition: 'border-color 0.15s',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.title}
      </div>

      <div
        style={{
          color: colors.textMuted,
          fontSize: 10,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {item.author && <span>@{item.author.username}</span>}
        <span>
          {item.viewCount} view{item.viewCount !== 1 ? 's' : ''}
        </span>
        <span>
          {item.forkCount} fork{item.forkCount !== 1 ? 's' : ''}
        </span>
        <span>{formatDate(item.createdAt)}</span>
      </div>

      {item.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {item.tags.map((t) => {
            const isActive = activeTag === t
            return (
              <span
                key={t}
                onClick={(e) => {
                  e.stopPropagation()
                  onTagClick(t)
                }}
                style={{
                  padding: '2px 8px',
                  background: isActive ? `${colors.primary}20` : 'rgba(0, 229, 255, 0.06)',
                  border: `1px solid ${isActive ? colors.primary : colors.border}`,
                  borderRadius: 10,
                  color: isActive ? colors.primary : colors.textSecondary,
                  fontSize: 9,
                  cursor: 'pointer',
                }}
              >
                {t}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
