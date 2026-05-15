import { describe, it, expect } from 'vitest'
import { layerForConnectionType, isLayerVisible, ALL_LAYERS } from '../src/lib/layers'

describe('layerForConnectionType', () => {
  it('maps ethernet to ETH', () => {
    expect(layerForConnectionType('ethernet')).toBe('ETH')
  })

  it('maps wifi to WIFI', () => {
    expect(layerForConnectionType('wifi')).toBe('WIFI')
  })

  it('maps every VPN-family type to VPN', () => {
    expect(layerForConnectionType('vpn')).toBe('VPN')
    expect(layerForConnectionType('tailscale')).toBe('VPN')
    expect(layerForConnectionType('wireguard')).toBe('VPN')
    expect(layerForConnectionType('tunnel')).toBe('VPN')
  })

  it('maps every STORAGE-family type to STORAGE', () => {
    expect(layerForConnectionType('storage')).toBe('STORAGE')
    expect(layerForConnectionType('iscsi')).toBe('STORAGE')
    expect(layerForConnectionType('nfs')).toBe('STORAGE')
    expect(layerForConnectionType('sata')).toBe('STORAGE')
    expect(layerForConnectionType('usb')).toBe('STORAGE')
    expect(layerForConnectionType('thunderbolt')).toBe('STORAGE')
  })

  it('returns null for unrecognised types (always-visible)', () => {
    expect(layerForConnectionType('5g')).toBeNull()
    expect(layerForConnectionType('something-custom')).toBeNull()
  })

  it('returns null for undefined types', () => {
    expect(layerForConnectionType(undefined)).toBeNull()
  })
})

describe('isLayerVisible', () => {
  it('hides ethernet when ETH is disabled', () => {
    const enabled = new Set(ALL_LAYERS.filter((l) => l !== 'ETH'))

    expect(isLayerVisible('ethernet', enabled)).toBe(false)
  })

  it('shows ethernet when ETH is enabled', () => {
    expect(isLayerVisible('ethernet', new Set(ALL_LAYERS))).toBe(true)
  })

  it('always shows unrecognised types regardless of toggle state', () => {
    // No layers enabled at all — custom types still render.
    const noneEnabled = new Set<never>()

    expect(isLayerVisible('5g', noneEnabled)).toBe(true)
    expect(isLayerVisible('custom-fabric', noneEnabled)).toBe(true)
  })

  it('always shows edges with no declared type', () => {
    expect(isLayerVisible(undefined, new Set())).toBe(true)
  })
})
