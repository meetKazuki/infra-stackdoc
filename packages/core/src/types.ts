export interface HomelabDocument {
  meta: MetaConfig
  networks?: Network[]
  groups?: Group[]
  devices: Device[]
  connections: Connection[]
}

export interface MetaConfig {
  title: string
  subtitle?: string
  author?: string
  date?: string
  tags?: string[]
}

export interface Network {
  id: string
  name: string
  subnet?: string
  dhcp?: DhcpRange
  vlan?: number
}

export interface DhcpRange {
  start: string
  end: string
}

export interface Group {
  id: string
  name: string
  style?: 'dashed' | 'solid' | 'none'
  color?: string
}

export interface Device {
  id: string
  name: string
  type: DeviceType | string
  ip?: string
  network?: string
  group?: string
  tags?: string[]
  specs?: DeviceSpecs
  metadata?: Record<string, string>
  children?: Device[]
  services?: Service[]
  interfaces?: DeviceInterfaces
}

/** Well-known device types that receive dedicated icons. */
export type DeviceType =
  | 'router'
  | 'switch'
  | 'firewall'
  | 'server'
  | 'hypervisor'
  | 'vm'
  | 'container'
  | 'nas'
  | 'desktop'
  | 'laptop'
  | 'phone'
  | 'tablet'
  | 'camera'
  | 'tv'
  | 'iot'
  | 'ap'
  | 'modem'
  | 'vpn'
  | 'mini-pc'
  | 'sbc'
  | 'printer'
  | 'game-console'
  | 'media-player'

export interface DeviceSpecs {
  cpu?: string
  ram?: string
  storage?: string
  gpu?: string
  os?: string
}

export interface DeviceInterfaces {
  ethernet?: InterfaceGroup
  wifi?: WifiInterface
  sfp?: InterfaceGroup
  usb?: InterfaceGroup
  thunderbolt?: InterfaceGroup
}

export interface InterfaceGroup {
  count: number
  speed?: string
}

export interface WifiInterface {
  bands?: string[]
  standard?: string
}

export interface Service {
  name: string
  port?: number
  runtime?: 'native' | 'docker' | 'podman' | string
  url?: string
  metadata?: Record<string, string>
}

export interface Connection {
  from: string
  to: string
  type?: ConnectionType | string
  speed?: string
  direction?: 'one-way' | 'bidirectional'
  label?: string
}

export type ConnectionType = 'ethernet' | 'wifi' | 'vpn' | 'usb' | 'thunderbolt' | 'fiber'

// ─── Layout Output Types ──────────────────────────────────────────
// Produced by the layout engine, consumed by the renderer.

export interface PositionedGraph {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  groups: PositionedGroup[]
  bounds: Bounds
  meta: MetaConfig
  portAssignments: Map<string, import('./ports').PortAssignment[]>
}

export interface PositionedNode {
  device: Device
  x: number
  y: number
  width: number
  height: number
  depth: number
}

export interface PositionedEdge {
  connection: Connection
  points: Point[]
  fromNodeId: string
  toNodeId: string
  fromPortIndex?: number
  toPortIndex?: number
}

export interface PositionedGroup {
  group: Group
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  width: number
  height: number
}

// ─── Validation ───────────────────────────────────────────────────

export interface ValidationError {
  path: string
  message: string
  severity: 'error' | 'warning'
}

// ─── Layout Configuration ─────────────────────────────────────────

export interface LayoutOptions {
  nodeWidth?: number
  nodeHeight?: number
  horizontalSpacing?: number
  verticalSpacing?: number
  groupPadding?: number
}

export const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 300,
  nodeHeight: 160,
  horizontalSpacing: 50,
  verticalSpacing: 80,
  groupPadding: 40,
}
