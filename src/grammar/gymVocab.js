// Gym suggestion chips and the rules that order them — see docs/grammar.md
// sections 2, 4 and 8. Rest times are stored in seconds and formatted in format.js.
//
// The grammar asks for chips with the *For() functions below. Reps are entered
// before the exercise, so reps rank the exercises, and reps plus exercise rank
// the weights and rests. To tune a prediction, edit the tables; every list is
// reordered with rankFirst or closestFirst, so a preset is never dropped.

import { closestFirst, inBand, rankFirst } from './rank.js'

// Most common first; no context exists yet at the start of a line.
export const SETS = [3, 4, 5, 2]

// Reps chips for a block item after `+ Add Exercise`.
export const BLOCK_REPS = [10, 12, 15, 8, 20, 5]

// A typed number above this is more likely reps ("10 Push-Ups") than sets.
export const MAX_LIKELY_SETS = 6

const REPS_CHIPS = [5, 8, 10, 12]

const EXERCISES = [
  'Bench Press',
  'Squats',
  'Deadlift',
  'Shoulder Press',
  'Push-Ups',
  'Lunges',
  'Pull-Ups',
  'Rows',
  'Bicep Curls',
  'Sit-Ups',
]

// Exercises not listed here are bodyweight: no weight chips are offered.
const WEIGHTS_BY_EXERCISE = {
  'Bench Press': [95, 115, 135, 155, 185],
  Squats: [95, 135, 185, 225],
  Deadlift: [135, 185, 225, 275],
  'Shoulder Press': [15, 20, 25, 30, 45],
  Rows: [15, 20, 25, 30],
  'Bicep Curls': [15, 20, 25, 30],
}

const RESTS = [30, 60, 90, 120, 180]

const REPS_BY_SETS = [
  [3, [10, 12, 8, 5]],
  [4, [8, 10, 12, 5]],
  [5, [5, 8, 10, 12]],
  [Infinity, [10, 8, 12, 5]],
]

// Low reps suggest heavy lifts; high reps suggest bodyweight and accessory work.
const EXERCISES_BY_REPS = [
  [6, ['Deadlift', 'Squats', 'Bench Press', 'Shoulder Press', 'Rows', 'Pull-Ups', 'Bicep Curls', 'Lunges', 'Push-Ups', 'Sit-Ups']],
  [12, ['Bench Press', 'Squats', 'Rows', 'Shoulder Press', 'Pull-Ups', 'Deadlift', 'Lunges', 'Bicep Curls', 'Push-Ups', 'Sit-Ups']],
  [Infinity, ['Push-Ups', 'Sit-Ups', 'Lunges', 'Bicep Curls', 'Squats', 'Rows', 'Shoulder Press', 'Bench Press', 'Pull-Ups', 'Deadlift']],
]

// Where the likely weight sits between an exercise's lightest (0) and heaviest
// (1) preset: fewer reps means a heavier load.
const WEIGHT_POSITION_BY_REPS = [
  [5, 0.75],
  [10, 0.5],
  [Infinity, 0.25],
]

// Rest order for each tier, from simple exercises (0) to the heaviest lifts (3).
const RESTS_BY_TIER = [
  [60, 30, 90, 120, 180],
  [90, 60, 120, 30, 180],
  [120, 180, 90, 60, 30],
  [180, 120, 90, 60, 30],
]

const REST_TIER_BY_EXERCISE = {
  Deadlift: 3,
  Squats: 2,
  'Bench Press': 2,
  'Shoulder Press': 1,
  Rows: 1,
  'Pull-Ups': 1,
  Lunges: 1,
  'Bicep Curls': 0,
  'Push-Ups': 0,
  'Sit-Ups': 0,
}

const DEFAULT_REST_TIER = 1

// Reps move an exercise up or down one tier.
const REST_TIER_SHIFT_BY_REPS = [
  [5, 1],
  [14, 0],
  [Infinity, -1],
]

export function repsFor(sets) {
  return rankFirst(inBand(REPS_BY_SETS, sets), REPS_CHIPS)
}

// `used` lists exercises already in this block; a circuit rarely repeats one,
// so they go last.
export function exercisesFor(reps, used = []) {
  const likely = inBand(EXERCISES_BY_REPS, reps).filter((x) => !used.includes(x))
  return rankFirst(likely, EXERCISES)
}

export function weightsFor({ exercise, reps }) {
  const presets = WEIGHTS_BY_EXERCISE[exercise] ?? []
  const lightest = presets[0]
  const heaviest = presets[presets.length - 1]
  return closestFirst(presets, lightest + inBand(WEIGHT_POSITION_BY_REPS, reps) * (heaviest - lightest))
}

function restTier({ exercise, reps }) {
  const tier = (REST_TIER_BY_EXERCISE[exercise] ?? DEFAULT_REST_TIER) + inBand(REST_TIER_SHIFT_BY_REPS, reps)
  return Math.min(Math.max(tier, 0), RESTS_BY_TIER.length - 1)
}

export function restsFor(set) {
  return blockRestsFor([set])
}

// A block rests according to its most demanding item.
export function blockRestsFor(items) {
  return rankFirst(RESTS_BY_TIER[Math.max(...items.map(restTier))], RESTS)
}
