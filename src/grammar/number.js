// Typed numbers, shared by all sport grammars. The number pad builds one number
// at a time and the chips then offer what it can mean: a typed number replaces
// the preset chips for a slot with a single chip for that value.

export const MAX_NUMBER = 9999

export function appendDigit(n, digit, max = MAX_NUMBER) {
  const next = (n ?? 0) * 10 + digit
  return next === 0 || next > max ? n : next
}

export function dropDigit(n) {
  return n >= 10 ? Math.floor(n / 10) : null
}

// Typed times: up to two digits are seconds, more are m:ss.
// 45 -> 45, 90 -> 90, 130 -> 90 (1:30), 200 -> 120; null when the seconds part is 60 or more.
export function typedSeconds(n) {
  if (n < 100) return n
  const s = n % 100
  return s >= 60 ? null : Math.floor(n / 100) * 60 + s
}

// Values for a numeric slot's chips: the presets, or just the typed value.
export function numberChoices(typed, presets) {
  return typed === null ? presets : [typed]
}

export function timeChoices(typed, presets) {
  if (typed === null) return presets
  const s = typedSeconds(typed)
  return s === null ? [] : [s]
}

// Drops empty chip groups, and makes every chip clear the typed number.
export function finishGroups(groups) {
  return groups
    .filter((g) => g.chips.length)
    .map((g) => ({ ...g, chips: g.chips.map((c) => ({ ...c, patch: { typed: null, ...c.patch } })) }))
}
