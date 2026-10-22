const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export default function NumberPad({ digitsEnabled, timesEnabled, onDigit, onTimes, onDelete }) {
  const digitKey = (d) => (
    <button key={d} className="key" disabled={!digitsEnabled} onClick={() => onDigit(d)}>
      {d}
    </button>
  )
  return (
    <section className="pad" aria-label="Keypad">
      {DIGITS.map(digitKey)}
      <button className="key key-action" disabled={!timesEnabled} onClick={onTimes} aria-label="Times">
        ×
      </button>
      {digitKey(0)}
      <button className="key key-action" onClick={onDelete} aria-label="Delete">
        ⌫
      </button>
    </section>
  )
}
