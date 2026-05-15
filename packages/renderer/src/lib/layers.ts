/**
 * Density-toolbar layer categories.
 *
 * Each `Connection.type` string maps to at most one chip category.
 * Strings that aren't recognised here are treated as "always visible"
 * — the toggle UI is additive, not exhaustive. A future custom type
 * (e.g. `"5g"`) does NOT need to be added to this map to render; users
 * just won't be able to filter it out via the toolbar.
 *
 * Intentionally a simple `Record` rather than a switch, so the chip
 * descriptors below can iterate it for the chip→types reverse mapping.
 */
const TYPE_TO_LAYER: Record<string, LayerCategory> = {
  ethernet: 'ETH',
  wifi: 'WIFI',
  vpn: 'VPN',
  tailscale: 'VPN',
  wireguard: 'VPN',
  tunnel: 'VPN',
  storage: 'STORAGE',
  iscsi: 'STORAGE',
  nfs: 'STORAGE',
  sata: 'STORAGE',
  usb: 'STORAGE',
  thunderbolt: 'STORAGE',
}

export type LayerCategory = 'ETH' | 'WIFI' | 'VPN' | 'STORAGE'

export const ALL_LAYERS: readonly LayerCategory[] = ['ETH', 'WIFI', 'VPN', 'STORAGE'] as const

/**
 * Returns the chip category for a connection type, or `null` for
 * types that don't fall under any chip (and therefore are never
 * hidden by toolbar toggles).
 */
export function layerForConnectionType(type: string | undefined): LayerCategory | null {
  if (!type) return null
  return TYPE_TO_LAYER[type] ?? null
}

/**
 * Decides whether an edge of the given connection type should render,
 * given the current set of *enabled* chips. Types outside any chip
 * always render.
 */
export function isLayerVisible(
  type: string | undefined,
  enabledLayers: ReadonlySet<LayerCategory>,
): boolean {
  const layer = layerForConnectionType(type)
  if (layer === null) return true
  return enabledLayers.has(layer)
}
