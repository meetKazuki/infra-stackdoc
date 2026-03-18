export const DEFAULT_YAML = `topology_meta:
  name: "Homelab V1"
  version: "1.0"
nodes:
  - id: "fw_01"
    name: "pfSense Firewall"
    network_tier: "edge"
    type: "firewall"
    interfaces:
      - name: "lan"
        connection:
          target_device_id: "sw_01"
          target_port: "uplink"

  - id: "sw_01"
    name: "Core Switch"
    network_tier: "core"
    type: "switch"
    interfaces:
      - name: "port1"
        connection:
          target_device_id: "pve_01"
          target_port: "eth0"

  - id: "pve_01"
    name: "Proxmox Host"
    network_tier: "compute"
    type: "hypervisor"
    interfaces:
      - name: "eth0"
    hosted_compute:
      - id: "lxc_pihole"
        name: "Pi-Hole DNS"
        type: "lxc"
      - id: "vm_talos"
        name: "Talos Control Plane"
        type: "vm"`;
