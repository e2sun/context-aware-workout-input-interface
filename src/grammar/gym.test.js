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
    expect(weights.chips.map((c) => c.label)).toEqual(['@ 225 lb', '@ 275 lb', '@ 185 lb', '@ 135 lb'])
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

  // A block is entered as written: the rounds, then `n × (`.
  const opened = (n = 3) => tap(typeNumber(initialState('gym'), n), `${n} × (`)
  const started = (n = 3) => tap(typeNumber(opened(n), 10), '10 Squats')

  // 3 × (10 Squats + 10 Push-Ups + 20 Lunges, not yet finished
  const threeItems = (n = 3) => {
    let s = tap(started(n), '+ Add Exercise')
    s = tap(tap(s, '10'), '10 Push-Ups')
    s = tap(typeNumber(tap(s, '+ Add Exercise'), 20), '20 Lunges')
    return s
  }
  const finished = (n = 3) => tap(threeItems(n), 'Finish Block')

  it('offers n × ( after the first number, and nothing at line start', () => {
    expect(groupLabels(initialState('gym'))).toEqual(['Sets'])
    expect(chipLabels(typeNumber(initialState('gym'), 3))).toContain('3 × (')
    expect(chipLabels(tap(initialState('gym'), '3'))).toContain('3 × (')
    expect(chipLabels(typeNumber(initialState('gym'), 21)).join()).not.toContain('×')
  })

  it('n × ( opens an empty block waiting for the first item', () => {
    const s = opened()
    expect(stage(s)).toBe('BL1')
    expect(text(s)).toBe('3 × (')
    expect(gym.acceptsDigits(s.current)).toBe(true)
    expect(chipLabels(s)).toEqual(['10', '12', '15', '8', '20', '5'])
  })

  it('starts a block with the first exercise', () => {
    const s = started()
    expect(stage(s)).toBe('BL3')
    expect(text(s)).toBe('3 × (10 Squats')
    // Weight chips for the item; a block needs two items before it can be finished.
    expect(chipLabels(s)).toEqual(['@ 135 lb', '@ 185 lb', '@ 95 lb', '@ 225 lb', '+ Add Exercise'])
    expect(s.lines).toEqual([])
  })

  it('adds multiple exercises to the same block', () => {
    let s = tap(started(), '+ Add Exercise')
    expect(stage(s)).toBe('BL1')
    s = tap(s, '10')
    expect(stage(s)).toBe('BL2')
    expect(chipLabels(s)).toContain('10 Push-Ups')

    s = threeItems()
    expect(text(s)).toBe('3 × (10 Squats + 10 Push-Ups + 20 Lunges')
    expect(chipLabels(s)).toEqual(['+ Add Exercise', 'Finish Block'])
  })

  it('adds a weight to a block item', () => {
    let s = tap(started(2), '@ 95 lb')
    expect(text(s)).toBe('2 × (10 Squats @ 95 lb')
    expect(chipLabels(s)).toEqual(['+ Add Exercise'])
    s = tap(tap(tap(s, '+ Add Exercise'), '10'), '10 Push-Ups')
    s = tap(tap(s, 'Finish Block'), 'Done')
    expect(s.lines).toEqual(['2 × (10 Squats @ 95 lb + 10 Push-Ups)'])
  })

  it('finishing a block goes straight to the rest', () => {
    const s = finished()
    expect([stage(s), text(s)]).toEqual(['BL4', '3 × (10 Squats + 10 Push-Ups + 20 Lunges)'])
    expect(chipLabels(s)).toEqual(['2 min rest', '3 min rest', '90 sec rest', '60 sec rest', '30 sec rest', 'Done'])
  })

  it('a typed round count becomes the block', () => {
    const s = tap(typeNumber(initialState('gym'), 12), '12 × (')
    expect(text(s)).toBe('12 × (')
    const done = ['10', '10 Push-Ups', '+ Add Exercise', '10', '10 Sit-Ups', 'Finish Block', 'Done'].reduce(tap, s)
    expect(done.lines).toEqual(['12 × (10 Push-Ups + 10 Sit-Ups)'])
  })

  it('types a custom weight for a block item', () => {
    const s = typeNumber(started(), 105)
    expect(chipLabels(s)).toEqual(['@ 105 lb', '+ Add Exercise'])
    expect(text(tap(s, '@ 105 lb'))).toBe('3 × (10 Squats @ 105 lb')
  })

  it('types a custom block rest', () => {
    const s = tap(typeNumber(finished(), 45), '45 sec rest')
    expect(s.lines).toEqual(['3 × (10 Squats + 10 Push-Ups + 20 Lunges), 45 sec rest'])
  })

  it('Done commits the block without a rest', () => {
    const s = tap(finished(), 'Done')
    expect(s.lines).toEqual(['3 × (10 Squats + 10 Push-Ups + 20 Lunges)'])
    expect(s.current).toEqual(gym.emptyEntry())
    expect(stage(s)).toBe('S0')
  })

  it('a block rest commits the block', () => {
    const s = tap(finished(), '90 sec rest')
    expect(s.lines).toEqual(['3 × (10 Squats + 10 Push-Ups + 20 Lunges), 90 sec rest'])
  })

  it('a block can follow a normal set in the same workout', () => {
    let s = enter(['4', '4 x 8', 'Bench Press', '@ 135 lb', 'Done', '2', '2 × (', '10', '10 Squats'])
    s = tap(tap(tap(s, '+ Add Exercise'), '10'), '10 Push-Ups')
    s = tap(tap(s, 'Finish Block'), 'Done')
    expect(s.lines).toEqual(['4 x 8 Bench Press @ 135 lb', '2 × (10 Squats + 10 Push-Ups)'])
  })

  it('deletes back through a block one slot at a time, then to n x', () => {
    let s = finished()
    const expected = [
      ['BL3', '3 × (10 Squats + 10 Push-Ups + 20 Lunges'],
      ['BL2', '3 × (10 Squats + 10 Push-Ups + 20'],
      ['BL2', '3 × (10 Squats + 10 Push-Ups + 2'],
      ['BL1', '3 × (10 Squats + 10 Push-Ups + '],
      ['BL3', '3 × (10 Squats + 10 Push-Ups'],
      ['BL2', '3 × (10 Squats + 10'],
      ['BL2', '3 × (10 Squats + 1'],
      ['BL1', '3 × (10 Squats + '],
      ['BL3', '3 × (10 Squats'],
      ['BL2', '3 × (10'],
      ['BL2', '3 × (1'],
      ['BL1', '3 × ('],
      // Deleting the empty block goes back to the rounds as "3 x".
      ['S2', '3 x'],
      ['S1', '3'],
      ['S0', ''],
    ]
    for (const step of expected) {
      s = del(s)
      expect([stage(s), text(s)]).toEqual(step)
    }
    expect(s).toEqual(initialState('gym'))
  })

  it('after deleting the empty block, 3 x can become a normal set', () => {
    const s = del(opened())
    expect(tap(tap(typeNumber(s, 12), 'Squats'), 'Done').lines).toEqual(['3 x 12 Squats'])
  })

  it('delete removes an item weight before its exercise', () => {
    const s = del(tap(started(), '@ 135 lb'))
    expect([stage(s), text(s)]).toEqual(['BL3', '3 × (10 Squats'])
  })

  it('typing while adding an item edits its reps', () => {
    const s = typeNumber(tap(started(), '+ Add Exercise'), 15)
    expect(text(s)).toBe('3 × (10 Squats + 15')
    expect(chipLabels(s)).toContain('15 Lunges')
  })

  it('delete on an empty line removes the committed block', () => {
    let s = tap(finished(4), 'Done')
    s = del(del(del(tap(tap(s, '3'), '3 × ('))))
    expect(s.lines).toEqual(['4 × (10 Squats + 10 Push-Ups + 20 Lunges)'])
    expect(stage(s)).toBe('S0')
    s = del(s)
    expect(s.lines).toEqual([])
  })

  it('reset clears a block in progress', () => {
    const s = press(finished(), { type: 'reset' })
    expect(s).toEqual(initialState('gym'))
    expect(enter(['3', '3 x 10', 'Squats', 'Done']).lines).toEqual(['3 x 10 Squats'])
  })

  it('switching sport mid-block starts a fresh workout', () => {
    const s = press(threeItems(), { type: 'sport', sport: 'swim' })
    expect(s).toEqual(initialState('swim'))
  })
})

