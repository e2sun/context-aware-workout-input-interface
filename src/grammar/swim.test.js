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

describe('swim typing', () => {
  const press = (state, action) => workoutReducer(state, action)
  const typeNumber = (state, n) => [...String(n)].reduce((s, d) => press(s, { type: 'digit', digit: Number(d) }), state)
  const times = (state) => press(state, { type: 'times' })
  const stage = (state) => swim.getStage(state.current).id
  const chipLabels = (state) => swim.getSuggestions(state.current).flatMap((g) => g.chips.map((c) => c.label))
  const text = (state) => swim.format(state.current)

  it('× types a custom distance: 8 x 75 Free', () => {
    let s = times(typeNumber(initialState('swim'), 8))
    expect([stage(s), text(s)]).toEqual(['S2', '8 x'])
    expect(chipLabels(s)).toEqual(['8 x 25', '8 x 50', '8 x 100', '8 x 200'])
    s = typeNumber(s, 75)
    expect(text(s)).toBe('8 x 75')
    s = tap(s, 'Free')
    expect([stage(s), text(s)]).toEqual(['SW2', '8 x 75 Free'])
  })

  it('× is only available right after the first number', () => {
    expect(swim.acceptsTimes(initialState('swim').current)).toBe(false)
    expect(swim.acceptsTimes(typeNumber(initialState('swim'), 8).current)).toBe(true)
    expect(swim.acceptsTimes(enter(['8', '8 x 50']).current)).toBe(false)
  })

  it('types a custom interval or rest after the stroke', () => {
    let s = typeNumber(enter(['8', '8 x 50', 'Free']), 52)
    expect(text(s)).toBe('8 x 50 Free 52')
    expect(chipLabels(s)).toEqual(expect.arrayContaining(['@ :52', '52 sec rest', 'Easy']))
    expect(chipLabels(s)).not.toContain('@ :45')
    expect(tap(s, '@ :52').lines).toEqual(['8 x 50 Free @ :52'])

    s = typeNumber(enter(['4', '4 x 100', 'IM']), 135)
    expect(chipLabels(s)).toEqual(expect.arrayContaining(['@ 1:35', '95 sec rest']))
  })

  it('offers no time chips for an impossible time', () => {
    const s = typeNumber(enter(['4', '4 x 100', 'IM']), 175)
    expect(chipLabels(s)).toEqual(['Easy', 'Moderate', 'Fast', 'Sprint', 'Build', 'Descend', 'Done'])
  })

  it('delete walks back through × and a typed distance', () => {
    let s = tap(typeNumber(times(typeNumber(initialState('swim'), 8)), 75), 'Free')
    const expected = [
      ['SW1', '8 x 75'],
      ['S2', '8 x'],
      ['S1', '8'],
      ['S0', ''],
    ]
    for (const step of expected) {
      s = press(s, { type: 'delete' })
      expect([stage(s), text(s)]).toEqual(step)
    }
  })
})

