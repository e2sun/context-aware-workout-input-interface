import { describe, expect, it } from 'vitest'
import { appendDigit, dropDigit, typedSeconds, timeChoices, numberChoices } from './number.js'

describe('typed numbers', () => {
  it('reads up to two digits as seconds and more as m:ss', () => {
    expect([5, 45, 90, 130, 200, 1000].map(typedSeconds)).toEqual([5, 45, 90, 90, 120, 600])
    expect(typedSeconds(175)).toBeNull()
  })

  it('builds and trims numbers digit by digit', () => {
    expect(appendDigit(null, 0)).toBeNull()
    expect(appendDigit(12, 5)).toBe(125)
    expect(appendDigit(9999, 1)).toBe(9999)
    expect([dropDigit(125), dropDigit(7)]).toEqual([12, null])
  })

  it('replaces the presets with the typed value', () => {
    expect(numberChoices(null, [95, 135])).toEqual([95, 135])
    expect(numberChoices(140, [95, 135])).toEqual([140])
    expect(timeChoices(130, [30])).toEqual([90])
    expect(timeChoices(175, [30])).toEqual([])
  })
})
