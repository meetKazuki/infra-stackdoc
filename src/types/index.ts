export type NetworkTier = 'edge' | 'core' | 'access' | 'compute' | 'endpoint';
export type DeviceType = 'firewall' | 'switch' | 'router' | 'access_point' | 'hypervisor' | 'nas' | 'bare_metal';
export type ComputeType = 'vm' | 'lxc' | 'docker';
export type InterfaceRole = 'wan' | 'lan' | 'uplink' | 'downlink' | 'management';

// 2. Networking primitives
export interface Connection {
  target_device_id: string;
  target_port: string;
}

export interface VlanNetwork {
  id: number;
  name: string;
  subnet: string;
}

export interface Interface {
  name: string;
  role?: InterfaceRole;
  status?: 'up' | 'down' | 'dhcp';
  mac_address?: string;
  speed?: string;
  mode?: 'access' | 'trunk';
  vlans_allowed?: number[];
  vlans_managed?: VlanNetwork[];
  connection?: Connection;
}

// 3. Hardware & Services
export interface HardwareSpec {
  manufacturer?: string;
  model?: string;
  cpu?: string;
  ram_gb?: number;
  storage?: Array<{ type: string; capacity_gb: number; role: string }>;
}

export interface Service {
  name: string;
  protocol: 'tcp' | 'udp' | 'http' | 'https';
  port: number;
  url?: string;
}

// 4. Compute (The nested VMs and LXCs)
export interface ComputeNetworking {
  ip_address?: string;
  gateway?: string;
  vlan?: number;
}

export interface ComputeNode {
  id: string;
  vmid?: number;
  name: string;
  type: ComputeType;
  os?: string;
  status?: 'online' | 'offline' | 'paused';
  resources?: {
    cpu_cores: number;
    ram_mb: number;
  };
  networking?: ComputeNetworking;
  services?: Service[];
}

// 5. The Physical/Primary Device Nodes
export interface DeviceNode {
  id: string;
  name: string;
  network_tier: NetworkTier;
  type: DeviceType;
  role?: string;
  platform?: string; // e.g., 'proxmox', 'opnsense', 'unifi'
  status?: 'online' | 'offline' | 'maintenance';
  hardware?: HardwareSpec;
  software?: {
    os?: string;
    version?: string;
  };
  interfaces?: Interface[];
  hosted_compute?: ComputeNode[];
}

// 6. The Global Map
export interface TopologyMeta {
  name: string;
  version: string;
  author?: string;
  last_updated?: string;
}

export interface TopologyMap {
  topology_meta: TopologyMeta;
  nodes: DeviceNode[];
}
