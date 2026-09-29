// Suggestion chips for the current stage, one scrollable row per group.
export default function PredictionStrip({ groups, onChip }) {
  return (
    <section className="strip" aria-label="Suggestions">
      {groups.map((group, gi) => (
        <div key={group.label ?? gi} className="chip-row">
          {group.label && <span className="row-label">{group.label}</span>}
          <div className="chips">
            {group.chips.map((chip) => (
              <button
                key={chip.label}
                className={`chip ${chip.kind === 'done' ? 'chip-done' : ''}`}
                onClick={() => onChip(chip)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
