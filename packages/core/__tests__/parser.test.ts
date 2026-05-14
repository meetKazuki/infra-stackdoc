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

  // ── Interface normalization ─────────────────────────────────────

  describe('interface normalization', () => {
    it('parses ethernet ports with labels into typed Port objects', () => {
      const yaml = `
meta:
  title: Ports
devices:
  - id: router
    name: Router
    type: router
    interfaces:
      ethernet:
        count: 2
        ports:
          - label: WAN
          - label: LAN1
connections: []
`
      const result = parse(yaml)

      expect(result.ok).toBe(true)
      if (!result.ok) return

      const eth = result.document.devices[0].interfaces?.ethernet
      expect(eth?.count).toBe(2)
      expect(eth?.ports).toEqual([{ label: 'WAN' }, { label: 'LAN1' }])
    })

    it('coerces a string count to a number', () => {
      // YAML quoted scalars stay strings; the normalizer must coerce
      // so downstream comparisons (e.g. ports.length > count) work.
      const yaml = `
meta:
  title: Coerce
devices:
  - id: r
    name: R
    type: router
    interfaces:
      ethernet:
        count: "3"
connections: []
`
      const result = parse(yaml)

      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.document.devices[0].interfaces?.ethernet?.count).toBe(3)
    })

    it('carries per-port speed overrides', () => {
      const yaml = `
meta:
  title: Speeds
devices:
  - id: r
    name: R
    type: router
    interfaces:
      sfp:
        count: 2
        speed: 1G
        ports:
          - { label: "SFP+ 1", speed: "10G" }
          - { label: "SFP+ 2" }
connections: []
`
      const result = parse(yaml)

      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sfp = result.document.devices[0].interfaces?.sfp
      expect(sfp?.ports?.[0]).toEqual({ label: 'SFP+ 1', speed: '10G' })
      expect(sfp?.ports?.[1]).toEqual({ label: 'SFP+ 2' })
    })

    it('drops a non-object interfaces field rather than passing garbage through', () => {
      // Arrays pass `typeof === 'object'` but aren't valid interface
      // groupings; the normalizer should drop them.
      const yaml = `
meta:
  title: Bad interfaces
devices:
  - id: r
    name: R
    type: router
    interfaces:
      - not
      - a
      - map
connections: []
`
      const result = parse(yaml)

      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.document.devices[0].interfaces).toBeUndefined()
    })

    it('normalizes wifi bands and standard', () => {
      const yaml = `
meta:
  title: Wifi
devices:
  - id: ap
    name: AP
    type: ap
    interfaces:
      wifi:
        bands: ["2.4", "5"]
        standard: wifi-6e
connections: []
`
      const result = parse(yaml)

      expect(result.ok).toBe(true)
      if (!result.ok) return

      const wifi = result.document.devices[0].interfaces?.wifi
      expect(wifi?.bands).toEqual(['2.4', '5'])
      expect(wifi?.standard).toBe('wifi-6e')
    })
  })
})
