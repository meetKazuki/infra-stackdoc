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

// ─── Group parent validation (Phase 2a: subgroups) ────────────────

describe('validate › group parent', () => {
  it('accepts a valid parent reference', () => {
    const doc = buildDoc({
      groups: [
        { id: 'outer', name: 'Outer' },
        { id: 'inner', name: 'Inner', parent: 'outer' },
      ],
    })

    const result = validate(doc)

    const groupErrors = errors(result).filter((e) => e.path.startsWith('groups'))
    expect(groupErrors).toHaveLength(0)
  })

  it('returns an error when parent references an unknown group', () => {
    const doc = buildDoc({
      groups: [{ id: 'inner', name: 'Inner', parent: 'ghost' }],
    })

    const result = validate(doc)

    const parentErrors = errors(result).filter((e) => e.path === 'groups[0].parent')
    expect(parentErrors).toHaveLength(1)
    expect(parentErrors[0].message).toContain('ghost')
  })

  it('returns an error on self-reference', () => {
    const doc = buildDoc({
      groups: [{ id: 'loop', name: 'Loop', parent: 'loop' }],
    })

    const result = validate(doc)

    const selfErrors = errors(result).filter((e) => e.path === 'groups[0].parent')
    expect(selfErrors).toHaveLength(1)
    expect(selfErrors[0].message).toContain('own parent')
  })

  it('returns an error on a two-group cycle (a → b → a)', () => {
    const doc = buildDoc({
      groups: [
        { id: 'a', name: 'A', parent: 'b' },
        { id: 'b', name: 'B', parent: 'a' },
      ],
    })

    const result = validate(doc)

    const cycleErrors = errors(result).filter(
      (e) => e.path.startsWith('groups') && e.message.includes('cycle'),
    )
    expect(cycleErrors).toHaveLength(1)
  })

  it('returns an error on a three-group cycle (a → b → c → a)', () => {
    const doc = buildDoc({
      groups: [
        { id: 'a', name: 'A', parent: 'b' },
        { id: 'b', name: 'B', parent: 'c' },
        { id: 'c', name: 'C', parent: 'a' },
      ],
    })

    const result = validate(doc)

    const cycleErrors = errors(result).filter(
      (e) => e.path.startsWith('groups') && e.message.includes('cycle'),
    )
    expect(cycleErrors).toHaveLength(1)
  })

  it('accepts nesting deeper than 3 levels (no depth cap per § 8.1)', () => {
    const doc = buildDoc({
      groups: [
        { id: 'l0', name: 'L0' },
        { id: 'l1', name: 'L1', parent: 'l0' },
        { id: 'l2', name: 'L2', parent: 'l1' },
        { id: 'l3', name: 'L3', parent: 'l2' },
        { id: 'l4', name: 'L4', parent: 'l3' },
      ],
    })

    const result = validate(doc)

    const groupErrors = errors(result).filter((e) => e.path.startsWith('groups'))
    expect(groupErrors).toHaveLength(0)
  })

  it('does not error when groups is empty or absent', () => {
    const doc1 = buildDoc()
    const doc2 = buildDoc({ groups: [] })

    expect(errors(validate(doc1)).filter((e) => e.path.startsWith('groups'))).toHaveLength(0)
    expect(errors(validate(doc2)).filter((e) => e.path.startsWith('groups'))).toHaveLength(0)
  })
})

// ─── Port label validation (Phase 2b: labelled ports) ─────────────

