import { describe, it, expect } from 'vitest'
import { buildDoc, buildDevice, buildConnection } from './fixtures'
import { validate } from '../src/validator'
import type { HomelabDocument, ValidationError } from '../src/types'

const errors = (list: ValidationError[]) => list.filter((e) => e.severity === 'error')

const warnings = (list: ValidationError[]) => list.filter((e) => e.severity === 'warning')

// ─── Meta validation ──────────────────────────────────────────────

describe('validate › meta', () => {
  it('returns an error when meta is missing entirely', () => {
    const doc = buildDoc() as unknown as Record<string, unknown>
    delete doc.meta

    const result = validate(doc as unknown as HomelabDocument)

    expect(errors(result)).toHaveLength(1)
    expect(result[0].path).toBe('meta')
    expect(result[0].severity).toBe('error')
  })

  it('returns an error when meta.title is missing', () => {
    const doc = buildDoc({ meta: {} as HomelabDocument['meta'] })

    const result = validate(doc)

    const titleErrors = errors(result).filter((e) => e.path === 'meta.title')
    expect(titleErrors).toHaveLength(1)
  })

  it('returns an error when meta.title is an empty string', () => {
    const doc = buildDoc({ meta: { title: '' } })

    const result = validate(doc)

    const titleErrors = errors(result).filter((e) => e.path === 'meta.title')
    expect(titleErrors).toHaveLength(1)
  })

  it('passes when meta and title are valid', () => {
    const doc = buildDoc({ meta: { title: 'My Lab' } })

    const result = validate(doc)

    const metaErrors = errors(result).filter((e) => e.path.startsWith('meta'))
    expect(metaErrors).toHaveLength(0)
  })
})

// ─── Device validation ────────────────────────────────────────────

describe('validate › devices', () => {
  it('returns an error when devices array is empty', () => {
    const doc = buildDoc({ devices: [] })

    const result = validate(doc)

    const deviceErrors = errors(result).filter((e) => e.path === 'devices')
    expect(deviceErrors).toHaveLength(1)
    expect(deviceErrors[0].message).toContain('At least one device')
  })

  it('returns an error when devices is not an array', () => {
    const doc = buildDoc({
      devices: 'not-an-array' as unknown as HomelabDocument['devices'],
    })

    const result = validate(doc)

    const deviceErrors = errors(result).filter((e) => e.path === 'devices')
    expect(deviceErrors).toHaveLength(1)
  })

  it('returns an error when a device is missing an id', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: '' })],
    })

    const result = validate(doc)

    const idErrors = errors(result).filter((e) => e.path.includes('.id'))
    expect(idErrors).toHaveLength(1)
  })

  it('returns an error when a device is missing a name', () => {
    const doc = buildDoc({
      devices: [buildDevice({ name: '' })],
    })

    const result = validate(doc)

    const nameErrors = errors(result).filter((e) => e.path.includes('.name'))
    expect(nameErrors).toHaveLength(1)
  })

  it('returns a warning (not error) when a device is missing a type', () => {
    const doc = buildDoc({
      devices: [buildDevice({ type: '' })],
    })

    const result = validate(doc)

    const typeWarnings = warnings(result).filter((e) => e.path.includes('.type'))
    expect(typeWarnings).toHaveLength(1)

    const typeErrors = errors(result).filter((e) => e.path.includes('.type'))
    expect(typeErrors).toHaveLength(0)
  })

  it('returns an error for duplicate device IDs', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'dup', name: 'First' }),
        buildDevice({ id: 'dup', name: 'Second' }),
      ],
    })

    const result = validate(doc)

    const dupeErrors = errors(result).filter((e) => e.message.includes('Duplicate'))
    expect(dupeErrors).toHaveLength(1)
  })

  it('detects duplicate IDs across parent and child', () => {
    const doc = buildDoc({
      devices: [
        {
          id: 'shared-id',
          name: 'Parent',
          type: 'hypervisor',
          children: [{ id: 'shared-id', name: 'Child', type: 'vm' }],
        },
      ],
    })

    const result = validate(doc)

    const dupeErrors = errors(result).filter((e) => e.message.includes('Duplicate'))
    expect(dupeErrors).toHaveLength(1)
  })

  it('passes when all devices are valid', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a', name: 'A' }), buildDevice({ id: 'b', name: 'B' })],
    })

    const result = validate(doc)

    const deviceErrors = errors(result).filter((e) => e.path.startsWith('devices'))
    expect(deviceErrors).toHaveLength(0)
  })
})

// ─── Connection validation ────────────────────────────────────────

