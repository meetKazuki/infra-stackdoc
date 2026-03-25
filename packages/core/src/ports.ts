import type { Device, Connection } from './types'

export interface PortAssignment {
  deviceId: string
  interfaceType: 'ethernet' | 'wifi' | 'sfp'
  portIndex: number
  connectedTo: string
  speed?: string
}

export interface PortLayout {
  /** X offset from the left edge of the card to the center of this port */
  x: number
  /** Whether this port is connected */
  active: boolean
  /** What device this port connects to */
  connectedTo?: string
  /** Connection speed */
  speed?: string
}

/** Width of a single port icon + gap */
const PORT_WIDTH = 18
const PORT_GAP = 4
const PORT_STRIP_PADDING = 12

/**
 * Computes which port on each device each connection uses.
 * Ethernet/SFP connections consume physical ports in order.
 * WiFi connections don't consume ports but are tracked for the client count.
 */
export function assignPorts(
  devices: Device[],
  connections: Connection[],
): Map<string, PortAssignment[]> {
  const assignments = new Map<string, PortAssignment[]>()

  // Track port usage per device
  const portCounters = new Map<string, Map<string, number>>()

  for (const device of devices) {
    assignments.set(device.id, [])
    portCounters.set(device.id, new Map())
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
    assignPort(conn.from, conn.to, ifaceType, conn.speed, assignments, portCounters)

    // Assign port on the 'to' device (bidirectional by default)
    if (conn.direction !== 'one-way') {
      assignPort(conn.to, conn.from, ifaceType, conn.speed, assignments, portCounters)
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
): void {
  const deviceAssignments = assignments.get(deviceId)
  const counters = portCounters.get(deviceId)
  if (!deviceAssignments || !counters) return

  const currentIndex = counters.get(ifaceType) ?? 0
  counters.set(ifaceType, currentIndex + 1)

  deviceAssignments.push({
    deviceId,
    interfaceType: ifaceType as 'ethernet' | 'wifi' | 'sfp',
    portIndex: currentIndex,
    connectedTo,
    speed,
  })
}

/**
 * Computes the X position of a specific ethernet/SFP port relative to the card's left edge.
 * Used by both the layout engine (for edge routing) and the renderer (for port strip positioning).
 */
export function getPortX(portIndex: number, _totalPorts: number, _cardWidth: number): number {
  const startX = PORT_STRIP_PADDING
  return startX + portIndex * (PORT_WIDTH + PORT_GAP) + PORT_WIDTH / 2
}

/**
 * Returns the Y offset of the port strip from the top of the card.
 * This must match the renderer's positioning.
 */
export function getPortStripY(cardHeight: number): number {
  // Port strip sits near the bottom, above the children row
  return cardHeight - 10
}

/** Port dimensions exported for the renderer */
export const PORT_DIMENSIONS = {
  width: PORT_WIDTH,
  gap: PORT_GAP,
  padding: PORT_STRIP_PADDING,
} as const
