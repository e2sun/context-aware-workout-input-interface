import { useReducer } from 'react'
import { getGrammar } from './grammar/index.js'
import { initialState, workoutReducer } from './state/workoutReducer.js'
import SportTabs from './components/SportTabs.jsx'
import WorkoutDisplay from './components/WorkoutDisplay.jsx'
import PredictionStrip from './components/PredictionStrip.jsx'
import NumberPad from './components/NumberPad.jsx'

export default function App() {
  const [state, dispatch] = useReducer(workoutReducer, 'swim', initialState)
  const g = getGrammar(state.sport)

  return (
    <main className="phone">
      <SportTabs sport={state.sport} onSelect={(sport) => dispatch({ type: 'sport', sport })} />
      <WorkoutDisplay lines={state.lines} currentText={g.format(state.current)} stage={g.getStage(state.current)} />
      <PredictionStrip groups={g.getSuggestions(state.current)} onChip={(chip) => dispatch({ type: 'chip', chip })} />
      <NumberPad
        enabled={g.acceptsDigits(state.current)}
        onDigit={(digit) => dispatch({ type: 'digit', digit })}
        onDelete={() => dispatch({ type: 'delete' })}
        onReset={() => dispatch({ type: 'reset' })}
      />
    </main>
  )
}
