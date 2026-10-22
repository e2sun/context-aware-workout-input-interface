// Gym set grammar: [Sets x] Reps Exercise [Weight] [Rest]
// or a block: Rounds × (Reps Exercise [Weight] + ...) [Rest]
// Stages and transitions follow docs/grammar.md section 6 (S0–S2, GY1–GY3, BL1–BL5).
// Exports the same shape as swim.js (see grammar/index.js).

import { SETS, REPS_CHIPS, EXERCISES, WEIGHTS_BY_EXERCISE, RESTS, BLOCK_REPS } from './gymVocab.js'
import { formatRest } from './format.js'
import { appendDigit, dropDigit, numberChoices, timeChoices, finishGroups } from './number.js'
import * as block from './block.js'

// `typed` is the number being typed for a later slot (see number.js), `times`
// is set by the × key, and `block` is null for a normal set.
export function emptyEntry() {
  return { sets: null, reps: null, exercise: null, weight: null, rest: null, times: false, typed: null, block: null }
}

// The first typed number is held in `sets` until a chip decides what it is:
// `n x r` keeps it as sets, `n Exercise` moves it to `reps` for a single set
// ("20 Push-Ups", sets stays null).
const hasNumber = (e) => e.sets !== null || e.reps !== null

// "10 Squats @ 95 lb"
function formatItem(i) {
  if (i.reps === null) return ''
  let text = String(i.reps)
  if (i.exercise !== null) text += ` ${i.exercise}`
  if (i.weight !== null) text += ` @ ${i.weight} lb`
  return text
}

function weightGroup(exercise, typed) {
  return {
    label: 'Weight',
    chips: numberChoices(typed, WEIGHTS_BY_EXERCISE[exercise] ?? []).map((w) => ({
      label: `@ ${w} lb`,
      patch: { weight: w },
    })),
  }
}

// Block item: Reps Exercise [Weight], e.g. "10 Squats @ 95 lb"
const blockItem = {
  emptyItem: () => ({ reps: null, exercise: null, weight: null }),
  itemStage(i) {
    if (i.reps === null) return { id: 'BL1', prompt: 'Reps' }
    if (i.exercise === null) return { id: 'BL2', prompt: 'Exercise' }
    return null
  },
  itemSuggestions(i, typed) {
    if (i.reps === null) {
      return [{ label: 'Reps', chips: BLOCK_REPS.map((r) => ({ label: String(r), patch: { reps: r } })) }]
    }
    if (i.exercise === null) {
      return [{ label: 'Exercise', chips: EXERCISES.map((x) => ({ label: `${i.reps} ${x}`, patch: { exercise: x } })) }]
    }
    return i.weight === null ? [weightGroup(i.exercise, typed)] : []
  },
  itemDigitTarget(i) {
    if (i.exercise === null) return 'number'
    return i.weight === null ? 'typed' : null
  },
  itemTypeDigit: (i, digit) => ({ ...i, reps: appendDigit(i.reps, digit) }),
  itemDeleteLast(i) {
    if (i.weight !== null) return { ...i, weight: null }
    if (i.exercise !== null) return { ...i, exercise: null }
    return { ...i, reps: dropDigit(i.reps) }
  },
  isItemEmpty: (i) => i.reps === null,
  formatItem,
  addLabel: '+ Add Exercise',
  rests: RESTS,
}

export function getStage(e) {
  if (e.block !== null) return block.getBlockStage(e.block, blockItem)
  if (!hasNumber(e)) return { id: 'S0', prompt: 'Sets or reps' }
  if (e.reps === null) return e.times ? { id: 'S2', prompt: 'Reps' } : { id: 'S1', prompt: 'Reps or exercise' }
  if (e.exercise === null) return { id: 'GY1', prompt: 'Exercise' }
  if (e.weight === null) return { id: 'GY2', prompt: 'Weight or rest' }
  return { id: 'GY3', prompt: 'Rest' }
}

const done = { label: 'Done', patch: {}, commit: true, kind: 'done' }

function restGroup(typed) {
  return {
    label: 'Rest',
    chips: timeChoices(typed, RESTS).map((s) => ({ label: `${formatRest(s)} rest`, patch: { rest: s }, commit: true })),
  }
}

const exerciseGroup = { label: 'Exercise', chips: EXERCISES.map((x) => ({ label: x, patch: { exercise: x } })) }

