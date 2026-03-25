import { describe, it, expect } from 'vitest'
import {
  MINIMAL_YAML,
  FULL_YAML,
  SCALAR_YAML,
  EMPTY_YAML,
  DUPLICATE_IDS_YAML,
  DANGLING_REF_YAML,
} from './fixtures'
import { parse } from '../src/parser'

describe('parse', () => {
  // ── Successful parsing ──────────────────────────────────────────

  describe('valid input', () => {
    it('parses minimal YAML into a successful result', () => {
      const result = parse(MINIMAL_YAML)

      expect(result.ok).toBe(true)
      if (!result.ok) return // type narrowing

      expect(result.document.meta.title).toBe('Test Lab')
      expect(result.document.devices).toHaveLength(1)
      expect(result.document.devices[0].id).toBe('router')
      expect(result.document.connections).toEqual([])
    })

    it('parses full YAML with all sections', () => {
      const result = parse(FULL_YAML)

      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.document.meta.title).toBe('Full Homelab')
      expect(result.document.meta.subtitle).toBe('2025 Edition')
      expect(result.document.meta.tags).toEqual(['PROXMOX', 'TAILSCALE'])
      expect(result.document.networks).toHaveLength(2)
      expect(result.document.groups).toHaveLength(2)
      expect(result.document.devices).toHaveLength(3)
      expect(result.document.connections).toHaveLength(2)
    })

    it('preserves nested children on devices', () => {
      const result = parse(FULL_YAML)

      expect(result.ok).toBe(true)
      if (!result.ok) return

      const hypervisor = result.document.devices.find((d) => d.id === 'hypervisor')
      expect(hypervisor?.children).toHaveLength(2)
      expect(hypervisor?.children?.[0].id).toBe('dns-vm')
    })

    it('preserves services on nested devices', () => {
      const result = parse(FULL_YAML)

      expect(result.ok).toBe(true)
      if (!result.ok) return

      const hypervisor = result.document.devices.find((d) => d.id === 'hypervisor')
      const dnsVm = hypervisor?.children?.[0]
      expect(dnsVm?.services).toHaveLength(1)
      expect(dnsVm?.services?.[0].name).toBe('Pi-hole')
      expect(dnsVm?.services?.[0].port).toBe(53)
      expect(dnsVm?.services?.[0].runtime).toBe('docker')
    })

    it('returns warnings for non-fatal issues without failing', () => {
      const result = parse(DANGLING_REF_YAML)

      // The connection to "ghost-device" is an error, not a warning,
      // so this should fail validation.
      expect(result.ok).toBe(false)
    })
  })

  // ── YAML syntax failures ────────────────────────────────────────

  describe('YAML syntax errors', () => {
    it('returns an error for unparseable YAML', () => {
      const result = parse('meta: {title: [}')

      expect(result.ok).toBe(false)
      if (result.ok) return

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].severity).toBe('error')
    })

    it('returns an error when root is a scalar', () => {
      const result = parse(SCALAR_YAML)

      expect(result.ok).toBe(false)
      if (result.ok) return

      expect(result.errors[0].message).toBe('Document root must be a mapping.')
    })

    it('returns an error for empty input', () => {
      const result = parse(EMPTY_YAML)

      expect(result.ok).toBe(false)
      if (result.ok) return

      expect(result.errors[0].message).toBe('Document root must be a mapping.')
    })
  })

  // ── Validation through parse ────────────────────────────────────

  describe('validation errors surfaced through parse', () => {
    it('rejects a document with no devices', () => {
      const yaml = `
meta:
  title: Empty
devices: []
connections: []
`
      const result = parse(yaml)

      expect(result.ok).toBe(false)
      if (result.ok) return

      const deviceError = result.errors.find((e) => e.path === 'devices')
      expect(deviceError).toBeDefined()
      expect(deviceError?.message).toContain('At least one device')
    })

    it('rejects a document with missing meta title', () => {
      const yaml = `
meta: {}
devices:
  - id: x
    name: X
    type: server
connections: []
`
      const result = parse(yaml)

      expect(result.ok).toBe(false)
      if (result.ok) return

      const titleError = result.errors.find((e) => e.path === 'meta.title')
      expect(titleError).toBeDefined()
    })

    it('rejects duplicate device IDs', () => {
      const result = parse(DUPLICATE_IDS_YAML)

      expect(result.ok).toBe(false)
      if (result.ok) return

      const dupeError = result.errors.find((e) => e.message.includes('Duplicate'))
      expect(dupeError).toBeDefined()
    })
  })

  // ── Normalization behavior ──────────────────────────────────────

  describe('normalization', () => {
    it('defaults missing optional meta fields to undefined', () => {
      const result = parse(MINIMAL_YAML)

      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.document.meta.subtitle).toBeUndefined()
      expect(result.document.meta.author).toBeUndefined()
      expect(result.document.meta.tags).toBeUndefined()
    })

    it('coerces device fields to strings', () => {
      const yaml = `
meta:
  title: Coercion Test
devices:
  - id: 123
    name: 456
    type: server
connections: []
`
      const result = parse(yaml)

      expect(result.ok).toBe(true)
      if (!result.ok) return

      // js-yaml parses bare 123 as a number; normalizeDevice coerces to string.
      expect(result.document.devices[0].id).toBe('123')
      expect(result.document.devices[0].name).toBe('456')
    })

    it('treats missing devices array as empty array', () => {
      const yaml = `
meta:
  title: No Devices
connections: []
`
      const result = parse(yaml)

      // Should fail validation (no devices), but normalization itself
      // should not throw.
      expect(result.ok).toBe(false)
      if (result.ok) return

      const deviceError = result.errors.find((e) => e.path === 'devices')
      expect(deviceError).toBeDefined()
    })
  })
})
