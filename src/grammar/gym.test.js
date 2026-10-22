import { describe, expect, it } from 'vitest'
import * as gym from './gym.js'
import { initialState, workoutReducer } from '../state/workoutReducer.js'

function tap(state, label) {
  const chip = gym
    .getSuggestions(state.current)
    .flatMap((g) => g.chips)
    .find((c) => c.label === label)
  if (!chip) throw new Error(`No "${label}" chip at stage ${gym.getStage(state.current).id}`)
  return workoutReducer(state, { type: 'chip', chip })
}

function enter(labels) {
  return labels.reduce(tap, initialState('gym'))
}

describe('gym test workouts (docs/grammar.md section 7)', () => {
  it.each([
    [['4', '4 x 8', 'Bench Press', '@ 135 lb', 'Done'], '4 x 8 Bench Press @ 135 lb'],
    [['3', '3 x 10', 'Squats', 'Done'], '3 x 10 Squats'],
    [['3', '3 x 12', 'Shoulder Press', '@ 20 lb', 'Done'], '3 x 12 Shoulder Press @ 20 lb'],
    [['4', '4 x 5', 'Deadlift', '@ 185 lb', '2 min rest'], '4 x 5 Deadlift @ 185 lb, 2 min rest'],
  ])('%j -> %s', (labels, expected) => {
    const state = enter(labels)
    expect(state.lines).toEqual([expected])
    expect(gym.getStage(state.current).id).toBe('S0')
  })
})

describe('gym stages', () => {
  it('offers no weight chips for bodyweight exercises', () => {
    const s = enter(['3', '3 x 10', 'Push-Ups'])
    expect(gym.getSuggestions(s.current).map((g) => g.label)).toEqual(['Rest', null])
  })

  it('suggests weights based on the chosen exercise', () => {
    const s = enter(['4', '4 x 5', 'Deadlift'])
    const weights = gym.getSuggestions(s.current).find((g) => g.label === 'Weight')
    expect(weights.chips.map((c) => c.label)).toEqual(['@ 135 lb', '@ 185 lb', '@ 225 lb', '@ 275 lb'])
  })

  it('switching tabs starts a new workout', () => {
    const s = workoutReducer(enter(['3', '3 x 10', 'Squats', 'Done']), { type: 'sport', sport: 'swim' })
    expect(s).toEqual(initialState('swim'))
  })
})

describe('gym typing', () => {
  const press = (state, action) => workoutReducer(state, action)
  const typeNumber = (state, n) => [...String(n)].reduce((s, d) => press(s, { type: 'digit', digit: Number(d) }), state)
  const times = (state) => press(state, { type: 'times' })
  const stage = (state) => gym.getStage(state.current).id
  const chipLabels = (state) => gym.getSuggestions(state.current).flatMap((g) => g.chips.map((c) => c.label))
  const text = (state) => gym.format(state.current)

  it('× types a custom reps count: 3 x 15 Squats', () => {
    let s = times(typeNumber(initialState('gym'), 3))
    expect([stage(s), text(s)]).toEqual(['S2', '3 x'])
    s = typeNumber(s, 15)
    expect(text(s)).toBe('3 x 15')
    expect(chipLabels(s)).toContain('Squats')
    s = tap(tap(s, 'Squats'), 'Done')
    expect(s.lines).toEqual(['3 x 15 Squats'])
  })

  it('a single set: 20 Push-Ups', () => {
    const s = typeNumber(initialState('gym'), 20)
    expect(chipLabels(s)).toEqual(expect.arrayContaining(['20 x 8', '20 Push-Ups']))
    expect(tap(tap(s, '20 Push-Ups'), 'Done').lines).toEqual(['20 Push-Ups'])
  })

  it('types a custom weight and rest', () => {
    let s = typeNumber(enter(['4', '4 x 8', 'Bench Press']), 140)
    expect(text(s)).toBe('4 x 8 Bench Press 140')
    expect(chipLabels(s)).toEqual(['@ 140 lb', '100 sec rest', 'Done'])
    s = typeNumber(tap(s, '@ 140 lb'), 130)
    expect(chipLabels(s)).toEqual(['90 sec rest', 'Done'])
    expect(tap(s, '90 sec rest').lines).toEqual(['4 x 8 Bench Press @ 140 lb, 90 sec rest'])
  })

  it('delete removes typed digits first', () => {
    let s = typeNumber(enter(['4', '4 x 8', 'Bench Press']), 14)
    s = press(s, { type: 'delete' })
    expect(text(s)).toBe('4 x 8 Bench Press 1')
    s = press(press(s, { type: 'delete' }), { type: 'delete' })
    expect([stage(s), text(s)]).toEqual(['GY1', '4 x 8'])
  })
})

