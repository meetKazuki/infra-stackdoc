import { findGroupCycle } from './groups'
import { resolvePortReference } from './ports'
import type { HomelabDocument, Device, Connection, ValidationError } from './types'

/**
 * Validates a parsed HomelabDocument for structural and referential integrity.
 * Returns an empty array when the document is valid.
 */
export function validate(doc: HomelabDocument): ValidationError[] {
  const errors: ValidationError[] = []

  validateMeta(doc, errors)
  validateDevices(doc, errors)
  validatePorts(doc, errors)
  validateConnections(doc, errors)
  validateGroups(doc, errors)
  validateReferences(doc, errors)
  validateConnectionPorts(doc, errors)

  return errors
}

// ─── Section validators ───────────────────────────────────────────

function validateMeta(doc: HomelabDocument, errors: ValidationError[]): void {
  if (!doc.meta) {
    errors.push({ path: 'meta', message: "Missing required 'meta' section.", severity: 'error' })
    return
  }
  if (!doc.meta.title || typeof doc.meta.title !== 'string') {
    errors.push({
      path: 'meta.title',
      message: 'meta.title is required and must be a string.',
      severity: 'error',
    })
  }
}

function validateDevices(doc: HomelabDocument, errors: ValidationError[]): void {
  if (!Array.isArray(doc.devices) || doc.devices.length === 0) {
    errors.push({ path: 'devices', message: 'At least one device is required.', severity: 'error' })
    return
  }

  const seenIds = new Set<string>()

  const walkDevices = (devices: Device[], parentPath: string) => {
    devices.forEach((device, i) => {
      const path = `${parentPath}[${i}]`

      if (!device.id) {
        errors.push({
          path: `${path}.id`,
          message: "Device is missing an 'id'.",
          severity: 'error',
        })
      } else if (seenIds.has(device.id)) {
        errors.push({
          path: `${path}.id`,
          message: `Duplicate device id '${device.id}'.`,
          severity: 'error',
        })
      } else {
        seenIds.add(device.id)
      }

      if (!device.name) {
        errors.push({
          path: `${path}.name`,
          message: "Device is missing a 'name'.",
          severity: 'error',
        })
      }
      if (!device.type) {
        errors.push({
          path: `${path}.type`,
          message: "Device is missing a 'type'.",
          severity: 'warning',
        })
      }

      if (device.children && Array.isArray(device.children)) {
        walkDevices(device.children, `${path}.children`)
      }
    })
  }

  walkDevices(doc.devices, 'devices')
}

/**
 * Validates per-port labels on every device's interface groups.
 *
 * Rules (see Phase 2b handoff):
 *  - Each declared port must have a non-empty `label`.
 *  - Labels must be unique within an interface group. The SAME label
 *    in DIFFERENT groups (e.g. ethernet.WAN and sfp.WAN) is allowed —
 *    those are physically distinct jacks.
 *  - `ports.length` must not exceed the group's `count`.
 */
function validatePorts(doc: HomelabDocument, errors: ValidationError[]): void {
  if (!Array.isArray(doc.devices)) return

  const walk = (devices: Device[], parentPath: string) => {
    devices.forEach((device, i) => {
      const path = `${parentPath}[${i}]`
      const ifaces = device.interfaces
      if (ifaces) {
        for (const type of ['ethernet', 'sfp', 'usb', 'thunderbolt'] as const) {
          const group = ifaces[type]
          if (!group) continue
          validatePortGroup(group, `${path}.interfaces.${type}`, errors)
        }
      }
      if (device.children && Array.isArray(device.children)) {
        walk(device.children, `${path}.children`)
      }
    })
  }

  walk(doc.devices, 'devices')
}

function validatePortGroup(
  group: { count: number; ports?: { label: string }[] },
  path: string,
  errors: ValidationError[],
): void {
  const ports = group.ports
  if (!ports || !Array.isArray(ports) || ports.length === 0) return

  if (ports.length > group.count) {
    errors.push({
      path: `${path}.ports`,
      message: `ports[] declares ${ports.length} labels but count is ${group.count}; reduce ports or raise count.`,
      severity: 'error',
    })
  }

  const seen = new Map<string, number>()
  ports.forEach((port, j) => {
    const label = port?.label
    if (typeof label !== 'string' || label === '') {
      errors.push({
        path: `${path}.ports[${j}].label`,
        message: 'Port label is required and must be a non-empty string.',
        severity: 'error',
      })
      return
    }
    const prior = seen.get(label)
    if (prior !== undefined) {
      errors.push({
        path: `${path}.ports[${j}].label`,
        message: `Duplicate port label '${label}' within this interface group (also at index ${prior}).`,
        severity: 'error',
      })
    } else {
      seen.set(label, j)
    }
  })
}

