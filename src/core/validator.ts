import { load } from 'js-yaml'
import { z } from 'zod'
import { applyAutoLayout } from '@core/layout'
import { parseTopology } from '@core/parser'

const connectionSchema = z.object({
  target_device_id: z.string(),
  target_port: z.string(),
})

const interfaceSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  connection: connectionSchema.optional(),
})

const deviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  network_tier: z.enum(['edge', 'core', 'access', 'compute', 'endpoint']),
  interfaces: z.array(interfaceSchema).optional(),
  hosted_compute: z.array(z.any()).optional(),
})

const topologySchema = z.object({
  nodes: z.array(deviceSchema),
  topology_meta: z.any()
})

const processYAMLTopology = async (yamlString: string) => {
  try {
    const raw = load(yamlString)

    const validTopology = topologySchema.parse(raw)
    const { nodes: rawNodes, edges: rawEdges } = parseTopology(validTopology)

    const { nodes: layoutNodes, edges: layoutEdges } = await applyAutoLayout(rawNodes, rawEdges)

    return { nodes: layoutNodes, edges: layoutEdges }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Schema Validation Failed:', error.errors)
      return {
        error: 'Schema Validation Error',
        details: error.errors,
      }
    }
    return {
      error: 'Failed to process topology',
      details: error
    }
  }
}

export { processYAMLTopology }
