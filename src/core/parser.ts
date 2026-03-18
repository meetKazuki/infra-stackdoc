import { type Node, type Edge } from '@xyflow/react'
import { type ComputeNode, type DeviceNode, type TopologyMap } from '@/types'

const parseTopology = (topology: TopologyMap): { nodes: Node[], edges: Edge[] } => {
  const flowNodes: Node[] = []
  const flowEdges: Edge[] = []

  topology.nodes.forEach((device: DeviceNode) => {
    // Create primary device node
    flowNodes.push({
      id: device.id,
      type: 'deviceNode',
      position: { x: 0, y: 0 },
      data: {
        label: device.name,
        tier: device.network_tier,
        platform: device.platform,
        hardware: device.hardware
      },
    })

    // Map Nested Compute (VMs / LXCs)
    if (device.hosted_compute && device.hosted_compute.length > 0) {
      device.hosted_compute.forEach((compute: ComputeNode, index: number) => {
        flowNodes.push({
          id: compute.id,
          type: 'computeNode',
          parentId: device.id,
          extent: 'parent',
          position: { x: 20, y: 20 + index * 80 },
          data: {
            label: compute.name,
            type: compute.type,
            ip: compute.networking?.ip_address,
          }
        })
      })
    }

    // Map the cabling (Edges)
    if (device.interfaces) {
      device.interfaces.forEach((iface) => {
        if (iface.connection) {
          flowEdges.push({
            id: `edge-${device.id}-${iface.name}-${iface.connection.target_device_id}`,
            source: device.id,
            // sourceHandle: iface.name,
            target: iface.connection.target_device_id,
            // targetHandle: iface.connection.target_port,
            type: 'smoothstep',
            animated: device.network_tier === 'edge',
          })
        }
      })
    }
  })

  return { nodes: flowNodes, edges: flowEdges }
}

export { parseTopology }
