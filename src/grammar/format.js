// Formatting rules shared by all sports — see docs/grammar.md section 5.

// 45 -> ":45", 100 -> "1:40"
export function formatInterval(seconds) {
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return m === 0 ? `:${s}` : `${m}:${s}`
}

// 15 -> "15 sec", 90 -> "90 sec", 120 -> "2 min"
export function formatRest(seconds) {
  if (seconds < 120 || seconds % 60 !== 0) return `${seconds} sec`
  return `${seconds / 60} min`
}
