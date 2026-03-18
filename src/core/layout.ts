import ELK from 'elkjs/lib/elk.bundled.js'
import { type Node, type Edge } from '@xyflow/react'

const elk = new ELK()

const DIMENSIONS = {
  device: { width: 320, height: 180 },
  compute: { width: 240, height: 80 },
}

const applyAutoLayout = async (nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
  const elkNodesMap = new Map<string, any>()
  const rootNodes: any[] = []

  // Convert flat ReactFlow nodes to ELK format
  nodes.forEach((node) => {
    const isCompute = node.type === 'computeNode'
    elkNodesMap.set(node.id, {
      id: node.id,
      width: isCompute ? DIMENSIONS.compute.width : DIMENSIONS.device.width,
      height: isCompute ? DIMENSIONS.compute.height : DIMENSIONS.device.height,
      children: [],
    })
  })

  // Build hierarchy (Nest VMs inside their hypervisors)
  nodes.forEach((node) => {
    const elkNode = elkNodesMap.get(node.id)
    if (node.parentId) {
      const parent = elkNodesMap.get(node.parentId)
      if (parent) parent.children.push(elkNode)
    } else {
      rootNodes.push(elkNode)
    }
  })

  // Map the edges for ELK
  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }))

  // Define the graph structure and layout algorithm rules
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80', // Vertical spacing
      'elk.spacing.nodeNode': '60', // Horizontal spacing between peers
      'elk.padding': '[top=50,left=30,bottom=30,right=30]',
    },
    children: rootNodes,
    edges: elkEdges,
  }

  // Run the ELK layout algorithm
  try {
    const layout = await elk.layout(elkGraph)

    const applyCoordinates = (elkNode: any, flowNodes: Node[]) => {
      const targetNode = flowNodes.find((n) => n.id === elkNode.id)
      if (targetNode) {
        targetNode.position = { x: elkNode.x, y: elkNode.y }

        if (elkNode.children && elkNode.children.length > 0) {
          targetNode.style = { ...targetNode.style, width: elkNode.width, height: elkNode.height }
          // recursively apply coordinates to children
          elkNode.children.forEach((child: any) => applyCoordinates(child, flowNodes))
        }
      }
    }

    if (layout.children) {
      layout.children.forEach((child) => applyCoordinates(child, nodes))
    }

    return { nodes, edges }
  } catch (error) {
    console.error('ELK Layout Engine failed:', error)
    return { nodes, edges }
  }
}

export { applyAutoLayout }
