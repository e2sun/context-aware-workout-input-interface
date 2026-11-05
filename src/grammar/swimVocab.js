// Swim suggestion chips and the rules that order them — see docs/grammar.md
// sections 2, 3 and 8. Times are stored in seconds and formatted in format.js.
//
// The grammar asks for chips with the *For() functions below. To tune a
// prediction, edit the tables; every list is reordered with rankFirst or
// closestFirst, so a preset is never dropped.

import { closestFirst, inBand, rankFirst } from './rank.js'

// Most common first; no context exists yet at the start of a line.
export const REPS = [4, 8, 6, 10, 2, 3, 12, 16, 1]

// Distance chips that start a single-swim block item, e.g. `100 Free`.
export const SINGLE_DISTANCES = [100, 200, 300, 400, 500]

const DISTANCE_CHIPS = [25, 50, 100, 200]

const STROKES = ['Free', 'Back', 'Breast', 'Fly', 'IM', 'Kick', 'Pull', 'Drill', 'Choice']

const EFFORTS = ['Easy', 'Moderate', 'Fast', 'Sprint', 'Build', 'Descend']

const EQUIPMENT = ['Fins', 'Paddles', 'Snorkel', 'Pull Buoy', 'Kickboard']

const RESTS = [10, 15, 20, 30]

const INTERVALS_BY_DISTANCE = {
  25: [25, 30, 35, 40],
  50: [40, 45, 50, 55, 60],
  75: [65, 70, 75, 80],
  100: [90, 100, 105, 120],
  150: [135, 150, 165],
  200: [165, 180, 195, 210],
  300: [240, 270, 300],
  400: [330, 360, 390],
  500: [420, 450, 480, 510],
}

// More reps usually means a shorter distance.
const DISTANCES_BY_REPS = [
  [2, [200, 100, 50, 25]],
  [4, [100, 200, 50, 25]],
  [8, [50, 100, 25, 200]],
  [Infinity, [25, 50, 100, 200]],
]

// IM needs four lengths and Fly is rarely swum long, so each sinks where it is unlikely.
const STROKES_BY_DISTANCE = [
  [25, ['Free', 'Kick', 'Fly', 'Drill', 'Back', 'Breast', 'Pull', 'Choice', 'IM']],
  [50, ['Free', 'Kick', 'Back', 'Breast', 'Fly', 'Drill', 'Pull', 'Choice', 'IM']],
  [150, ['Free', 'IM', 'Kick', 'Pull', 'Back', 'Breast', 'Drill', 'Choice', 'Fly']],
  [Infinity, ['Free', 'Pull', 'IM', 'Choice', 'Kick', 'Back', 'Breast', 'Drill', 'Fly']],
]

const EFFORTS_BY_DISTANCE = [
  [50, ['Fast', 'Sprint', 'Build', 'Moderate', 'Easy', 'Descend']],
  [150, ['Moderate', 'Fast', 'Descend', 'Build', 'Easy', 'Sprint']],
  [Infinity, ['Moderate', 'Build', 'Descend', 'Easy', 'Fast', 'Sprint']],
]

// Technique work is swum slowly whatever the distance.
const EFFORTS_BY_STROKE = {
  Drill: ['Easy', 'Moderate'],
  Choice: ['Easy', 'Moderate'],
}

// Strokes not listed here keep the EQUIPMENT order.
const EQUIPMENT_BY_STROKE = {
  Free: ['Paddles', 'Fins', 'Snorkel'],
  Back: ['Fins', 'Paddles'],
  Breast: ['Snorkel', 'Paddles', 'Pull Buoy', 'Kickboard'],
  Kick: ['Kickboard', 'Fins'],
  Pull: ['Pull Buoy', 'Paddles', 'Snorkel'],
  Drill: ['Fins', 'Snorkel'],
}

const RESTS_BY_DISTANCE = [
  [50, [15, 10, 20, 30]],
  [100, [15, 20, 10, 30]],
  [200, [20, 15, 30, 10]],
  [Infinity, [30, 20, 15, 10]],
]

// The most likely interval is estimated as distance x Free pace x stroke x effort x equipment.
const FREE_SECONDS_PER_YARD = 0.9

// Send-off time relative to Free.
const STROKE_PACE = {
  Free: 1,
  Back: 1.1,
  Breast: 1.2,
  Fly: 1.25,
  IM: 1.15,
  Kick: 1.35,
  Pull: 1,
  Drill: 1.4,
  Choice: 1.1,
}

// These scale the send-off, not swim speed: harder efforts need more recovery.
const EFFORT_PACE = {
  Easy: 1.1,
  Moderate: 1,
  Fast: 1.05,
  Sprint: 1.25,
  Build: 1.05,
  Descend: 1.1,
}

// Send-off time with equipment that makes a swimmer faster. Anything else is 1.
const EQUIPMENT_PACE = {
  Fins: 0.9,
  Paddles: 0.95,
}

// Intervals are rounded to what a pace clock makes easy to read.
const INTERVAL_STEPS = [
  [100, 5],
  [200, 15],
  [Infinity, 30],
]

export function distancesFor(reps) {
  return rankFirst(inBand(DISTANCES_BY_REPS, reps), DISTANCE_CHIPS)
}

export function strokesFor(distance) {
  return rankFirst(inBand(STROKES_BY_DISTANCE, distance), STROKES)
}

export function effortsFor({ distance, stroke }) {
  const byDistance = rankFirst(inBand(EFFORTS_BY_DISTANCE, distance), EFFORTS)
  return rankFirst(EFFORTS_BY_STROKE[stroke] ?? [], byDistance)
}

export function equipmentFor(stroke) {
  return rankFirst(EQUIPMENT_BY_STROKE[stroke] ?? [], EQUIPMENT)
}

// The presets for this distance, plus the estimated interval, closest to the
// estimate first. A distance without presets gets the estimate and a step either side.
export function intervalsFor({ distance, stroke, effort, equipment }) {
  const target =
    distance *
    FREE_SECONDS_PER_YARD *
    (STROKE_PACE[stroke] ?? 1) *
    (EFFORT_PACE[effort] ?? 1) *
    (EQUIPMENT_PACE[equipment] ?? 1)
  const step = inBand(INTERVAL_STEPS, distance)
  const estimate = Math.round(target / step) * step
  const presets = INTERVALS_BY_DISTANCE[distance] ?? [estimate - step, estimate + step]
  return closestFirst([...new Set([estimate, ...presets])].filter((s) => s > 0), target)
}

export function restsFor({ distance, effort }) {
  const byDistance = rankFirst(inBand(RESTS_BY_DISTANCE, distance), RESTS)
  return effort === 'Sprint' ? rankFirst([30, 20], byDistance) : byDistance
}

// Rest after a whole block: one round counts as a single long swim, and any
// sprint inside it calls for the sprint rests.
export function blockRestsFor(items) {
  return restsFor({
    distance: items.reduce((yards, i) => yards + (i.reps ?? 1) * i.distance, 0),
    effort: items.some((i) => i.effort === 'Sprint') ? 'Sprint' : null,
  })
}
