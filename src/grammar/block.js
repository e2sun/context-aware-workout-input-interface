// Multi-part blocks shared by the sport grammars: Rounds × (Item + Item [+ ...]) [Rest]
// Stages BL1–BL5 follow docs/grammar.md section 6.
//
// A block is { items, closed, rounds, rest }; the last item may be incomplete,
// `closed` is set by Finish Block and `rounds` by a Repeat chip. The typed
// number (see number.js) lives on the entry and is passed in as `typed`.
//
// Each sport passes an item config describing how one block item is entered:
//   emptyItem()                    a new, empty item
//   itemStage(item)                { id: 'BL1' | 'BL2', prompt } while the item's core
//                                  slots are being filled, null once it is complete
//   itemSuggestions(item, typed)   chip groups; each chip's patch applies to the item
//   itemDigitTarget(item)          'number' (the item's own number), 'typed' or null
//   itemTypeDigit(item, digit)     for the 'number' target
//   itemTimes(item)                optional: item patch for the × key, or null
//   itemDeleteLast(item)           the item with its last slot removed
//   isItemEmpty(item), formatItem(item)
//   addLabel, rests

import { formatRest } from './format.js'
import { numberChoices, timeChoices } from './number.js'

const ROUNDS = [2, 3, 4]

const done = { label: 'Done', patch: {}, commit: true, kind: 'done' }

export function newBlock(cfg) {
  return { items: [cfg.emptyItem()], closed: false, rounds: null, rest: null }
}

function lastItem(b) {
  return b.items[b.items.length - 1]
}

function withLastItem(b, patch) {
  return { ...b, items: [...b.items.slice(0, -1), { ...lastItem(b), ...patch }] }
}

export function getBlockStage(b, cfg) {
  if (b.rounds !== null) return { id: 'BL5', prompt: 'Rest' }
  if (b.closed) return { id: 'BL4', prompt: 'Repeat' }
  return cfg.itemStage(lastItem(b)) ?? { id: 'BL3', prompt: 'Add or finish block' }
}

// Every chip replaces the whole `block` object, so the reducer's shallow patch
// merge works unchanged.
export function getBlockSuggestions(b, cfg, typed) {
  const stage = getBlockStage(b, cfg).id

  if (stage === 'BL4') {
    return [
      {
        label: 'Repeat',
        chips: numberChoices(typed, ROUNDS).map((n) => ({ label: `Repeat ×${n}`, patch: { block: { ...b, rounds: n } } })),
      },
    ]
  }
  if (stage === 'BL5') {
    return [
      {
        label: 'Rest',
        chips: timeChoices(typed, cfg.rests).map((s) => ({
          label: `${formatRest(s)} rest`,
          patch: { block: { ...b, rest: s } },
          commit: true,
        })),
      },
      { label: null, chips: [done] },
    ]
  }

  const itemGroups = cfg
    .itemSuggestions(lastItem(b), typed)
    .map((g) => ({ ...g, chips: g.chips.map((c) => ({ ...c, patch: { block: withLastItem(b, c.patch) } })) }))
  if (stage !== 'BL3') return itemGroups

  const add = { label: cfg.addLabel, patch: { block: { ...b, items: [...b.items, cfg.emptyItem()] } } }
  const finish = { label: 'Finish Block', patch: { block: { ...b, closed: true } }, kind: 'done' }
  // A one-item block is just a normal set, so Finish needs two or more items.
  return [...itemGroups, { label: null, chips: b.items.length >= 2 ? [add, finish] : [add] }]
}

// Once the block is closed, typed numbers are a repeat count or a block rest.
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

// Removes the last slot of the block. Returns null when the block is already
// empty, so the sport can go back to an empty line.
export function deleteInBlock(b, cfg) {
  const item = lastItem(b)
  if (b.rounds !== null) return { ...b, rounds: null }
  if (b.closed) return { ...b, closed: false }
  if (!cfg.isItemEmpty(item)) return withLastItem(b, cfg.itemDeleteLast(item))
  return b.items.length === 1 ? null : { ...b, items: b.items.slice(0, -1) }
}

// "3 × (10 Squats + 10 Push-Ups + 20 Lunges), 60 sec rest"; while building: "(10 Squats + 10"
export function formatBlock(b, cfg) {
  const items = b.items.map(cfg.formatItem).join(' + ')
  if (!b.closed) return `(${items}`
  let text = b.rounds === null ? `(${items})` : `${b.rounds} × (${items})`
  if (b.rest !== null) text += `, ${formatRest(b.rest)} rest`
  return text
}

export const startBlockGroup = (cfg) => ({
  label: null,
  chips: [{ label: 'Start Block', patch: { block: newBlock(cfg) }, kind: 'done' }],
})
