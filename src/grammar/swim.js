// Swim set grammar: Reps x Distance Stroke [Effort] [Interval | Rest]
// Stages and transitions follow docs/grammar.md section 6 (S0, S1, SW1–SW3).
//
// Every sport grammar exports the same shape (see grammar/index.js):
//   emptyEntry, getStage, getSuggestions, acceptsDigits, typeDigit, deleteLast, format

import { REPS, DISTANCE_CHIPS, STROKES, EFFORTS, INTERVALS_BY_DISTANCE, RESTS } from './swimVocab.js'
import { formatInterval, formatRest } from './format.js'

const MAX_REPS = 99

export function emptyEntry() {
  return { reps: null, distance: null, stroke: null, effort: null, interval: null, rest: null }
}

// The stage is derived from which slots are filled, so there is no separate
// stage variable to keep in sync.
export function getStage(e) {
  if (e.reps === null) return { id: 'S0', prompt: 'Reps' }
  if (e.distance === null) return { id: 'S1', prompt: 'Distance' }
  if (e.stroke === null) return { id: 'SW1', prompt: 'Stroke' }
  if (e.effort === null) return { id: 'SW2', prompt: 'Effort, interval or rest' }
  return { id: 'SW3', prompt: 'Interval or rest' }
}

// A chip is { label, patch, commit }. Tapping it merges `patch` into the entry;
// `commit` means the line is finished and added to the workout.
const done = { label: 'Done', patch: {}, commit: true, kind: 'done' }

function intervalAndRestGroups(e) {
  const intervals = INTERVALS_BY_DISTANCE[e.distance] ?? []
  return [
    {
      label: 'Interval',
      chips: intervals.map((s) => ({ label: `@ ${formatInterval(s)}`, patch: { interval: s }, commit: true })),
    },
    {
      label: 'Rest',
      chips: RESTS.map((s) => ({ label: `${formatRest(s)} rest`, patch: { rest: s }, commit: true })),
    },
  ]
}

// Returns the prediction strip for the current stage as labelled groups of chips.
export function getSuggestions(e) {
  switch (getStage(e).id) {
    case 'S0':
      return [{ label: 'Reps', chips: REPS.map((n) => ({ label: String(n), patch: { reps: n } })) }]
    case 'S1':
      return [
        {
          label: 'Distance',
          chips: DISTANCE_CHIPS.map((d) => ({ label: `${e.reps} x ${d}`, patch: { distance: d } })),
        },
      ]
    case 'SW1':
      return [{ label: 'Stroke', chips: STROKES.map((s) => ({ label: s, patch: { stroke: s } })) }]
    case 'SW2':
      return [
        { label: 'Effort', chips: EFFORTS.map((s) => ({ label: s, patch: { effort: s } })) },
        ...intervalAndRestGroups(e),
        { label: null, chips: [done] },
      ]
    case 'SW3':
      return [...intervalAndRestGroups(e), { label: null, chips: [done] }]
    default:
      return []
  }
}

// The number pad edits the reps while the user is at S0 or S1.
export function acceptsDigits(e) {
  return e.distance === null
}

export function typeDigit(e, digit) {
  if (!acceptsDigits(e)) return e
  const reps = (e.reps ?? 0) * 10 + digit
  if (reps === 0 || reps > MAX_REPS) return e
  return { ...e, reps }
}

// Removes the most recent slot (or the last digit of the reps).
export function deleteLast(e) {
  if (e.effort !== null) return { ...e, effort: null }
  if (e.stroke !== null) return { ...e, stroke: null }
  if (e.distance !== null) return { ...e, distance: null }
  if (e.reps !== null) return { ...e, reps: e.reps >= 10 ? Math.floor(e.reps / 10) : null }
  return e
}

export function isEmpty(e) {
  return e.reps === null
}

// "8 x 50 Free Sprint @ :45" / "4 x 50 Kick, 15 sec rest"
export function format(e) {
  if (e.reps === null) return ''
  let text = String(e.reps)
  if (e.distance !== null) text += ` x ${e.distance}`
  if (e.stroke !== null) text += ` ${e.stroke}`
  if (e.effort !== null) text += ` ${e.effort}`
  if (e.interval !== null) text += ` @ ${formatInterval(e.interval)}`
  if (e.rest !== null) text += `, ${formatRest(e.rest)} rest`
  return text
}