describe('validate › connections', () => {
  it("returns an error when a connection is missing 'from'", () => {
    const doc = buildDoc({
      connections: [buildConnection({ from: '' })],
    })

    const result = validate(doc)

    const fromErrors = errors(result).filter((e) => e.path.includes('.from'))
    expect(fromErrors).toHaveLength(1)
  })

  it("returns an error when a connection is missing 'to'", () => {
    const doc = buildDoc({
      connections: [buildConnection({ to: '' })],
    })

    const result = validate(doc)

    const toErrors = errors(result).filter((e) => e.path.includes('.to'))
    expect(toErrors).toHaveLength(1)
  })

  it('returns an error when connections is not an array', () => {
    const doc = buildDoc({
      connections: 'oops' as unknown as HomelabDocument['connections'],
    })

    const result = validate(doc)

    const connErrors = errors(result).filter((e) => e.path === 'connections')
    expect(connErrors).toHaveLength(1)
    expect(connErrors[0].message).toContain('must be an array')
  })

  it('passes when connections are valid', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a', name: 'A' }), buildDevice({ id: 'b', name: 'B' })],
      connections: [buildConnection({ from: 'a', to: 'b' })],
    })

    const result = validate(doc)

    const connErrors = errors(result).filter((e) => e.path.startsWith('connections'))
    expect(connErrors).toHaveLength(0)
  })

  it('accepts undefined connections without error', () => {
    const doc = buildDoc()
    ;(doc as unknown as Record<string, unknown>).connections = undefined

    const result = validate(doc as HomelabDocument)

    const connErrors = errors(result).filter((e) => e.path.startsWith('connections'))
    expect(connErrors).toHaveLength(0)
  })
})

// ─── Reference validation ─────────────────────────────────────────

describe('validate › references', () => {
  it("returns an error when connection 'from' references a non-existent device", () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'real' })],
      connections: [buildConnection({ from: 'ghost', to: 'real' })],
    })

    const result = validate(doc)

    const refErrors = errors(result).filter((e) => e.message.includes('ghost'))
    expect(refErrors).toHaveLength(1)
    expect(refErrors[0].severity).toBe('error')
  })

  it("returns an error when connection 'to' references a non-existent device", () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'real' })],
      connections: [buildConnection({ from: 'real', to: 'phantom' })],
    })

    const result = validate(doc)

    const refErrors = errors(result).filter((e) => e.message.includes('phantom'))
    expect(refErrors).toHaveLength(1)
    expect(refErrors[0].severity).toBe('error')
  })

  it('allows connections referencing child device IDs', () => {
    const doc = buildDoc({
      devices: [
        {
          id: 'parent',
          name: 'Parent',
          type: 'hypervisor',
          children: [{ id: 'child-vm', name: 'Child', type: 'vm' }],
        },
        buildDevice({ id: 'switch', name: 'Switch', type: 'switch' }),
      ],
      connections: [buildConnection({ from: 'child-vm', to: 'switch' })],
    })

    const result = validate(doc)

    const refErrors = errors(result).filter((e) => e.path.startsWith('connections'))
    expect(refErrors).toHaveLength(0)
  })

  it('returns a warning when a device references an undefined network', () => {
    const doc = buildDoc({
      networks: [{ id: 'lan', name: 'LAN' }],
      devices: [buildDevice({ id: 'srv', network: 'nonexistent' })],
    })

    const result = validate(doc)

    const netWarnings = warnings(result).filter((e) => e.path.includes('.network'))
    expect(netWarnings).toHaveLength(1)
    expect(netWarnings[0].message).toContain('nonexistent')
  })

  it('returns a warning when a device references an undefined group', () => {
    const doc = buildDoc({
      groups: [{ id: 'rack', name: 'Rack' }],
      devices: [buildDevice({ id: 'srv', group: 'no-such-group' })],
    })

    const result = validate(doc)

    const grpWarnings = warnings(result).filter((e) => e.path.includes('.group'))
    expect(grpWarnings).toHaveLength(1)
    expect(grpWarnings[0].message).toContain('no-such-group')
  })

  it('passes when all references are valid', () => {
    const doc = buildDoc({
      networks: [{ id: 'lan', name: 'LAN' }],
      groups: [{ id: 'rack', name: 'Rack' }],
      devices: [
        buildDevice({ id: 'a', name: 'A', network: 'lan', group: 'rack' }),
        buildDevice({ id: 'b', name: 'B' }),
      ],
      connections: [buildConnection({ from: 'a', to: 'b' })],
    })

    const result = validate(doc)

    expect(errors(result)).toHaveLength(0)
    expect(warnings(result)).toHaveLength(0)
  })

  it('only checks top-level devices for network/group refs, not children', () => {
    const doc = buildDoc({
      devices: [
        {
          id: 'parent',
          name: 'Parent',
          type: 'hypervisor',
          children: [
            {
              id: 'child',
              name: 'Child',
              type: 'vm',
              network: 'fake-net',
              group: 'fake-group',
            },
          ],
        },
      ],
    })

    const result = validate(doc)

    // Children's network/group refs are NOT checked, so no warning expected.
    const refWarnings = warnings(result).filter(
      (e) => e.path.includes('.network') || e.path.includes('.group'),
    )
    expect(refWarnings).toHaveLength(0)
  })
})
