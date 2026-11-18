const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// `symbol` is × or @: the grammar decides which one the current slot uses.
export default function NumberPad({ digitsEnabled, symbol, symbolEnabled, onDigit, onSymbol, onDelete }) {
  const digitKey = (d) => (
    <button key={d} className="key" disabled={!digitsEnabled} onClick={() => onDigit(d)}>
      {d}
    </button>
  )
  return (
    <section className="pad" aria-label="Keypad">
      {DIGITS.map(digitKey)}
      <button
        className="key key-action"
        disabled={!symbolEnabled}
        onClick={onSymbol}
        aria-label={symbol === '@' ? 'At' : 'Times'}
      >
        {symbol}
      </button>
      {digitKey(0)}
      <button className="key key-action" onClick={onDelete} aria-label="Delete">
        ⌫
      </button>
    </section>
  )
}
