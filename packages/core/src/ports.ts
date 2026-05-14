import type { Device, Connection, InterfaceGroup } from './types'

interface PortAssignment {
  deviceId: string
  interfaceType: 'ethernet' | 'wifi' | 'sfp'
  portIndex: number
  connectedTo: string
  speed?: string
  label?: string
}

interface PortLayout {
  x: number
  active: boolean
  connectedTo?: string
  speed?: string
}

interface EnumeratedPort {
  interfaceType: EnumerableInterfaceType
  index: number
  label?: string
  speed?: string
}

type EnumerableInterfaceType = 'ethernet' | 'sfp' | 'usb' | 'thunderbolt' | 'wifi'

/** Width of a single port icon + gap */
const PORT_WIDTH = 18
const PORT_GAP = 4
const PORT_STRIP_PADDING = 12

/** Port dimensions exported for the renderer */
const PORT_DIMENSIONS = {
  width: PORT_WIDTH,
  gap: PORT_GAP,
  padding: PORT_STRIP_PADDING,
} as const

/**
 * Computes which port on each device each connection uses.
 * Ethernet/SFP connections consume physical ports in order.
 * WiFi connections don't consume ports but are tracked for the client count.
 */
function assignPorts(devices: Device[], connections: Connection[]): Map<string, PortAssignment[]> {
  const assignments = new Map<string, PortAssignment[]>()

  // Track port usage per device
  const portCounters = new Map<string, Map<string, number>>()

  // Pre-compute label lookups per device so each assignment can pick up
  // the user-declared label (if any) without re-walking interfaces.
  // Key: `${interfaceType}:${portIndex}` → label.
  const labelLookups = new Map<string, Map<string, string>>()

  for (const device of devices) {
    assignments.set(device.id, [])
    portCounters.set(device.id, new Map())
    labelLookups.set(device.id, buildLabelLookup(device))
  }

  for (const conn of connections) {
    const connType = conn.type ?? 'ethernet'
    const isWifi = connType === 'wifi'
    const ifaceType = isWifi
      ? 'wifi'
      : connType === 'fiber' || connType === 'sfp'
        ? 'sfp'
        : 'ethernet'

    // Assign port on the 'from' device
    assignPort(conn.from, conn.to, ifaceType, conn.speed, assignments, portCounters, labelLookups)

    // Assign port on the 'to' device (bidirectional by default)
    if (conn.direction !== 'one-way') {
      assignPort(conn.to, conn.from, ifaceType, conn.speed, assignments, portCounters, labelLookups)
    }
  }

  return assignments
}

function assignPort(
  deviceId: string,
  connectedTo: string,
  ifaceType: string,
  speed: string | undefined,
  assignments: Map<string, PortAssignment[]>,
  portCounters: Map<string, Map<string, number>>,
  labelLookups: Map<string, Map<string, string>>,
): void {
  const deviceAssignments = assignments.get(deviceId)
  const counters = portCounters.get(deviceId)
  if (!deviceAssignments || !counters) return

  const currentIndex = counters.get(ifaceType) ?? 0
  counters.set(ifaceType, currentIndex + 1)

  const assignment: PortAssignment = {
    deviceId,
    interfaceType: ifaceType as 'ethernet' | 'wifi' | 'sfp',
    portIndex: currentIndex,
    connectedTo,
    speed,
  }

  const label = labelLookups.get(deviceId)?.get(`${ifaceType}:${currentIndex}`)
  if (label !== undefined) assignment.label = label

  deviceAssignments.push(assignment)
}

function appendGroupPorts(
  out: EnumeratedPort[],
  type: Exclude<EnumerableInterfaceType, 'wifi'>,
  group: InterfaceGroup,
): void {
  for (let i = 0; i < group.count; i++) {
    const portDecl = group.ports?.[i]
    const port: EnumeratedPort = {
      interfaceType: type,
      index: i,
    }
    if (portDecl?.label !== undefined) port.label = portDecl.label

    const speed = portDecl?.speed ?? group.speed
    if (speed !== undefined) port.speed = speed

    out.push(port)
  }
}

/**
 * Enumerates every physical/logical port on a device in render order:
 * ethernet → sfp → usb → thunderbolt → wifi, ascending by index within
 * each group.
 *
 * WiFi is included for enumeration consistency even though it doesn't
 * occupy a socket; downstream consumers (e.g. PortStrip) decide how to
 * paint it.
 */
function enumeratePorts(device: Device): EnumeratedPort[] {
  const result: EnumeratedPort[] = []

  const ifaces = device.interfaces
  if (!ifaces) return result

  const socketTypes = ['ethernet', 'sfp', 'usb', 'thunderbolt'] as const
  for (const type of socketTypes) {
    const group = ifaces[type]
    if (!group) continue
    appendGroupPorts(result, type, group)
  }

  // WiFi: a single conceptual "port" if the interface exists.
  // No count to enumerate against — it's binary presence.
  if (ifaces.wifi) {
    result.push({ interfaceType: 'wifi', index: 0 })
  }

  return result
}

/**
 * Builds a `${type}:${index} → label` map for a device from its
 * enumerated ports. Anonymous ports are omitted (no label).
 */
function buildLabelLookup(device: Device): Map<string, string> {
  const map = new Map<string, string>()

  for (const port of enumeratePorts(device)) {
    if (port.label === undefined) continue
    map.set(`${port.interfaceType as EnumerableInterfaceType}:${port.index}`, port.label)
  }

  return map
}

/**
 * Computes the X position of a specific ethernet/SFP port relative to the card's left edge.
 * Used by both the layout engine (for edge routing) and the renderer (for port strip positioning).
 */
function getPortX(portIndex: number, _totalPorts: number, _cardWidth: number): number {
  const startX = PORT_STRIP_PADDING
  return startX + portIndex * (PORT_WIDTH + PORT_GAP) + PORT_WIDTH / 2
}

/**
 * Returns the Y offset of the port strip from the top of the card.
 * This must match the renderer's positioning.
 */
function getPortStripY(cardHeight: number): number {
  return cardHeight - 10
}

/**
 * Looks up the `InterfaceGroup` on a device for a given assignment's
 * interface type. Returns `undefined` for `'wifi'` (which maps to
 * `WifiInterface`, not an `InterfaceGroup`) and for any device that
 * doesn't declare that interface type.
 *
 * Used by the layout engine to read `count` when computing per-port
 * coordinates. Encapsulating the lookup here keeps the value-type
 * narrowing (InterfaceGroup vs WifiInterface) honest at call sites,
 * which previously relied on a `'count' in iface` runtime guard
 * paired with a cast that lied about value shape.
 */
function getInterfaceGroup(
  device: Device,
  type: PortAssignment['interfaceType'],
): InterfaceGroup | undefined {
  const ifaces = device.interfaces

  if (!ifaces) return undefined
  if (type === 'wifi') return undefined

  return ifaces[type]
}

export {
  PORT_DIMENSIONS,
  EnumerableInterfaceType,
  EnumeratedPort,
  PortAssignment,
  PortLayout,
  assignPorts,
  enumeratePorts,
  getPortX,
  getPortStripY,
  getInterfaceGroup,
}
