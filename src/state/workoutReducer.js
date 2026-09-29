// Workout state: the finished lines plus the line currently being entered.
// All grammar-specific behaviour is delegated to the active sport's grammar.

import { getGrammar } from '../grammar/index.js'

export function initialState(sport = 'swim') {
  return { sport, lines: [], current: getGrammar(sport).emptyEntry() }
}

export function workoutReducer(state, action) {
  const g = getGrammar(state.sport)

  switch (action.type) {
    case 'chip': {
      const next = { ...state.current, ...action.chip.patch }
      if (!action.chip.commit) return { ...state, current: next }
      return { ...state, lines: [...state.lines, g.format(next)], current: g.emptyEntry() }
    }

    case 'digit':
      return { ...state, current: g.typeDigit(state.current, action.digit) }

    // Delete the last slot of the current line; if it is empty, remove the last finished line.
    case 'delete':
      if (g.isEmpty(state.current)) return { ...state, lines: state.lines.slice(0, -1) }
      return { ...state, current: g.deleteLast(state.current) }

    case 'reset':
      return initialState(state.sport)

    // One sport per workout, so switching tabs starts a new workout.
    case 'sport':
      if (action.sport === state.sport || !getGrammar(action.sport)) return state
      return initialState(action.sport)

    default:
      return state
  }
}
