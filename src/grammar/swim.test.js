import { describe, expect, it } from 'vitest'
import * as swim from './swim.js'
import { initialState, workoutReducer } from '../state/workoutReducer.js'

// Taps the suggestion chip with the given label, failing if it isn't offered.
function tap(state, label) {
  const chip = swim
    .getSuggestions(state.current)
    .flatMap((g) => g.chips)
    .find((c) => c.label === label)
  if (!chip) throw new Error(`No "${label}" chip at stage ${swim.getStage(state.current).id}`)
  return workoutReducer(state, { type: 'chip', chip })
}

function enter(labels) {
  return labels.reduce(tap, initialState('swim'))
}

describe('swim test workouts (docs/grammar.md section 7)', () => {
  it.each([
    [['8', '8 x 50', 'Free', '@ :45'], '8 x 50 Free @ :45'],
    [['4', '4 x 100', 'IM', '@ 1:40'], '4 x 100 IM @ 1:40'],
    [['6', '6 x 25', 'Fly', '@ :30'], '6 x 25 Fly @ :30'],
    [['4', '4 x 50', 'Kick', '15 sec rest'], '4 x 50 Kick, 15 sec rest'],
    [['8', '8 x 50', 'Free', 'Sprint', 'Done'], '8 x 50 Free Sprint'],
  ])('%j -> %s', (labels, expected) => {
    const state = enter(labels)
    expect(state.lines).toEqual([expected])
    expect(swim.getStage(state.current).id).toBe('S0')
  })
})

describe('stages', () => {
  it('walks S0 -> S1 -> SW1 -> SW2 -> SW3', () => {
    let s = initialState('swim')
    const stages = [swim.getStage(s.current).id]
    for (const label of ['8', '8 x 50', 'Free', 'Easy']) {
      s = tap(s, label)
      stages.push(swim.getStage(s.current).id)
    }
    expect(stages).toEqual(['S0', 'S1', 'SW1', 'SW2', 'SW3'])
  })

  it('suggests intervals based on the chosen distance', () => {
    const s = enter(['4', '4 x 100', 'Back'])
    const intervals = swim.getSuggestions(s.current).find((g) => g.label === 'Interval')
    expect(intervals.chips.map((c) => c.label)).toEqual(['@ 1:30', '@ 1:40', '@ 1:45', '@ 2:00'])
  })
})

describe('number pad and delete', () => {
  it('types multi-digit reps, then offers distance chips for them', () => {
    let s = initialState('swim')
    s = workoutReducer(s, { type: 'digit', digit: 1 })
    s = workoutReducer(s, { type: 'digit', digit: 2 })
    expect(swim.format(s.current)).toBe('12')
    expect(swim.getSuggestions(s.current)[0].chips[0].label).toBe('12 x 25')
  })

  it('ignores digits once a distance is chosen', () => {
    let s = enter(['8', '8 x 50'])
    s = workoutReducer(s, { type: 'digit', digit: 3 })
    expect(swim.format(s.current)).toBe('8 x 50')
  })

  it('removes one slot at a time, then the last finished line', () => {
    let s = enter(['8', '8 x 50', 'Free', '@ :45', '4', '4 x 100', 'IM'])
    const texts = []
    for (let i = 0; i < 4; i++) {
      s = workoutReducer(s, { type: 'delete' })
      texts.push(swim.format(s.current))
    }
    expect(texts).toEqual(['4 x 100', '4', '', ''])
    expect(s.lines).toEqual([])
  })

  it('reset clears everything', () => {
    const s = workoutReducer(enter(['8', '8 x 50', 'Free', '@ :45', '4']), { type: 'reset' })
    expect(s).toEqual(initialState('swim'))
  })
})
