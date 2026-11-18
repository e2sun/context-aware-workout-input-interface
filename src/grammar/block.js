// Multi-part blocks shared by the sport grammars: Rounds × (Item + Item [+ ...]) [Rest]
// Stages BL1–BL4 follow docs/grammar.md section 6.
//
// A block is { items, closed, rounds, rest }. It is entered as written: the
// line's first number becomes `rounds` through the "3 × (" chip, then the
// items follow; the last item may be incomplete and `closed` is set by Finish Block. The typed
// number (see number.js) lives on the entry and is passed in as `typed`, and
// `at` says the @ key was pressed.
//
// Each sport passes an item config describing how one block item is entered:
//   emptyItem()                    a new, empty item
//   itemStage(item)                { id: 'BL1' | 'BL2', prompt } while the item's core
//                                  slots are being filled, null once it is complete
//   itemSuggestions(item, typed, earlierItems)
//                                  chip groups; each chip's patch applies to the item
//   itemDigitTarget(item)          'number' (the item's own number), 'typed' or null
//   itemTypeDigit(item, digit)     for the 'number' target
//   itemTimes(item)                optional: item patch for the × key, or null
//   itemAtOpen(item)               optional: true while the item's @ slot can be typed
//   itemAtSuggestions(item, typed) chip groups while typing after the @ key
//   itemDeleteLast(item)           the item with its last slot removed
//   isItemEmpty(item), formatItem(item)
//   addLabel
//   rests(items)                   rest presets for the finished block, most likely first

import { formatRest } from './format.js'
import { timeChoices } from './number.js'

// A first number in this range can be a round count ("3 × (").
const MIN_ROUNDS = 2
const MAX_ROUNDS = 20

const done = { label: 'Done', patch: {}, commit: true, kind: 'done' }

export function newBlock(cfg, rounds) {
  return { items: [cfg.emptyItem()], closed: false, rounds, rest: null }
}

function lastItem(b) {
  return b.items[b.items.length - 1]
}

function withLastItem(b, patch) {
  return { ...b, items: [...b.items.slice(0, -1), { ...lastItem(b), ...patch }] }
}

export function getBlockStage(b, cfg) {
  if (b.closed) return { id: 'BL4', prompt: 'Rest' }
  return cfg.itemStage(lastItem(b)) ?? { id: 'BL3', prompt: 'Add or finish block' }
}

// Every chip replaces the whole `block` object, so the reducer's shallow patch
// merge works unchanged.
export function getBlockSuggestions(b, cfg, typed, at = false) {
  const stage = getBlockStage(b, cfg).id
  const forItem = (groups) =>
    groups.map((g) => ({ ...g, chips: g.chips.map((c) => ({ ...c, patch: { block: withLastItem(b, c.patch) } })) }))

  // After @, only the value being typed can be chosen.
  if (at) return forItem(cfg.itemAtSuggestions(lastItem(b), typed))

  if (stage === 'BL4') {
    return [
      {
        label: 'Rest',
        chips: timeChoices(typed, cfg.rests(b.items)).map((s) => ({
          label: `${formatRest(s)} rest`,
          patch: { block: { ...b, rest: s } },
          commit: true,
        })),
      },
      { label: null, chips: [done] },
    ]
  }

  const itemGroups = forItem(cfg.itemSuggestions(lastItem(b), typed, b.items.slice(0, -1)))
  if (stage !== 'BL3') return itemGroups

  const add = { label: cfg.addLabel, patch: { block: { ...b, items: [...b.items, cfg.emptyItem()] } } }
  const finish = { label: 'Finish Block', patch: { block: { ...b, closed: true } }, kind: 'done' }
  // A one-item block is just a normal set, so Finish needs two or more items.
  return [...itemGroups, { label: null, chips: b.items.length >= 2 ? [add, finish] : [add] }]
}

// Once the block is closed, a typed number is the block rest.
export function blockDigitTarget(b, cfg) {
  return b.closed ? 'typed' : cfg.itemDigitTarget(lastItem(b))
}

export function blockTypeDigit(b, cfg, digit) {
  return withLastItem(b, cfg.itemTypeDigit(lastItem(b), digit))
}

export function blockTimes(b, cfg) {
  const patch = b.closed ? null : cfg.itemTimes?.(lastItem(b))
  return patch ? withLastItem(b, patch) : null
}

export function blockAcceptsAt(b, cfg) {
  return !b.closed && (cfg.itemAtOpen?.(lastItem(b)) ?? false)
}

// Removes the last slot of the block. Returns null when the block is already
// empty, so the sport can go back to the line it came from (see exitBlock).
export function deleteInBlock(b, cfg) {
  const item = lastItem(b)
  if (b.closed) return { ...b, closed: false }
  if (!cfg.isItemEmpty(item)) return withLastItem(b, cfg.itemDeleteLast(item))
  return b.items.length === 1 ? null : { ...b, items: b.items.slice(0, -1) }
}

// "3 × (10 Squats + 10 Push-Ups + 20 Lunges), 60 sec rest"; while building: "3 × (10 Squats + 10"
export function formatBlock(b, cfg) {
  const items = b.items.map(cfg.formatItem).join(' + ')
  if (!b.closed) return `${b.rounds} × (${items}`
  let text = `${b.rounds} × (${items})`
  if (b.rest !== null) text += `, ${formatRest(b.rest)} rest`
  return text
}

// The only way into a block: once a line's first number is typed, `n × (`
// starts a block repeated n times. `emptyEntry` is the sport's empty line,
// which clears the number that became the rounds.
export const blockGroup = (cfg, n, emptyEntry) => ({
  label: 'Block',
  chips:
    n >= MIN_ROUNDS && n <= MAX_ROUNDS
      ? [{ label: `${n} × (`, patch: { ...emptyEntry, block: newBlock(cfg, n) }, kind: 'done' }]
      : [],
})

// The line to go back to when an empty block is deleted: the "3 x" it came from.
export function exitBlock(b, emptyEntry, numberSlot) {
  return { ...emptyEntry, [numberSlot]: b.rounds, times: true }
}
