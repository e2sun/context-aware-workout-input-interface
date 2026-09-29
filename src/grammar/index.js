// Registry of sport grammars, one per tab. To add a sport, create
// grammar/<sport>.js with the same exports as swim.js and register it here.

import * as swim from './swim.js'
import * as gym from './gym.js'

export const SPORTS = [
  { id: 'swim', label: 'Swim', grammar: swim },
  { id: 'gym', label: 'Gym', grammar: gym },
]

export function getGrammar(sportId) {
  return SPORTS.find((s) => s.id === sportId)?.grammar ?? null
}
