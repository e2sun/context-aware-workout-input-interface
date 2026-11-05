// Ordering helpers for suggestion chips, shared by the sport vocabularies.
// They only reorder: a chip that isn't predicted stays on the row, further along.

// Moves `preferred` to the front of `all`, keeping every other value in its
// original order. Values not in `all` are ignored.
export function rankFirst(preferred, all) {
  return [...preferred.filter((v) => all.includes(v)), ...all.filter((v) => !preferred.includes(v))]
}

// Sorts numbers by distance from `target`. Ties keep their original order.
export function closestFirst(values, target) {
  return [...values].sort((a, b) => Math.abs(a - target) - Math.abs(b - target))
}

// Looks up a number in a table of [upperLimit, value] rows sorted by limit.
// The last row should use Infinity so that any number matches.
export function inBand(bands, n) {
  return bands.find(([limit]) => n <= limit)[1]
}
