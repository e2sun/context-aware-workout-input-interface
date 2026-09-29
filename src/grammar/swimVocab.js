// Swim suggestion chips — see docs/grammar.md sections 2 and 3.
// Times are stored in seconds and formatted for display in format.js.

export const REPS = [1, 2, 3, 4, 6, 8, 10, 12, 16]

// Distances offered as `n x d` chips at stage S1.
export const DISTANCE_CHIPS = [25, 50, 100, 200]

export const STROKES = ['Free', 'Back', 'Breast', 'Fly', 'IM', 'Kick', 'Pull', 'Drill', 'Choice']

export const EFFORTS = ['Easy', 'Moderate', 'Fast', 'Sprint', 'Build', 'Descend']

export const INTERVALS_BY_DISTANCE = {
  25: [25, 30, 35, 40],
  50: [40, 45, 50, 55, 60],
  75: [65, 70, 75, 80],
  100: [90, 100, 105, 120],
  150: [135, 150, 165],
  200: [165, 180, 195, 210],
  400: [330, 360, 390],
}

export const RESTS = [10, 15, 20, 30]
