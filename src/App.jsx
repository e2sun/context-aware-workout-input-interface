import { useEffect, useReducer } from 'react'
import { getGrammar } from './grammar/index.js'
import { initialState, workoutReducer } from './state/workoutReducer.js'
import SportTabs from './components/SportTabs.jsx'
import WorkoutDisplay from './components/WorkoutDisplay.jsx'
import PredictionStrip from './components/PredictionStrip.jsx'
import NumberPad from './components/NumberPad.jsx'

// A computer keyboard drives the same actions as the number pad.
function keyAction(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null
  if (/^[0-9]$/.test(e.key)) return { type: 'digit', digit: Number(e.key) }
  if (e.key === 'x' || e.key === 'X' || e.key === '*') return { type: 'times' }
  if (e.key === 'Backspace') return { type: 'delete' }
  return null
}

export default function App() {
  const [state, dispatch] = useReducer(workoutReducer, 'swim', initialState)
  const g = getGrammar(state.sport)

  useEffect(() => {
    const onKey = (e) => {
      const action = keyAction(e)
      if (!action) return
      e.preventDefault()
      dispatch(action)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <main className="phone">
      <SportTabs sport={state.sport} onSelect={(sport) => dispatch({ type: 'sport', sport })} />
      <WorkoutDisplay
        lines={state.lines}
        currentText={g.format(state.current)}
        stage={g.getStage(state.current)}
        onReset={() => dispatch({ type: 'reset' })}
      />
      <PredictionStrip groups={g.getSuggestions(state.current)} onChip={(chip) => dispatch({ type: 'chip', chip })} />
      <NumberPad
        digitsEnabled={g.acceptsDigits(state.current)}
        timesEnabled={g.acceptsTimes(state.current)}
        onDigit={(digit) => dispatch({ type: 'digit', digit })}
        onTimes={() => dispatch({ type: 'times' })}
        onDelete={() => dispatch({ type: 'delete' })}
      />
    </main>
  )
}
