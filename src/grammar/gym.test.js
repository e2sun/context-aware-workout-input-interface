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
