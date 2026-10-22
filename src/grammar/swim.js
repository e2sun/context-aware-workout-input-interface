// Swim set grammar: [Reps x] Distance Stroke [Effort] [Interval | Rest]
// or a block: Rounds × (Item + Item [+ ...]) [Rest], where an item is a set
// ("8 x 25 Free") or a single swim ("100 Free"), each with optional [Effort] [Interval]
// Stages and transitions follow docs/grammar.md section 6 (S0–S2, SW1–SW3, BL1–BL5).
//
// Every sport grammar exports the same shape (see grammar/index.js):
//   emptyEntry, getStage, getSuggestions, acceptsDigits, typeDigit, acceptsTimes,
//   typeTimes, deleteLast, isEmpty, format

import { REPS, DISTANCE_CHIPS, SINGLE_DISTANCES, STROKES, EFFORTS, INTERVALS_BY_DISTANCE, RESTS } from './swimVocab.js'
import { formatInterval, formatRest } from './format.js'
import { appendDigit, dropDigit, timeChoices, finishGroups } from './number.js'
import * as block from './block.js'

// `typed` is the number being typed for a later slot (see number.js), `times`
// is set by the × key, and `block` is null for a normal set.
export function emptyEntry() {
  return {
    reps: null,
    distance: null,
    stroke: null,
    effort: null,
    interval: null,
    rest: null,
    times: false,
    typed: null,
    block: null,
  }
}

// Lines and block items share these slots. The first typed number is held in
// `reps` until a chip decides what it is: `n x d` keeps it as reps, `n Stroke`
// moves it to `distance` for a single swim ("100 Free", reps stays null).
function formatItem(i) {
  let text = [i.reps, i.distance].filter((n) => n !== null).join(' x ')
  if (i.times && i.distance === null) text += ' x'
  if (i.stroke !== null) text += ` ${i.stroke}`
  if (i.effort !== null) text += ` ${i.effort}`
  if (i.interval !== null) text += ` @ ${formatInterval(i.interval)}`
  return text
}

const hasNumber = (i) => i.reps !== null || i.distance !== null

const distanceGroup = {
  label: 'Distance',
  chips: SINGLE_DISTANCES.map((d) => ({ label: `${d} yd`, patch: { distance: d } })),
}

const strokeGroup = { label: 'Stroke', chips: STROKES.map((s) => ({ label: s, patch: { stroke: s } })) }

// Chips once the first number is entered. Before ×: sets of it, plus single
// swims when it can be a distance. After ×: the distance being typed.
function numberGroups(i, typed) {
  const n = i.reps
  if (i.times && typed !== null) {
    return [{ label: 'Stroke', chips: STROKES.map((s) => ({ label: s, patch: { distance: typed, stroke: s } })) }]
  }
  const sets = { label: 'Set', chips: DISTANCE_CHIPS.map((d) => ({ label: `${n} x ${d}`, patch: { distance: d } })) }
  if (i.times || n % 25 !== 0) return [sets]
  return [
    sets,
    { label: 'Single', chips: STROKES.map((s) => ({ label: `${n} ${s}`, patch: { reps: null, distance: n, stroke: s } })) },
  ]
}

// Where the number pad goes: 'number' edits the first number (`reps`), 'typed'
// builds a value for a later slot, null means no slot takes a number.
function digitTarget(i, timeSlotOpen) {
  if (!hasNumber(i) || (i.distance === null && !i.times)) return 'number'
  if (i.distance === null) return 'typed'
  if (i.stroke === null) return null
  return timeSlotOpen ? 'typed' : null
}

function timesPatch(i) {
  return i.reps !== null && i.distance === null && !i.times ? { times: true } : null
}

// Removes the last filled slot of a line or block item.
function deleteSlot(i) {
  if (i.interval !== null) return { ...i, interval: null }
  if (i.effort !== null) return { ...i, effort: null }
  // Undoing a single swim's stroke puts its distance back as the typed number.
  if (i.stroke !== null && i.reps === null) return { ...i, stroke: null, distance: null, reps: i.distance }
  if (i.stroke !== null) return { ...i, stroke: null }
  if (i.distance !== null) return { ...i, distance: null }
  if (i.times) return { ...i, times: false }
  if (i.reps !== null) return { ...i, reps: dropDigit(i.reps) }
  return i
}

