const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

export default function NumberPad({ enabled, onDigit, onDelete, onReset }) {
  return (
    <section className="pad" aria-label="Keypad">
      {DIGITS.map((d) => (
        <button key={d} className="key" disabled={!enabled} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      <button className="key key-action" onClick={onDelete} aria-label="Delete">
        ⌫
      </button>
      <button className="key key-action" onClick={onReset}>
        Reset
      </button>
    </section>
  )
}
