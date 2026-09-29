// Gym suggestion chips — see docs/grammar.md sections 2 and 4.
// Rest times are stored in seconds and formatted for display in format.js.

export const SETS = [2, 3, 4, 5]

// Reps offered as `n x r` chips at stage S1.
export const REPS_CHIPS = [5, 8, 10, 12]

export const EXERCISES = [
  'Bench Press',
  'Squats',
  'Deadlift',
  'Shoulder Press',
  'Push-Ups',
  'Lunges',
  'Pull-Ups',
  'Rows',
  'Bicep Curls',
  'Sit-Ups',
]

// Exercises not listed here are bodyweight: no weight chips are offered.
export const WEIGHTS_BY_EXERCISE = {
  'Bench Press': [95, 115, 135, 155, 185],
  Squats: [95, 135, 185, 225],
  Deadlift: [135, 185, 225, 275],
  'Shoulder Press': [15, 20, 25, 30, 45],
  Rows: [15, 20, 25, 30],
  'Bicep Curls': [15, 20, 25, 30],
}

export const RESTS = [30, 60, 90, 120, 180]
