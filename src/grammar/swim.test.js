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
    expect(intervals.chips.map((c) => c.label)).toEqual(['@ 1:40', '@ 1:45', '@ 1:30', '@ 2:00'])
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
    expect(chipLabels(s)).toEqual(['8 x 50', '8 x 100', '8 x 25', '8 x 200', '8 × ('])
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
    expect(chipLabels(s)).toEqual([
      'Moderate',
      'Fast',
      'Descend',
      'Build',
      'Easy',
      'Sprint',
      'Fins',
      'Paddles',
      'Snorkel',
      'Pull Buoy',
      'Kickboard',
      'Done',
    ])
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
    expect(chipLabels(eight)).toEqual(['8 x 50', '8 x 100', '8 x 25', '8 x 200'])

    const hundred = typeNumber(opened(), 100)
    expect(groupLabels(hundred)).toEqual(['Single', 'Set'])
    expect(chipLabels(hundred)).toEqual(expect.arrayContaining(['100 x 25', '100 Free', '100 Kick']))
  })

  it('builds a set item: 8 x 25 Free @ :30', () => {
    let s = tap(tap(tap(opened(), '8'), '8 x 25'), 'Free')
    expect(stage(s)).toBe('BL3')
    expect(groupLabels(s)).toEqual(['Effort', 'Equipment', 'Interval', null])
    s = tap(s, '@ :30')
    expect(text(s)).toBe('(8 x 25 Free @ :30')
    // Effort and equipment come before the interval, so they are no longer offered.
    expect(groupLabels(s)).toEqual([null])
  })

  it('builds, repeats and commits a mixed block', () => {
    let s = threeItems()
    expect(text(s)).toBe('(100 Free + 8 x 25 Kick + 50 Free Sprint')
    s = tap(s, 'Finish Block')
    expect(chipLabels(s)).toEqual(['Repeat ×3', 'Repeat ×2', 'Repeat ×4'])
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
    expect(groupLabels(typed)).toEqual(['Single', 'Set'])
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

describe('swim @ key', () => {
  const press = (state, action) => workoutReducer(state, action)
  const typeNumber = (state, n) => [...String(n)].reduce((s, d) => press(s, { type: 'digit', digit: Number(d) }), state)
  const at = (state) => press(state, { type: 'at' })
  const del = (state) => press(state, { type: 'delete' })
  const chipLabels = (state) => swim.getSuggestions(state.current).flatMap((g) => g.chips.map((c) => c.label))
  const text = (state) => swim.format(state.current)

  // 10 x 75 Free, with 75 typed after ×
  const tenBy75 = () => tap(typeNumber(press(typeNumber(initialState('swim'), 10), { type: 'times' }), 75), 'Free')

  it('types an interval that is not a preset: 10 x 75 Free @ 2:20', () => {
    let s = at(tenBy75())
    expect(text(s)).toBe('10 x 75 Free @')
    expect(swim.getStage(s.current).prompt).toBe('Interval time')
    expect(chipLabels(s)).toEqual(['@ 1:10', '@ 1:05', '@ 1:15', '@ 1:20'])
    s = typeNumber(s, 2)
    expect(text(s)).toBe('10 x 75 Free @ :02')
    s = typeNumber(s, 20)
    expect(text(s)).toBe('10 x 75 Free @ 2:20')
    expect(chipLabels(s)).toEqual(['@ 2:20'])
    s = tap(s, '@ 2:20')
    expect(s.lines).toEqual(['10 x 75 Free @ 2:20'])
    expect(s.current).toEqual(swim.emptyEntry())
  })

  it('is offered only once the stroke is chosen and until the interval is set', () => {
    expect(swim.acceptsAt(initialState('swim').current)).toBe(false)
    expect(swim.acceptsAt(enter(['8', '8 x 50']).current)).toBe(false)
    expect(swim.acceptsAt(enter(['8', '8 x 50', 'Free']).current)).toBe(true)
    expect(swim.acceptsAt(enter(['8', '8 x 50', 'Free', 'Fast', 'Fins']).current)).toBe(true)
    const s = at(enter(['8', '8 x 50', 'Free']))
    expect(swim.acceptsAt(s.current)).toBe(false)
    expect(swim.acceptsTimes(s.current)).toBe(false)
    expect(at(s)).toEqual(s)
  })

  it('does nothing where @ does not apply', () => {
    const s = enter(['8', '8 x 50'])
    expect(at(s)).toEqual(s)
  })

  it('a preset can still be tapped after @', () => {
    expect(tap(at(enter(['8', '8 x 50', 'Free'])), '@ :45').lines).toEqual(['8 x 50 Free @ :45'])
  })

  it('shows an invalid time as typed, with no chip', () => {
    const s = typeNumber(at(tenBy75()), 175)
    expect(text(s)).toBe('10 x 75 Free @ 175')
    expect(chipLabels(s)).toEqual([])
  })

  it('delete removes digits, then the @', () => {
    let s = typeNumber(at(tenBy75()), 220)
    const expected = ['10 x 75 Free @ :22', '10 x 75 Free @ :02', '10 x 75 Free @', '10 x 75 Free', '10 x 75']
    for (const step of expected) {
      s = del(s)
      expect(text(s)).toBe(step)
    }
  })

  it('typing without @ still offers both interval and rest', () => {
    expect(chipLabels(typeNumber(tenBy75(), 20))).toEqual(expect.arrayContaining(['@ :20', '20 sec rest']))
  })

  it('works on a block item', () => {
    let s = enter(['Start Block', '8', '8 x 50', 'Kick', 'Fins'])
    expect(swim.acceptsAt(s.current)).toBe(true)
    s = typeNumber(at(s), 58)
    expect(text(s)).toBe('(8 x 50 Kick w/ Fins @ :58')
    expect(chipLabels(s)).toEqual(['@ :58'])
    s = tap(s, '@ :58')
    expect(text(s)).toBe('(8 x 50 Kick w/ Fins @ :58')
    expect(swim.acceptsAt(s.current)).toBe(false)
    s = ['+ Add', '100 yd', 'Free', 'Finish Block'].reduce(tap, s)
    expect(swim.acceptsAt(s.current)).toBe(false)
    s = ['Repeat ×3', 'Done'].reduce(tap, s)
    expect(s.lines).toEqual(['3 × (8 x 50 Kick w/ Fins @ :58 + 100 Free)'])
  })

  it('@ then delete inside a block returns to the item modifiers', () => {
    const s = del(at(enter(['Start Block', '8', '8 x 50', 'Kick'])))
    expect(chipLabels(s)).toEqual(expect.arrayContaining(['Kickboard', '+ Add']))
  })
})

describe('swim blocks typed rounds first: 3 × (', () => {
  const press = (state, action) => workoutReducer(state, action)
  const typeNumber = (state, n) => [...String(n)].reduce((s, d) => press(s, { type: 'digit', digit: Number(d) }), state)
  const del = (state) => press(state, { type: 'delete' })
  const stage = (state) => swim.getStage(state.current).id
  const chipLabels = (state) => swim.getSuggestions(state.current).flatMap((g) => g.chips.map((c) => c.label))
  const text = (state) => swim.format(state.current)
  const threeX = () => press(typeNumber(initialState('swim'), 3), { type: 'times' })

  it('offers 3 × ( after 3 or 3 x, but not while a distance is typed or for a distance', () => {
    expect(chipLabels(typeNumber(initialState('swim'), 3))).toContain('3 × (')
    expect(chipLabels(threeX())).toContain('3 × (')
    expect(chipLabels(typeNumber(threeX(), 5))).not.toContain('3 × (')
    expect(chipLabels(typeNumber(initialState('swim'), 100))).not.toContain('100 × (')
  })

  it('builds the block left to right and skips the Repeat step', () => {
    let s = tap(threeX(), '3 × (')
    expect([stage(s), text(s)]).toEqual(['BL1', '3 × ('])
    s = ['100 yd', 'Free', '+ Add', '4', '4 x 25', 'Fly', 'Sprint', '@ :30'].reduce(tap, s)
    expect(text(s)).toBe('3 × (100 Free + 4 x 25 Fly Sprint @ :30')
    s = tap(s, 'Finish Block')
    expect([stage(s), text(s)]).toEqual(['BL5', '3 × (100 Free + 4 x 25 Fly Sprint @ :30)'])
    s = tap(s, '30 sec rest')
    expect(s.lines).toEqual(['3 × (100 Free + 4 x 25 Fly Sprint @ :30), 30 sec rest'])
  })

  it('gives the same line as Start Block then Repeat ×3', () => {
    const items = ['100 yd', 'Free', '+ Add', '4', '4 x 25', 'Fly', 'Finish Block']
    const first = [...items, 'Done'].reduce(tap, tap(threeX(), '3 × ('))
    const last = ['Start Block', ...items, 'Repeat ×3', 'Done'].reduce(tap, initialState('swim'))
    expect(first.lines).toEqual(last.lines)
  })

  it('delete walks back through the block to 3 x, keeping the rounds', () => {
    let s = ['100 yd', 'Free', '+ Add', '200 yd', 'Kick', 'Finish Block'].reduce(tap, tap(threeX(), '3 × ('))
    const expected = [
      ['BL3', '3 × (100 Free + 200 Kick'],
      ['BL2', '3 × (100 Free + 200'],
      ['BL2', '3 × (100 Free + 20'],
      ['BL2', '3 × (100 Free + 2'],
      ['BL1', '3 × (100 Free + '],
      ['BL3', '3 × (100 Free'],
      ['BL2', '3 × (100'],
      ['BL2', '3 × (10'],
      ['BL2', '3 × (1'],
      ['BL1', '3 × ('],
      ['S2', '3 x'],
      ['S1', '3'],
      ['S0', ''],
    ]
    for (const step of expected) {
      s = del(s)
      expect([stage(s), text(s)]).toEqual(step)
    }
    expect(s).toEqual(initialState('swim'))
  })

  it('still needs two items before Finish Block', () => {
    const s = ['100 yd', 'Free'].reduce(tap, tap(threeX(), '3 × ('))
    expect(chipLabels(s)).not.toContain('Finish Block')
  })
})
