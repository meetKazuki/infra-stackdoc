import { describe, it, expect } from 'vitest'
import { resolveSupernodeIcon } from '../src/lib/supernode-icon'
import { buildDevice } from './fixtures'

describe('resolveSupernodeIcon', () => {
  it('returns "device" for an empty group', () => {
    expect(resolveSupernodeIcon([])).toBe('device')
  })

  it('returns the type of a singleton group', () => {
    expect(resolveSupernodeIcon([buildDevice({ id: 'r', type: 'router' })])).toBe('router')
  })

  it('returns the clear majority when one type ≥ 80%', () => {
    // 4 of 5 are containers (80%) — short-circuits the tiebreak.
    const devices = [
      buildDevice({ id: 'c1', type: 'container' }),
      buildDevice({ id: 'c2', type: 'container' }),
      buildDevice({ id: 'c3', type: 'container' }),
      buildDevice({ id: 'c4', type: 'container' }),
      buildDevice({ id: 'r1', type: 'router' }),
    ]

    expect(resolveSupernodeIcon(devices)).toBe('container')
  })

  it('returns the most common type when no 80% majority', () => {
    // 3 servers, 2 laptops — server wins on count, no tiebreak needed.
    const devices = [
      buildDevice({ id: 's1', type: 'server' }),
      buildDevice({ id: 's2', type: 'server' }),
      buildDevice({ id: 's3', type: 'server' }),
      buildDevice({ id: 'l1', type: 'laptop' }),
      buildDevice({ id: 'l2', type: 'laptop' }),
    ]

    expect(resolveSupernodeIcon(devices)).toBe('server')
  })

  it('breaks ties using the fixed priority order (router > switch > server)', () => {
    // 1 of each — router, switch, server. Router wins on tiebreak.
    const devices = [
      buildDevice({ id: 'a', type: 'switch' }),
      buildDevice({ id: 'b', type: 'server' }),
      buildDevice({ id: 'c', type: 'router' }),
    ]

    expect(resolveSupernodeIcon(devices)).toBe('router')
  })

  it('breaks ties between switch and server in favour of switch', () => {
    const devices = [
      buildDevice({ id: 'a', type: 'server' }),
      buildDevice({ id: 'b', type: 'switch' }),
    ]

    expect(resolveSupernodeIcon(devices)).toBe('switch')
  })

  it('places unknown types last in the tiebreak (loses to any known type)', () => {
    const devices = [
      buildDevice({ id: 'a', type: 'mystery-type' }),
      buildDevice({ id: 'b', type: 'laptop' }),
    ]

    expect(resolveSupernodeIcon(devices)).toBe('laptop')
  })
})
