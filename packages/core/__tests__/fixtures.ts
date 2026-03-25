import type { HomelabDocument, Device, Connection } from '../src/types'

// ─── YAML Strings ────────────────────────────────────────────────

/** Minimal valid YAML — the smallest input that produces a successful parse. */
export const MINIMAL_YAML = `
meta:
  title: Test Lab

devices:
  - id: router
    name: Main Router
    type: router

connections: []
`

/** Full-featured YAML exercising every schema section. */
export const FULL_YAML = `
meta:
  title: Full Homelab
  subtitle: 2025 Edition
  author: Kazuki
  date: "2025-01-01"
  tags: [PROXMOX, TAILSCALE]

networks:
  - id: lan
    name: LAN
    subnet: 10.1.0.0/24
    dhcp:
      start: 10.1.0.100
      end: 10.1.0.200
  - id: iot
    name: IoT VLAN
    vlan: 30

groups:
  - id: servers
    name: Server Rack
    style: dashed
    color: "#ffab00"
  - id: clients
    name: Client Devices

devices:
  - id: firewall
    name: pfSense
    type: firewall
    ip: 10.0.0.1
    network: lan
    group: servers
    tags: [PFSENSE]
    specs:
      cpu: i5
      ram: 16GB
      storage: 256GB
      os: pfSense 23.09
  - id: hypervisor
    name: Proxmox Host
    type: hypervisor
    ip: 10.1.10.1
    network: lan
    group: servers
    children:
      - id: dns-vm
        name: Pi-hole
        type: vm
        services:
          - name: Pi-hole
            port: 53
            runtime: docker
      - id: media-vm
        name: Jellyfin
        type: vm
  - id: laptop
    name: MacBook
    type: laptop
    group: clients

connections:
  - from: firewall
    to: hypervisor
    type: ethernet
    speed: 2.5G
    direction: bidirectional
    label: uplink
  - from: firewall
    to: laptop
    type: wifi
`

/** YAML with syntax error (bad indentation). */
export const INVALID_SYNTAX_YAML = `
meta:
  title: Broken
  devices:
  - id: x
  name: bad indent
`

/** YAML that parses to a scalar, not a mapping. */
export const SCALAR_YAML = 'just a plain string'

/** YAML that parses to null. */
export const EMPTY_YAML = ''

/** YAML with duplicate device IDs. */
export const DUPLICATE_IDS_YAML = `
meta:
  title: Dupes

devices:
  - id: router
    name: Router One
    type: router
  - id: router
    name: Router Two
    type: router

connections: []
`

/** YAML with connections referencing non-existent devices. */
export const DANGLING_REF_YAML = `
meta:
  title: Dangling

devices:
  - id: router
    name: Router
    type: router

connections:
  - from: router
    to: ghost-device
`

/** YAML with devices referencing undefined networks and groups. */
export const UNDEFINED_REFS_YAML = `
meta:
  title: Undefined Refs

devices:
  - id: server
    name: Server
    type: server
    network: nonexistent-net
    group: nonexistent-group

connections: []
`

// ─── Document Builders ───────────────────────────────────────────

/** Builds a minimal valid HomelabDocument. Override any field via the partial. */
export function buildDoc(overrides: Partial<HomelabDocument> = {}): HomelabDocument {
  return {
    meta: { title: 'Test Lab' },
    devices: [{ id: 'router', name: 'Main Router', type: 'router' }],
    connections: [],
    ...overrides,
  }
}

/** Builds a device with sensible defaults. */
export function buildDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'device-1',
    name: 'Device 1',
    type: 'server',
    ...overrides,
  }
}

/** Builds a connection with sensible defaults. */
export function buildConnection(overrides: Partial<Connection> = {}): Connection {
  return {
    from: 'a',
    to: 'b',
    ...overrides,
  }
}

/** A document with a parent device that has children — useful for layout/expand tests. */
export function buildDocWithChildren(_expanded: boolean = false): HomelabDocument {
  return {
    meta: { title: 'Nested Lab' },
    devices: [
      {
        id: 'hypervisor',
        name: 'Proxmox',
        type: 'hypervisor',
        children: [
          { id: 'vm-1', name: 'VM 1', type: 'vm' },
          { id: 'vm-2', name: 'VM 2', type: 'vm' },
        ],
      },
      {
        id: 'switch',
        name: 'Main Switch',
        type: 'switch',
      },
    ],
    connections: [{ from: 'hypervisor', to: 'switch' }],
  }
}
