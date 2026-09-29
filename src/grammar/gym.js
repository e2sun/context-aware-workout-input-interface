// Gym set grammar: Sets x Reps Exercise [Weight] [Rest]
// Stages and transitions follow docs/grammar.md section 6 (S0, S1, GY1–GY3).
// Exports the same shape as swim.js (see grammar/index.js).

import { SETS, REPS_CHIPS, EXERCISES, WEIGHTS_BY_EXERCISE, RESTS } from './gymVocab.js'
import { formatRest } from './format.js'

const MAX_SETS = 99

export function emptyEntry() {
  return { sets: null, reps: null, exercise: null, weight: null, rest: null }
}

export function getStage(e) {
  if (e.sets === null) return { id: 'S0', prompt: 'Sets' }
  if (e.reps === null) return { id: 'S1', prompt: 'Reps' }
  if (e.exercise === null) return { id: 'GY1', prompt: 'Exercise' }
  if (e.weight === null) return { id: 'GY2', prompt: 'Weight or rest' }
  return { id: 'GY3', prompt: 'Rest' }
}

const done = { label: 'Done', patch: {}, commit: true, kind: 'done' }

const restGroup = {
  label: 'Rest',
  chips: RESTS.map((s) => ({ label: `${formatRest(s)} rest`, patch: { rest: s }, commit: true })),
}

export function getSuggestions(e) {
  switch (getStage(e).id) {
    case 'S0':
      return [{ label: 'Sets', chips: SETS.map((n) => ({ label: String(n), patch: { sets: n } })) }]
    case 'S1':
      return [
        {
          label: 'Reps',
          chips: REPS_CHIPS.map((r) => ({ label: `${e.sets} x ${r}`, patch: { reps: r } })),
        },
      ]
    case 'GY1':
      return [{ label: 'Exercise', chips: EXERCISES.map((x) => ({ label: x, patch: { exercise: x } })) }]
    case 'GY2': {
      const weights = WEIGHTS_BY_EXERCISE[e.exercise] ?? []
      const weightGroup = {
        label: 'Weight',
        chips: weights.map((w) => ({ label: `@ ${w} lb`, patch: { weight: w } })),
      }
      return [...(weights.length ? [weightGroup] : []), restGroup, { label: null, chips: [done] }]
    }
    case 'GY3':
      return [restGroup, { label: null, chips: [done] }]
    default:
      return []
  }
}

// The number pad edits the sets while the user is at S0 or S1.
export function acceptsDigits(e) {
  return e.reps === null
}

export function typeDigit(e, digit) {
  if (!acceptsDigits(e)) return e
  const sets = (e.sets ?? 0) * 10 + digit
  if (sets === 0 || sets > MAX_SETS) return e
  return { ...e, sets }
}

export function deleteLast(e) {
  if (e.weight !== null) return { ...e, weight: null }
  if (e.exercise !== null) return { ...e, exercise: null }
  if (e.reps !== null) return { ...e, reps: null }
  if (e.sets !== null) return { ...e, sets: e.sets >= 10 ? Math.floor(e.sets / 10) : null }
  return e
}

export function isEmpty(e) {
  return e.sets === null
}

// "4 x 8 Bench Press @ 135 lb" / "4 x 5 Deadlift @ 185 lb, 2 min rest"
export function format(e) {
  if (e.sets === null) return ''
  let text = String(e.sets)
  if (e.reps !== null) text += ` x ${e.reps}`
  if (e.exercise !== null) text += ` ${e.exercise}`
  if (e.weight !== null) text += ` @ ${e.weight} lb`
  if (e.rest !== null) text += `, ${formatRest(e.rest)} rest`
  return text
}