describe('gym @ key', () => {
  const press = (state, action) => workoutReducer(state, action)
  const typeNumber = (state, n) => [...String(n)].reduce((s, d) => press(s, { type: 'digit', digit: Number(d) }), state)
  const at = (state) => press(state, { type: 'at' })
  const del = (state) => press(state, { type: 'delete' })
  const chipLabels = (state) => gym.getSuggestions(state.current).flatMap((g) => g.chips.map((c) => c.label))
  const text = (state) => gym.format(state.current)

  it('types a weight that is not a preset: 4 x 8 Bench Press @ 140 lb', () => {
    let s = at(enter(['4', '4 x 8', 'Bench Press']))
    expect(text(s)).toBe('4 x 8 Bench Press @')
    expect(gym.getStage(s.current).prompt).toBe('Weight')
    expect(chipLabels(s)).toEqual(['@ 135 lb', '@ 155 lb', '@ 115 lb', '@ 95 lb', '@ 185 lb'])
    s = typeNumber(s, 140)
    expect(text(s)).toBe('4 x 8 Bench Press @ 140 lb')
    expect(chipLabels(s)).toEqual(['@ 140 lb'])
    s = tap(s, '@ 140 lb')
    expect(gym.getStage(s.current).id).toBe('GY3')
    expect(tap(s, '2 min rest').lines).toEqual(['4 x 8 Bench Press @ 140 lb, 2 min rest'])
  })

  it('is offered only between the exercise and the weight', () => {
    expect(gym.acceptsAt(enter(['4', '4 x 8']).current)).toBe(false)
    expect(gym.acceptsAt(enter(['4', '4 x 8', 'Bench Press']).current)).toBe(true)
    expect(gym.acceptsAt(enter(['4', '4 x 8', 'Bench Press', '@ 135 lb']).current)).toBe(false)
  })

  it('works for bodyweight exercises, which have no presets', () => {
    const s = at(enter(['3', '3 x 10', 'Push-Ups']))
    expect(chipLabels(s)).toEqual([])
    expect(chipLabels(typeNumber(s, 25))).toEqual(['@ 25 lb'])
  })

  it('delete removes digits, then the @', () => {
    let s = typeNumber(at(enter(['4', '4 x 8', 'Bench Press'])), 14)
    for (const step of ['4 x 8 Bench Press @ 1 lb', '4 x 8 Bench Press @', '4 x 8 Bench Press']) {
      s = del(s)
      expect(text(s)).toBe(step)
    }
  })

  it('works on a block item', () => {
    let s = typeNumber(at(enter(['3', '3 × (', '10', '10 Squats'])), 105)
    expect(text(s)).toBe('3 × (10 Squats @ 105 lb')
    expect(chipLabels(s)).toEqual(['@ 105 lb'])
    s = tap(s, '@ 105 lb')
    expect(chipLabels(s)).toEqual(['+ Add Exercise'])
  })
})