function validateConnections(doc: HomelabDocument, errors: ValidationError[]): void {
  if (!doc.connections) return
  if (!Array.isArray(doc.connections)) {
    errors.push({
      path: 'connections',
      message: "'connections' must be an array.",
      severity: 'error',
    })
    return
  }

  doc.connections.forEach((conn: Connection, i: number) => {
    const path = `connections[${i}]`
    if (!conn.from) {
      errors.push({
        path: `${path}.from`,
        message: "Connection is missing 'from'.",
        severity: 'error',
      })
    }
    if (!conn.to) {
      errors.push({ path: `${path}.to`, message: "Connection is missing 'to'.", severity: 'error' })
    }
  })
}

/** Group-tree integrity: unknown parents, self-references, cycles. */
function validateGroups(doc: HomelabDocument, errors: ValidationError[]): void {
  if (!Array.isArray(doc.groups) || doc.groups.length === 0) return

  const groupIds = new Set(doc.groups.map((g) => g.id))

  doc.groups.forEach((group, i) => {
    if (group.parent === undefined) return

    if (group.parent === group.id) {
      errors.push({
        path: `groups[${i}].parent`,
        message: `Group '${group.id}' cannot be its own parent.`,
        severity: 'error',
      })
      return
    }

    if (!groupIds.has(group.parent)) {
      errors.push({
        path: `groups[${i}].parent`,
        message: `Parent group '${group.parent}' is not defined.`,
        severity: 'error',
      })
    }
  })

  const cycleId = findGroupCycle(doc.groups)
  if (cycleId !== null) {
    const idx = doc.groups.findIndex((g) => g.id === cycleId)
    if (idx >= 0) {
      errors.push({
        path: `groups[${idx}].parent`,
        message: `Group '${cycleId}' is part of a parent cycle.`,
        severity: 'error',
      })
    }
  }
}

/** Cross-reference check: do connection endpoints point to real device ids? */
function validateReferences(doc: HomelabDocument, errors: ValidationError[]): void {
  const deviceIds = new Set<string>()

  const collectIds = (devices: Device[]) => {
    for (const d of devices) {
      if (d.id) deviceIds.add(d.id)
      if (d.children) collectIds(d.children)
    }
  }
  if (Array.isArray(doc.devices)) collectIds(doc.devices)

  const networkIds = new Set((doc.networks ?? []).map((n) => n.id))
  const groupIds = new Set((doc.groups ?? []).map((g) => g.id))
  const connections = Array.isArray(doc.connections) ? doc.connections : []
  const devices = Array.isArray(doc.devices) ? doc.devices : []

  connections.forEach((conn, i) => {
    if (conn.from && !deviceIds.has(conn.from)) {
      errors.push({
        path: `connections[${i}].from`,
        message: `'${conn.from}' does not match any device id.`,
        severity: 'error',
      })
    }
    if (conn.to && !deviceIds.has(conn.to)) {
      errors.push({
        path: `connections[${i}].to`,
        message: `'${conn.to}' does not match any device id.`,
        severity: 'error',
      })
    }
  })

  devices.forEach((device, i) => {
    if (device.network && !networkIds.has(device.network)) {
      errors.push({
        path: `devices[${i}].network`,
        message: `Network '${device.network}' is not defined in networks.`,
        severity: 'warning',
      })
    }
    if (device.group && !groupIds.has(device.group)) {
      errors.push({
        path: `devices[${i}].group`,
        message: `Group '${device.group}' is not defined in groups.`,
        severity: 'warning',
      })
    }
  })
}

// ─── Connection-side port validation (Phase 2c) ───────────────────

/**
 * Maps a `Connection.type` to the InterfaceGroup key on `DeviceInterfaces`
 * that must exist for the connection to land on a port. WiFi has no
 * count-bearing group; returns null and the phantom-assignment check
 * skips it. Unknown types also return null (treated as "no constraint").
 */
function connectionTypeToInterfaceKey(
  connType: string,
): 'ethernet' | 'sfp' | 'usb' | 'thunderbolt' | null {
  switch (connType) {
    case 'ethernet':
      return 'ethernet'
    case 'fiber':
    case 'sfp':
      return 'sfp'
    case 'usb':
      return 'usb'
    case 'thunderbolt':
      return 'thunderbolt'
    default:
      return null
  }
}