// Block item: "8 x 25 Free Sprint @ :30" or "100 Free"
const blockItem = {
  emptyItem: () => ({ reps: null, distance: null, stroke: null, effort: null, interval: null, times: false }),
  itemStage(i) {
    if (!hasNumber(i)) return { id: 'BL1', prompt: 'Reps or distance' }
    if (i.distance === null) return { id: 'BL2', prompt: i.times ? 'Distance' : 'Distance or stroke' }
    if (i.stroke === null) return { id: 'BL2', prompt: 'Stroke' }
    return null
  },
  itemSuggestions(i, typed) {
    if (!hasNumber(i)) {
      return [{ label: 'Reps', chips: REPS.map((n) => ({ label: String(n), patch: { reps: n } })) }, distanceGroup]
    }
    if (i.distance === null) return numberGroups(i, typed)
    if (i.stroke === null) return [strokeGroup]
    // Effort comes before the interval, so it is only offered until an interval is set.
    if (i.interval !== null) return []
    const intervals = timeChoices(typed, INTERVALS_BY_DISTANCE[i.distance] ?? [])
    return [
      ...(i.effort === null ? [{ label: 'Effort', chips: EFFORTS.map((s) => ({ label: s, patch: { effort: s } })) }] : []),
      { label: 'Interval', chips: intervals.map((s) => ({ label: `@ ${formatInterval(s)}`, patch: { interval: s } })) },
    ]
  },
  itemDigitTarget: (i) => digitTarget(i, i.interval === null),
  itemTypeDigit: (i, digit) => ({ ...i, reps: appendDigit(i.reps, digit) }),
  itemTimes: timesPatch,
  itemDeleteLast: deleteSlot,
  isItemEmpty: (i) => !hasNumber(i),
  formatItem,
  addLabel: '+ Add',
  rests: RESTS,
}

// The stage is derived from which slots are filled, so there is no separate
// stage variable to keep in sync.
export function getStage(e) {
  if (e.block !== null) return block.getBlockStage(e.block, blockItem)
  if (!hasNumber(e)) return { id: 'S0', prompt: 'Reps or distance' }
  if (e.distance === null) return e.times ? { id: 'S2', prompt: 'Distance' } : { id: 'S1', prompt: 'Distance or stroke' }
  if (e.stroke === null) return { id: 'SW1', prompt: 'Stroke' }
  if (e.effort === null) return { id: 'SW2', prompt: 'Effort, interval or rest' }
  return { id: 'SW3', prompt: 'Interval or rest' }
}

// A chip is { label, patch, commit }. Tapping it merges `patch` into the entry;
// `commit` means the line is finished and added to the workout.
const done = { label: 'Done', patch: {}, commit: true, kind: 'done' }

function intervalAndRestGroups(e) {
  return [
    {
      label: 'Interval',
      chips: timeChoices(e.typed, INTERVALS_BY_DISTANCE[e.distance] ?? []).map((s) => ({
        label: `@ ${formatInterval(s)}`,
        patch: { interval: s },
        commit: true,
      })),
    },
    {
      label: 'Rest',
      chips: timeChoices(e.typed, RESTS).map((s) => ({ label: `${formatRest(s)} rest`, patch: { rest: s }, commit: true })),
    },
  ]
}

function lineSuggestions(e) {
  switch (getStage(e).id) {
    case 'S0':
      return [
        { label: 'Reps', chips: REPS.map((n) => ({ label: String(n), patch: { reps: n } })) },
        distanceGroup,
        block.startBlockGroup(blockItem),
      ]
    case 'S1':
    case 'S2':
      return numberGroups(e, e.typed)
    case 'SW1':
      return [strokeGroup]
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

// Returns the prediction strip for the current stage as labelled groups of chips.
export function getSuggestions(e) {
  return finishGroups(e.block !== null ? block.getBlockSuggestions(e.block, blockItem, e.typed) : lineSuggestions(e))
}

function entryDigitTarget(e) {
  return e.block !== null ? block.blockDigitTarget(e.block, blockItem) : digitTarget(e, true)
}

export function acceptsDigits(e) {
  return entryDigitTarget(e) !== null
}

export function typeDigit(e, digit) {
  switch (entryDigitTarget(e)) {
    case 'typed':
      return { ...e, typed: appendDigit(e.typed, digit) }
    case 'number':
      return e.block !== null
        ? { ...e, block: block.blockTypeDigit(e.block, blockItem, digit) }
        : { ...e, reps: appendDigit(e.reps, digit) }
    default:
      return e
  }
}

// The × key turns the first number into reps and starts typing the distance.
export function acceptsTimes(e) {
  return typeTimes(e) !== e
}

export function typeTimes(e) {
  if (e.typed !== null) return e
  if (e.block !== null) {
    const next = block.blockTimes(e.block, blockItem)
    return next ? { ...e, block: next } : e
  }
  const patch = timesPatch(e)
  return patch ? { ...e, ...patch } : e
}

// Removes the last typed digit, or else the most recent slot.
export function deleteLast(e) {
  if (e.typed !== null) return { ...e, typed: dropDigit(e.typed) }
  if (e.block !== null) {
    const next = block.deleteInBlock(e.block, blockItem)
    return next ? { ...e, block: next } : emptyEntry()
  }
  return deleteSlot(e)
}

export function isEmpty(e) {
  return !hasNumber(e) && e.block === null
}

// "8 x 50 Free Sprint @ :45" / "4 x 50 Kick, 15 sec rest" / "100 Free @ 1:30"
// A number still being typed is shown at the end.
export function format(e) {
  let text = e.block !== null ? block.formatBlock(e.block, blockItem) : formatItem(e)
  if (e.block === null && e.rest !== null) text += `, ${formatRest(e.rest)} rest`
  if (e.typed !== null) text += ` ${e.typed}`
  return text
}