describe('validate › port labels', () => {
  it('accepts a device with no ports[] array (backwards compat)', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({
          id: 'sw',
          interfaces: { ethernet: { count: 4 } },
        }),
      ],
    })

    const portErrors = errors(validate(doc)).filter((e) => e.path.includes('.ports'))
    expect(portErrors).toHaveLength(0)
  })

  it('accepts a device where ports.length === count', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({
          id: 'sw',
          interfaces: {
            ethernet: {
              count: 2,
              ports: [{ label: 'WAN' }, { label: 'LAN1' }],
            },
          },
        }),
      ],
    })

    const portErrors = errors(validate(doc)).filter((e) => e.path.includes('.ports'))
    expect(portErrors).toHaveLength(0)
  })

  it('accepts partial labelling (ports.length < count)', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({
          id: 'sw',
          interfaces: {
            ethernet: {
              count: 5,
              ports: [{ label: 'WAN' }], // only first port labelled
            },
          },
        }),
      ],
    })

    const portErrors = errors(validate(doc)).filter((e) => e.path.includes('.ports'))
    expect(portErrors).toHaveLength(0)
  })

  it('returns an error for an empty port label at the correct path', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({
          id: 'sw',
          interfaces: {
            ethernet: {
              count: 2,
              ports: [{ label: 'WAN' }, { label: '' }],
            },
          },
        }),
      ],
    })

    const emptyErrors = errors(validate(doc)).filter((e) => e.message.includes('non-empty'))
    expect(emptyErrors).toHaveLength(1)
    expect(emptyErrors[0].path).toBe('devices[0].interfaces.ethernet.ports[1].label')
  })

  it('returns an error for duplicate labels within the same interface group', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({
          id: 'sw',
          interfaces: {
            ethernet: {
              count: 2,
              ports: [{ label: 'LAN' }, { label: 'LAN' }],
            },
          },
        }),
      ],
    })

    const dupErrors = errors(validate(doc)).filter((e) =>
      e.message.includes('Duplicate port label'),
    )
    expect(dupErrors).toHaveLength(1)
    expect(dupErrors[0].path).toBe('devices[0].interfaces.ethernet.ports[1].label')
  })

  it('allows the same label across different interface groups', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({
          id: 'sw',
          interfaces: {
            ethernet: { count: 1, ports: [{ label: 'WAN' }] },
            sfp: { count: 1, ports: [{ label: 'WAN' }] },
          },
        }),
      ],
    })

    const portErrors = errors(validate(doc)).filter((e) => e.path.includes('.ports'))
    expect(portErrors).toHaveLength(0)
  })

  it('returns an error when ports.length > count', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({
          id: 'sw',
          interfaces: {
            ethernet: {
              count: 1,
              ports: [{ label: 'WAN' }, { label: 'LAN1' }],
            },
          },
        }),
      ],
    })

    const overErrors = errors(validate(doc)).filter((e) =>
      e.message.includes('declares 2 labels but count is 1'),
    )
    expect(overErrors).toHaveLength(1)
    expect(overErrors[0].path).toBe('devices[0].interfaces.ethernet.ports')
  })

  it('accepts count: 0 with empty ports array', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({
          id: 'sw',
          interfaces: { ethernet: { count: 0, ports: [] } },
        }),
      ],
    })

    const portErrors = errors(validate(doc)).filter((e) => e.path.includes('.ports'))
    expect(portErrors).toHaveLength(0)
  })

  it('returns an error for count: 0 with non-empty ports', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({
          id: 'sw',
          interfaces: { ethernet: { count: 0, ports: [{ label: 'WAN' }] } },
        }),
      ],
    })

    const overErrors = errors(validate(doc)).filter((e) =>
      e.message.includes('declares 1 labels but count is 0'),
    )
    expect(overErrors).toHaveLength(1)
  })

  it('validates ports on nested child devices too', () => {
    const doc = buildDoc({
      devices: [
        {
          id: 'host',
          name: 'Host',
          type: 'hypervisor',
          children: [
            {
              id: 'vm',
              name: 'VM',
              type: 'vm',
              interfaces: {
                ethernet: { count: 1, ports: [{ label: '' }] },
              },
            },
          ],
        },
      ],
    })

    const emptyErrors = errors(validate(doc)).filter((e) => e.message.includes('non-empty'))
    expect(emptyErrors).toHaveLength(1)
    expect(emptyErrors[0].path).toBe('devices[0].children[0].interfaces.ethernet.ports[0].label')
  })
})