/**
 * Connection-side checks introduced in Phase 2c:
 *
 *  1. Dangling `fromPort` / `toPort` — label doesn't exist on the
 *     referenced device.
 *  2. Type-mismatched label — label resolves but its interface type is
 *     incompatible with `conn.type`.
 *  3. Ambiguous label — same label across multiple interface groups
 *     with no `conn.type` to disambiguate.
 *  4. Double-binding — two connections claim the same
 *     `(device, interfaceType, portIndex)`.
 *  5. Phantom assignment — `conn.type` is specified and incompatible
 *     with *both* endpoints' declared interfaces. Skipped when:
 *       - `conn.type` is absent (defaults to ethernet; can't fault a
 *         user who didn't ask for ethernet specifically);
 *       - the type is `wifi` (no count-bearing group);
 *       - a device declares no `interfaces` at all (opted out of port
 *         modeling — see Phase 2c handoff note about not breaking
 *         fixtures with bare devices).
 *
 *  Checks 1–3 piggy-back on `resolvePortReference`; the validator just
 *  attaches the right error path. Check 4 walks all resolved pins.
 *  Check 5 looks at `conn.type` against each endpoint's interfaces.
 */
function validateConnectionPorts(doc: HomelabDocument, errors: ValidationError[]): void {
  if (!Array.isArray(doc.connections)) return
  if (!Array.isArray(doc.devices)) return

  // Collect all devices (including children) into a lookup map.
  const deviceLookup = new Map<string, Device>()
  const collect = (devices: Device[]) => {
    for (const d of devices) {
      if (d.id) deviceLookup.set(d.id, d)
      if (d.children) collect(d.children)
    }
  }
  collect(doc.devices)

  // Tracks claimed slots for double-binding detection.
  const claimedSlots = new Map<string, number>() // key: `${deviceId}|${ifaceType}|${index}` → first conn index

  doc.connections.forEach((conn, i) => {
    const fromDev = deviceLookup.get(conn.from)
    const toDev = deviceLookup.get(conn.to)

    // 1–3. Label resolution + double-binding (from side)
    if (conn.fromPort !== undefined && fromDev) {
      const r = resolvePortReference(fromDev, conn.fromPort, conn.type)
      if ('error' in r) {
        errors.push({
          path: `connections[${i}].fromPort`,
          message: r.error,
          severity: 'error',
        })
      } else {
        recordSlotClaim(
          conn.from,
          r.interfaceType,
          r.index,
          i,
          `connections[${i}].fromPort`,
          claimedSlots,
          errors,
        )
      }
    }

    // 1–3. Label resolution + double-binding (to side)
    if (conn.toPort !== undefined && toDev) {
      const r = resolvePortReference(toDev, conn.toPort, conn.type)
      if ('error' in r) {
        errors.push({
          path: `connections[${i}].toPort`,
          message: r.error,
          severity: 'error',
        })
      } else {
        recordSlotClaim(
          conn.to,
          r.interfaceType,
          r.index,
          i,
          `connections[${i}].toPort`,
          claimedSlots,
          errors,
        )
      }
    }

    // 5. Phantom assignment — only when conn.type is explicit and the
    //    type maps to a count-bearing group. Both endpoints must have
    //    `interfaces` declared for the check to fire; a bare device
    //    is opting out of port modeling.
    if (conn.type !== undefined) {
      const requiredKey = connectionTypeToInterfaceKey(conn.type)
      if (requiredKey !== null) {
        const fromHasIfaces = fromDev?.interfaces !== undefined
        const toHasIfaces = toDev?.interfaces !== undefined
        if (fromHasIfaces && toHasIfaces) {
          const fromHasGroup = fromDev!.interfaces![requiredKey] !== undefined
          const toHasGroup = toDev!.interfaces![requiredKey] !== undefined
          if (!fromHasGroup && !toHasGroup) {
            errors.push({
              path: `connections[${i}].type`,
              message: `Connection type '${conn.type}' requires a '${requiredKey}' interface group, but neither '${conn.from}' nor '${conn.to}' declares one.`,
              severity: 'error',
            })
          }
        }
      }
    }
  })
}

function recordSlotClaim(
  deviceId: string,
  ifaceType: string,
  portIndex: number,
  connIndex: number,
  path: string,
  claimedSlots: Map<string, number>,
  errors: ValidationError[],
): void {
  const key = `${deviceId}|${ifaceType}|${portIndex}`
  const prior = claimedSlots.get(key)
  if (prior !== undefined) {
    errors.push({
      path,
      message: `Port '${ifaceType}[${portIndex}]' on '${deviceId}' is already claimed by connection ${prior}.`,
      severity: 'error',
    })
  } else {
    claimedSlots.set(key, connIndex)
  }
}