// Chips once the first number is entered. Before ×: sets of it, plus a single
// set of that many reps. After ×: the reps being typed.
function numberGroups(e) {
  const n = e.sets
  if (e.times && e.typed !== null) {
    return [{ label: 'Exercise', chips: EXERCISES.map((x) => ({ label: x, patch: { reps: e.typed, exercise: x } })) }]
  }
  const sets = { label: 'Reps', chips: REPS_CHIPS.map((r) => ({ label: `${n} x ${r}`, patch: { reps: r } })) }
  if (e.times) return [sets]
  return [
    sets,
    { label: 'Single', chips: EXERCISES.map((x) => ({ label: `${n} ${x}`, patch: { sets: null, reps: n, exercise: x } })) },
  ]
}

function lineSuggestions(e) {
  switch (getStage(e).id) {
    case 'S0':
      return [
        { label: 'Sets', chips: SETS.map((n) => ({ label: String(n), patch: { sets: n } })) },
        block.startBlockGroup(blockItem),
      ]
    case 'S1':
    case 'S2':
      return numberGroups(e)
    case 'GY1':
      return [exerciseGroup]
    case 'GY2':
      return [weightGroup(e.exercise, e.typed), restGroup(e.typed), { label: null, chips: [done] }]
    case 'GY3':
      return [restGroup(e.typed), { label: null, chips: [done] }]
    default:
      return []
  }
}

export function getSuggestions(e) {
  return finishGroups(e.block !== null ? block.getBlockSuggestions(e.block, blockItem, e.typed) : lineSuggestions(e))
}

// Where the number pad goes: 'number' edits the first number (`sets`), 'typed'
// builds a value for a later slot, null means no slot takes a number.
function digitTarget(e) {
  if (e.block !== null) return block.blockDigitTarget(e.block, blockItem)
  if (!hasNumber(e) || (e.reps === null && !e.times)) return 'number'
  if (e.reps === null) return 'typed'
  return e.exercise === null ? null : 'typed'
}

export function acceptsDigits(e) {
  return digitTarget(e) !== null
}

export function typeDigit(e, digit) {
  switch (digitTarget(e)) {
    case 'typed':
      return { ...e, typed: appendDigit(e.typed, digit) }
    case 'number':
      return e.block !== null
        ? { ...e, block: block.blockTypeDigit(e.block, blockItem, digit) }
        : { ...e, sets: appendDigit(e.sets, digit) }
    default:
      return e
  }
}

// The × key turns the first number into sets and starts typing the reps.
export function acceptsTimes(e) {
  return typeTimes(e) !== e
}

export function typeTimes(e) {
  if (e.typed !== null || e.block !== null) return e
  return e.sets !== null && e.reps === null && !e.times ? { ...e, times: true } : e
}

// Removes the last typed digit, or else the most recent slot.
export function deleteLast(e) {
  if (e.typed !== null) return { ...e, typed: dropDigit(e.typed) }
  if (e.block !== null) {
    const next = block.deleteInBlock(e.block, blockItem)
    return next ? { ...e, block: next } : emptyEntry()
  }
  if (e.weight !== null) return { ...e, weight: null }
  // Undoing a single set's exercise puts its reps back as the typed number.
  if (e.exercise !== null && e.sets === null) return { ...e, exercise: null, reps: null, sets: e.reps }
  if (e.exercise !== null) return { ...e, exercise: null }
  if (e.reps !== null) return { ...e, reps: null }
  if (e.times) return { ...e, times: false }
  if (e.sets !== null) return { ...e, sets: dropDigit(e.sets) }
  return e
}

export function isEmpty(e) {
  return !hasNumber(e) && e.block === null
}

// "4 x 8 Bench Press @ 135 lb" / "4 x 5 Deadlift @ 185 lb, 2 min rest" / "20 Push-Ups"
// A number still being typed is shown at the end.
export function format(e) {
  let text
  if (e.block !== null) {
    text = block.formatBlock(e.block, blockItem)
  } else {
    text = [e.sets, e.reps].filter((n) => n !== null).join(' x ')
    if (e.times && e.reps === null) text += ' x'
    if (e.exercise !== null) text += ` ${e.exercise}`
    if (e.weight !== null) text += ` @ ${e.weight} lb`
    if (e.rest !== null) text += `, ${formatRest(e.rest)} rest`
  }
  if (e.typed !== null) text += ` ${e.typed}`
  return text
}