describe('swim blocks', () => {
  const press = (state, action) => workoutReducer(state, action)
  const typeNumber = (state, n) => [...String(n)].reduce((s, d) => press(s, { type: 'digit', digit: Number(d) }), state)
  const del = (state) => press(state, { type: 'delete' })
  const stage = (state) => swim.getStage(state.current).id
  const chipLabels = (state) => swim.getSuggestions(state.current).flatMap((g) => g.chips.map((c) => c.label))
  const groupLabels = (state) => swim.getSuggestions(state.current).map((g) => g.label)
  const text = (state) => swim.format(state.current)

  const opened = () => tap(initialState('swim'), 'Start Block')

  // 100 Free + 8 x 25 Kick + 50 Free Sprint, not yet finished
  const threeItems = () => {
    let s = tap(typeNumber(opened(), 100), '100 Free')
    s = tap(tap(tap(tap(s, '+ Add'), '8'), '8 x 25'), 'Kick')
    s = tap(typeNumber(tap(s, '+ Add'), 50), '50 Free')
    return tap(s, 'Sprint')
  }

  it('offers Start Block at the start of every line', () => {
    expect(chipLabels(initialState('swim'))).toContain('Start Block')
    expect(chipLabels(typeNumber(initialState('swim'), 8))).not.toContain('Start Block')
  })

  it('Start Block opens an empty block waiting for the first item', () => {
    const s = opened()
    expect(stage(s)).toBe('BL1')
    expect(text(s)).toBe('(')
    expect(swim.acceptsDigits(s.current)).toBe(true)
  })

  it('offers distance chips for a single swim', () => {
    let s = opened()
    expect(groupLabels(s)).toEqual(['Reps', 'Distance'])
    s = tap(s, '100 yd')
    expect([stage(s), text(s)]).toEqual(['BL2', '(100'])
    expect(swim.acceptsDigits(s.current)).toBe(false)
    s = tap(s, 'Free')
    expect(text(s)).toBe('(100 Free')
    expect(stage(del(del(s)))).toBe('BL2')
  })

  it('a typed number offers sets, plus single swims when it is a distance', () => {
    const eight = tap(opened(), '8')
    expect(groupLabels(eight)).toEqual(['Set'])
    expect(chipLabels(eight)).toEqual(['8 x 25', '8 x 50', '8 x 100', '8 x 200'])

    const hundred = typeNumber(opened(), 100)
    expect(groupLabels(hundred)).toEqual(['Set', 'Single'])
    expect(chipLabels(hundred)).toEqual(expect.arrayContaining(['100 x 25', '100 Free', '100 Kick']))
  })

  it('builds a set item: 8 x 25 Free @ :30', () => {
    let s = tap(tap(tap(opened(), '8'), '8 x 25'), 'Free')
    expect(stage(s)).toBe('BL3')
    expect(groupLabels(s)).toEqual(['Effort', 'Interval', null])
    s = tap(s, '@ :30')
    expect(text(s)).toBe('(8 x 25 Free @ :30')
    // Effort comes before the interval, so it is no longer offered.
    expect(groupLabels(s)).toEqual([null])
  })

  it('builds, repeats and commits a mixed block', () => {
    let s = threeItems()
    expect(text(s)).toBe('(100 Free + 8 x 25 Kick + 50 Free Sprint')
    s = tap(s, 'Finish Block')
    expect(chipLabels(s)).toEqual(['Repeat ×2', 'Repeat ×3', 'Repeat ×4'])
    s = tap(tap(s, 'Repeat ×3'), 'Done')
    expect(s.lines).toEqual(['3 × (100 Free + 8 x 25 Kick + 50 Free Sprint)'])
    expect(stage(s)).toBe('S0')
  })

  it('a block rest commits the block', () => {
    const s = tap(tap(tap(threeItems(), 'Finish Block'), 'Repeat ×2'), '20 sec rest')
    expect(s.lines).toEqual(['2 × (100 Free + 8 x 25 Kick + 50 Free Sprint), 20 sec rest'])
  })

  it('deletes back through a block one slot at a time', () => {
    let s = tap(tap(threeItems(), 'Finish Block'), 'Repeat ×3')
    const expected = [
      ['BL4', '(100 Free + 8 x 25 Kick + 50 Free Sprint)'],
      ['BL3', '(100 Free + 8 x 25 Kick + 50 Free Sprint'],
      ['BL3', '(100 Free + 8 x 25 Kick + 50 Free'],
      // Undoing a single swim's stroke turns its distance back into the typed number.
      ['BL2', '(100 Free + 8 x 25 Kick + 50'],
      ['BL2', '(100 Free + 8 x 25 Kick + 5'],
      ['BL1', '(100 Free + 8 x 25 Kick + '],
      ['BL3', '(100 Free + 8 x 25 Kick'],
      ['BL2', '(100 Free + 8 x 25'],
      ['BL2', '(100 Free + 8'],
      ['BL1', '(100 Free + '],
      ['BL3', '(100 Free'],
      ['BL2', '(100'],
      ['BL2', '(10'],
      ['BL2', '(1'],
      ['BL1', '('],
      ['S0', ''],
    ]
    for (const step of expected) {
      s = del(s)
      expect([stage(s), text(s)]).toEqual(step)
    }
    expect(s).toEqual(initialState('swim'))
  })

  it('a line can be a single swim, typed or tapped', () => {
    const typed = typeNumber(initialState('swim'), 100)
    expect(stage(typed)).toBe('S1')
    expect(groupLabels(typed)).toEqual(['Set', 'Single'])
    expect(tap(tap(typed, '100 Free'), 'Done').lines).toEqual(['100 Free'])

    let s = tap(tap(initialState('swim'), '200 yd'), 'IM')
    expect(stage(s)).toBe('SW2')
    s = tap(tap(s, 'Easy'), '20 sec rest')
    expect(s.lines).toEqual(['200 IM Easy, 20 sec rest'])

    expect(tap(tap(tap(initialState('swim'), '100 yd'), 'Free'), '@ 1:30').lines).toEqual(['100 Free @ 1:30'])
  })

  it('deleting a single swim line steps back through the typed number', () => {
    let s = tap(typeNumber(initialState('swim'), 100), '100 Free')
    const expected = [['S1', '100'], ['S1', '10'], ['S1', '1'], ['S0', '']]
    for (const step of expected) {
      s = del(s)
      expect([stage(s), text(s)]).toEqual(step)
    }
  })

  it('types a custom interval, distance and repeat count inside a block', () => {
    let s = tap(typeNumber(press(tap(opened(), '8'), { type: 'times' }), 75), 'Kick')
    expect(text(s)).toBe('(8 x 75 Kick')
    s = tap(typeNumber(s, 110), '@ 1:10')
    s = tap(tap(tap(s, '+ Add'), '100 yd'), 'Free')
    s = tap(typeNumber(tap(s, 'Finish Block'), 5), 'Repeat ×5')
    s = tap(typeNumber(s, 15), '15 sec rest')
    expect(s.lines).toEqual(['5 × (8 x 75 Kick @ 1:10 + 100 Free), 15 sec rest'])
  })

  it('reset clears a block in progress', () => {
    const s = press(threeItems(), { type: 'reset' })
    expect(s).toEqual(initialState('swim'))
    expect(enter(['8', '8 x 50', 'Free', '@ :45']).lines).toEqual(['8 x 50 Free @ :45'])
  })
})
