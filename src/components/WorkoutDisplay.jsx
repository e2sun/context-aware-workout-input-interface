export default function WorkoutDisplay({ lines, currentText, stage }) {
  return (
    <section className="workout" aria-label="Workout">
      <ol className="lines">
        {lines.map((line, i) => (
          <li key={i} className="line">
            {line}
          </li>
        ))}
        <li className="line current" aria-live="polite">
          {currentText ? (
            currentText
          ) : (
            <span className="placeholder">{lines.length ? 'Next set…' : 'Tap a number to start'}</span>
          )}
          <span className="caret" aria-hidden="true" />
        </li>
      </ol>
      <p className="stage">
        <span className="stage-id">{stage.id}</span> Next: {stage.prompt}
      </p>
    </section>
  )
}
