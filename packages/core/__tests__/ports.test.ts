import { describe, it, expect } from 'vitest'
import { buildDevice, buildConnection, buildDeviceWithLabelledPorts } from './fixtures'
import { enumeratePorts } from '../src/ports'
import { assignPorts, getInterfaceGroup } from '../src/ports'

// ─── Enumeration ──────────────────────────────────────────────────

describe('enumeratePorts', () => {
  it('returns an empty list for a device with no interfaces', () => {
    const device = buildDevice({ id: 'bare' })

    expect(enumeratePorts(device)).toEqual([])
  })

  it('enumerates unlabelled ethernet ports in index order', () => {
    const device = buildDevice({
      id: 'sw',
      interfaces: { ethernet: { count: 4 } },
    })

    const ports = enumeratePorts(device)

    expect(ports).toHaveLength(4)
    expect(ports.map((p) => p.index)).toEqual([0, 1, 2, 3])
    expect(ports.every((p) => p.interfaceType === 'ethernet')).toBe(true)
    expect(ports.every((p) => p.label === undefined)).toBe(true)
  })

  it('emits ports in the order ethernet → sfp → usb → thunderbolt → wifi', () => {
    const device = buildDevice({
      id: 'multi',
      interfaces: {
        wifi: { standard: 'wifi-7' },
        thunderbolt: { count: 1 },
        usb: { count: 2 },
        sfp: { count: 1 },
        ethernet: { count: 1 },
      },
    })

    const types = enumeratePorts(device).map((p) => p.interfaceType)

    expect(types).toEqual(['ethernet', 'sfp', 'usb', 'usb', 'thunderbolt', 'wifi'])
  })

  it('carries labels when declared', () => {
    const ports = enumeratePorts(buildDeviceWithLabelledPorts())

    const eth = ports.filter((p) => p.interfaceType === 'ethernet')
    expect(eth.map((p) => p.label)).toEqual(['WAN', 'LAN1', 'LAN2', 'LAN3', 'LAN4'])
  })

  it('handles partial labelling — first N have labels, rest are anonymous', () => {
    const device = buildDevice({
      id: 'sw',
      interfaces: {
        ethernet: {
          count: 5,
          ports: [{ label: 'WAN' }, { label: 'LAN1' }],
        },
      },
    })

    const ports = enumeratePorts(device)

    expect(ports).toHaveLength(5)
    expect(ports[0].label).toBe('WAN')
    expect(ports[1].label).toBe('LAN1')
    expect(ports[2].label).toBeUndefined()
    expect(ports[3].label).toBeUndefined()
    expect(ports[4].label).toBeUndefined()
  })

  it('applies per-port speed override (per-port wins over group speed)', () => {
    const device = buildDevice({
      id: 'sw',
      interfaces: {
        sfp: {
          count: 2,
          speed: '1G', // group default
          ports: [
            { label: 'SFP+ 1', speed: '10G' }, // override
            { label: 'SFP+ 2' }, // falls through to group speed
          ],
        },
      },
    })

    const ports = enumeratePorts(device)

    expect(ports[0].speed).toBe('10G')
    expect(ports[1].speed).toBe('1G')
  })

  it('does not include a speed when neither port nor group declares one', () => {
    const device = buildDevice({
      id: 'sw',
      interfaces: { ethernet: { count: 1 } },
    })

    expect(enumeratePorts(device)[0].speed).toBeUndefined()
  })

  it('includes a single wifi entry at the end when wifi is present', () => {
    const device = buildDevice({
      id: 'ap',
      interfaces: {
        ethernet: { count: 1 },
        wifi: { bands: ['2.4', '5'] },
      },
    })

    const ports = enumeratePorts(device)

    expect(ports).toHaveLength(2)
    expect(ports[1]).toEqual({ interfaceType: 'wifi', index: 0 })
  })
})

// ─── Assignment carries labels ────────────────────────────────────

describe('assignPorts › label propagation', () => {
  it('attaches the label to an assignment when the consumed port is labelled', () => {
    const device = buildDeviceWithLabelledPorts()
    const peer = buildDevice({ id: 'peer', interfaces: { ethernet: { count: 1 } } })
    const conn = buildConnection({ from: device.id, to: peer.id, type: 'ethernet' })

    const assignments = assignPorts([device, peer], [conn])

    const routerSide = assignments.get(device.id)!
    expect(routerSide).toHaveLength(1)
    expect(routerSide[0].label).toBe('WAN') // first ethernet port = WAN
    expect(routerSide[0].portIndex).toBe(0)
  })

  it('omits label on an anonymous port even when the device has some labelled ports', () => {
    const device = buildDevice({
      id: 'router',
      interfaces: {
        ethernet: {
          count: 3,
          ports: [{ label: 'WAN' }], // only port 0 labelled
        },
      },
    })
    const a = buildDevice({ id: 'a', interfaces: { ethernet: { count: 1 } } })
    const b = buildDevice({ id: 'b', interfaces: { ethernet: { count: 1 } } })

    const assignments = assignPorts(
      [device, a, b],
      [
        buildConnection({ from: device.id, to: a.id }),
        buildConnection({ from: device.id, to: b.id }),
      ],
    )

    const routerSide = assignments.get(device.id)!
    expect(routerSide).toHaveLength(2)
    expect(routerSide[0].label).toBe('WAN') // index 0
    expect(routerSide[1].label).toBeUndefined() // index 1 = anonymous
  })

  it('does not attach a label when the device has no ports[] declarations', () => {
    const device = buildDevice({ id: 'plain', interfaces: { ethernet: { count: 2 } } })
    const peer = buildDevice({ id: 'peer', interfaces: { ethernet: { count: 1 } } })

    const assignments = assignPorts(
      [device, peer],
      [buildConnection({ from: device.id, to: peer.id })],
    )

    expect(assignments.get(device.id)![0].label).toBeUndefined()
  })
})

// ─── Typed interface-group lookup ─────────────────────────────────

describe('getInterfaceGroup', () => {
  it('returns the matching InterfaceGroup for ethernet/sfp', () => {
    const device = buildDevice({
      id: 'sw',
      interfaces: {
        ethernet: { count: 4, speed: '1G' },
        sfp: { count: 2 },
      },
    })

    expect(getInterfaceGroup(device, 'ethernet')).toEqual({ count: 4, speed: '1G' })
    expect(getInterfaceGroup(device, 'sfp')).toEqual({ count: 2 })
  })

  it('returns undefined for wifi (which is WifiInterface, not InterfaceGroup)', () => {
    const device = buildDevice({
      id: 'ap',
      interfaces: { wifi: { bands: ['5'] } },
    })

    expect(getInterfaceGroup(device, 'wifi')).toBeUndefined()
  })

  it('returns undefined for a device that does not declare the interface', () => {
    const device = buildDevice({
      id: 'plain',
      interfaces: { ethernet: { count: 1 } },
    })

    expect(getInterfaceGroup(device, 'sfp')).toBeUndefined()
  })

  it('returns undefined for a device with no interfaces at all', () => {
    const device = buildDevice({ id: 'bare' })

    expect(getInterfaceGroup(device, 'ethernet')).toBeUndefined()
  })
})