describe('gym blocks', () => {
  const press = (state, action) => workoutReducer(state, action)
  const typeNumber = (state, n) => [...String(n)].reduce((s, d) => press(s, { type: 'digit', digit: Number(d) }), state)
  const del = (state) => press(state, { type: 'delete' })
  const stage = (state) => gym.getStage(state.current).id
  const chipLabels = (state) => gym.getSuggestions(state.current).flatMap((g) => g.chips.map((c) => c.label))
  const groupLabels = (state) => gym.getSuggestions(state.current).map((g) => g.label)
  const text = (state) => gym.format(state.current)

  const opened = () => tap(initialState('gym'), 'Start Block')
  const started = () => tap(typeNumber(opened(), 10), '10 Squats')

  // 10 Squats + 10 Push-Ups + 20 Lunges, not yet finished
  const threeItems = () => {
    let s = tap(started(), '+ Add Exercise')
    s = tap(tap(s, '10'), '10 Push-Ups')
    s = tap(typeNumber(tap(s, '+ Add Exercise'), 20), '20 Lunges')
    return s
  }
  const repeated = (label = 'Repeat ×3') => tap(tap(threeItems(), 'Finish Block'), label)

  it('offers Start Block at the start of every line, and not after a number', () => {
    expect(chipLabels(initialState('gym'))).toContain('Start Block')
    expect(chipLabels(typeNumber(initialState('gym'), 3))).not.toContain('Start Block')
    expect(chipLabels(enter(['3', '3 x 10', 'Squats', 'Done']))).toContain('Start Block')
  })

  it('Start Block opens an empty block waiting for the first item', () => {
    const s = opened()
    expect(stage(s)).toBe('BL1')
    expect(text(s)).toBe('(')
    expect(gym.acceptsDigits(s.current)).toBe(true)
    expect(chipLabels(s)).toEqual(['5', '8', '10', '12', '15', '20'])
  })

  it('starts a block with the first exercise', () => {
    const s = started()
    expect(stage(s)).toBe('BL3')
    expect(text(s)).toBe('(10 Squats')
    // Weight chips for the item; a block needs two items before it can be finished.
    expect(chipLabels(s)).toEqual(['@ 95 lb', '@ 135 lb', '@ 185 lb', '@ 225 lb', '+ Add Exercise'])
    expect(s.lines).toEqual([])
  })

  it('adds multiple exercises to the same block', () => {
    let s = tap(started(), '+ Add Exercise')
    expect(stage(s)).toBe('BL1')
    s = tap(s, '10')
    expect(stage(s)).toBe('BL2')
    expect(chipLabels(s)).toContain('10 Push-Ups')

    s = threeItems()
    expect(text(s)).toBe('(10 Squats + 10 Push-Ups + 20 Lunges')
    expect(chipLabels(s)).toEqual(['+ Add Exercise', 'Finish Block'])
  })

  it('adds a weight to a block item', () => {
    let s = tap(started(), '@ 95 lb')
    expect(text(s)).toBe('(10 Squats @ 95 lb')
    expect(chipLabels(s)).toEqual(['+ Add Exercise'])
    s = tap(tap(tap(s, '+ Add Exercise'), '10'), '10 Push-Ups')
    s = tap(tap(tap(s, 'Finish Block'), 'Repeat ×2'), 'Done')
    expect(s.lines).toEqual(['2 × (10 Squats @ 95 lb + 10 Push-Ups)'])
  })

  it('finishing a block offers the repeat options', () => {
    const s = tap(threeItems(), 'Finish Block')
    expect(stage(s)).toBe('BL4')
    expect(chipLabels(s)).toEqual(['Repeat ×2', 'Repeat ×3', 'Repeat ×4'])
    expect(text(s)).toBe('(10 Squats + 10 Push-Ups + 20 Lunges)')
  })

  it('types a custom repeat count, then taps it', () => {
    let s = typeNumber(tap(threeItems(), 'Finish Block'), 12)
    expect(stage(s)).toBe('BL4')
    expect(text(s)).toBe('(10 Squats + 10 Push-Ups + 20 Lunges) 12')
    expect(chipLabels(s)).toEqual(['Repeat ×12'])
    s = del(s)
    expect(chipLabels(s)).toEqual(['Repeat ×1'])
    s = tap(tap(typeNumber(del(s), 6), 'Repeat ×6'), 'Done')
    expect(s.lines).toEqual(['6 × (10 Squats + 10 Push-Ups + 20 Lunges)'])
  })

  it('types a custom weight for a block item', () => {
    const s = typeNumber(started(), 105)
    expect(chipLabels(s)).toEqual(['@ 105 lb', '+ Add Exercise'])
    expect(text(tap(s, '@ 105 lb'))).toBe('(10 Squats @ 105 lb')
  })

  it('types a custom block rest', () => {
    const s = tap(typeNumber(repeated(), 45), '45 sec rest')
    expect(s.lines).toEqual(['3 × (10 Squats + 10 Push-Ups + 20 Lunges), 45 sec rest'])
  })

  it('applying a repetition then Done commits the grouped block', () => {
    let s = repeated()
    expect(stage(s)).toBe('BL5')
    expect(text(s)).toBe('3 × (10 Squats + 10 Push-Ups + 20 Lunges)')
    expect(chipLabels(s)).toEqual(['30 sec rest', '60 sec rest', '90 sec rest', '2 min rest', '3 min rest', 'Done'])
    s = tap(s, 'Done')
    expect(s.lines).toEqual(['3 × (10 Squats + 10 Push-Ups + 20 Lunges)'])
    expect(s.current).toEqual(gym.emptyEntry())
    expect(stage(s)).toBe('S0')
  })

  it('a block rest commits the block', () => {
    const s = tap(repeated(), '90 sec rest')
    expect(s.lines).toEqual(['3 × (10 Squats + 10 Push-Ups + 20 Lunges), 90 sec rest'])
  })

  it('a block can follow a normal set in the same workout', () => {
    let s = enter(['4', '4 x 8', 'Bench Press', '@ 135 lb', 'Done', 'Start Block', '10', '10 Squats'])
    s = tap(tap(tap(s, '+ Add Exercise'), '10'), '10 Push-Ups')
    s = tap(tap(tap(s, 'Finish Block'), 'Repeat ×2'), 'Done')
    expect(s.lines).toEqual(['4 x 8 Bench Press @ 135 lb', '2 × (10 Squats + 10 Push-Ups)'])
  })

  it('deletes back through a block one slot at a time', () => {
    let s = repeated()
    const expected = [
      ['BL4', '(10 Squats + 10 Push-Ups + 20 Lunges)'],
      ['BL3', '(10 Squats + 10 Push-Ups + 20 Lunges'],
      ['BL2', '(10 Squats + 10 Push-Ups + 20'],
      ['BL2', '(10 Squats + 10 Push-Ups + 2'],
      ['BL1', '(10 Squats + 10 Push-Ups + '],
      ['BL3', '(10 Squats + 10 Push-Ups'],
      ['BL2', '(10 Squats + 10'],
      ['BL2', '(10 Squats + 1'],
      ['BL1', '(10 Squats + '],
      ['BL3', '(10 Squats'],
      ['BL2', '(10'],
      ['BL2', '(1'],
      ['BL1', '('],
      // Deleting the empty block closes it.
      ['S0', ''],
    ]
    for (const step of expected) {
      s = del(s)
      expect([stage(s), text(s)]).toEqual(step)
    }
    expect(s).toEqual(initialState('gym'))
  })

  it('delete removes an item weight before its exercise', () => {
    const s = del(tap(started(), '@ 135 lb'))
    expect([stage(s), text(s)]).toEqual(['BL3', '(10 Squats'])
  })

  it('typing while adding an item edits its reps', () => {
    const s = typeNumber(tap(started(), '+ Add Exercise'), 15)
    expect(text(s)).toBe('(10 Squats + 15')
    expect(chipLabels(s)).toContain('15 Lunges')
  })

  it('delete on an empty line removes the committed block', () => {
    let s = tap(repeated('Repeat ×4'), 'Done')
    s = del(tap(s, 'Start Block'))
    expect(s.lines).toEqual(['4 × (10 Squats + 10 Push-Ups + 20 Lunges)'])
    expect(stage(s)).toBe('S0')
    s = del(s)
    expect(s.lines).toEqual([])
  })

  it('reset clears a block in progress', () => {
    const s = press(repeated(), { type: 'reset' })
    expect(s).toEqual(initialState('gym'))
    expect(enter(['3', '3 x 10', 'Squats', 'Done']).lines).toEqual(['3 x 10 Squats'])
  })

  it('switching sport mid-block starts a fresh workout', () => {
    const s = press(threeItems(), { type: 'sport', sport: 'swim' })
    expect(s).toEqual(initialState('swim'))
  })
})
