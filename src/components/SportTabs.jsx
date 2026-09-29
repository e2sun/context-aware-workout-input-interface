import { SPORTS } from '../grammar/index.js'

export default function SportTabs({ sport, onSelect }) {
  return (
    <nav className="tabs" role="tablist">
      {SPORTS.map((s) => {
        const available = s.grammar !== null
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={s.id === sport}
            className="tab"
            disabled={!available}
            onClick={() => onSelect(s.id)}
          >
            {s.label}
            {!available && <span className="soon">Soon</span>}
          </button>
        )
      })}
    </nav>
  )
}
