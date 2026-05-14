import { findGroupCycle } from './groups'
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
    // Continue checking label content so the user sees all issues at once.
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
