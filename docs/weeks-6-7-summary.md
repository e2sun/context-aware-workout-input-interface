# Weeks 6–7 Implementation Summary

This milestone improved the quality of the context-aware predictions for both swimming and gym workouts. Suggestion chips are now ordered by how likely they are, based on what the user has already entered. The system is still fully rule-based, with no LLM or external AI service. The tech stack remains the same: React 19, Vite, and Vitest, with no backend.

## What the User Can Do Now

### Better-Ordered Suggestions

The most likely option now appears first in each row of chips. This matters because chip rows scroll horizontally, so options later in a row may be off screen.

Previously, most chips appeared in a fixed order. Now the order depends on the workout being built. No preset chips were removed, so less likely options are still available further along the row.

### Smarter Swimming Suggestions

Swimming suggestions now change based on the reps, distance, stroke, and effort already selected.

- **Distance** depends on reps. `8` suggests `8 x 50` first, while `12` suggests `12 x 25` first.
- **Stroke** depends on distance. IM moves to the end for 25s and 50s, and Fly moves to the end for 75 yards and longer.
- **Effort** depends on distance and stroke. Short sets start with Fast, while Drill starts with Easy.
- **Interval** depends on distance, stroke, and effort.
- **Rest** depends on distance and effort. Longer swims and sprints put longer rests first.

Examples of the first interval suggested:

| Workout | First interval |
|---|---|
| `8 x 50 Free` | `@ :45` |
| `8 x 50 Fly` | `@ :55` |
| `8 x 50 Kick` | `@ 1:00` |
| `4 x 100 Free` | `@ 1:30` |
| `4 x 100 Kick` | `@ 2:00` |
| `8 x 50 Free Sprint` | `@ :55` |

### New Interval Suggestions

Interval chips are now available for distances that previously had none:

- `300 yd` and `500 yd` now have preset intervals.
- Typed distances, such as `8 x 125`, now get estimated intervals.
- If no preset fits the context, a new chip is added. For example, `4 x 100 Drill` now suggests `@ 2:05`.

### Smarter Gym Suggestions

Reps are entered before the exercise, so the reps help predict the exercise, weight, and rest.

- **Reps** depend on sets. `4` suggests `4 x 8` first, while `5` suggests `5 x 5` first.
- **Exercise** depends on reps. Low reps favor heavy lifts such as Deadlift, while high reps favor bodyweight exercises such as Push-Ups.
- **Weight** depends on the exercise and reps. Fewer reps put heavier presets first.
- **Rest** depends on the exercise and reps. Compound lifts suggest longer rest than simpler exercises.

Examples:

| Workout | First weight | First rest |
|---|---|---|
| `4 x 5 Bench Press` | `@ 155 lb` | `3 min rest` |
| `4 x 8 Bench Press` | `@ 135 lb` | `2 min rest` |
| `4 x 12 Bench Press` | `@ 115 lb` | `2 min rest` |
| `4 x 8 Deadlift` | `@ 185 lb` | `3 min rest` |
| `3 x 12 Bicep Curls` | `@ 20 lb` | `60 sec rest` |
| `3 x 10 Push-Ups` | None (bodyweight) | `60 sec rest` |

### Better First-Number Predictions

When the user types a number, the interface now predicts what that number probably means.

- In swimming, a multiple of 25 shows single swims first. Typing `100` puts `100 Free` above `100 x 25`.
- In gym, a number above 6 shows single sets first. Typing `20` puts `20 Push-Ups` above `20 x 10`.

### Smarter Repeated Blocks

Block items use the same predictions as normal workout lines. Two block-specific behaviors were also added:

- In gym blocks, exercises already used in the block move to the end of the row.
- Block rest now depends on the whole block. Swimming uses the yards in one round, and gym uses the most demanding item.

Custom typed values still work everywhere. A typed value replaces the suggestions for that slot, and uncommon options can still be selected even when they are ranked last.

## Code Organization

### rank.js

A new shared module provides three small ordering helpers:

- `rankFirst` moves preferred options to the front while keeping every other option
- `closestFirst` sorts numbers by how close they are to a target value
- `inBand` looks up a value in a table of number ranges

These helpers only reorder values, which makes it difficult for a ranking rule to accidentally remove a preset chip.

### swimVocab.js and gymVocab.js

The vocabulary files now contain the prediction rules as well as the chip lists. Most rules are written as small tables, so a prediction can be changed without editing the grammar or UI.

Each file also exports functions that return the ordered chips for the current context, such as `strokesFor`, `intervalsFor`, `exercisesFor`, `weightsFor`, and `restsFor`.

### swim.js and gym.js

The grammar modules now request their chips from the vocabulary functions. They still decide which slots are available at each stage, while the vocabulary files decide the order of the options.

### block.js

The shared block engine now gives each sport the earlier items in the block. This allows gym blocks to move used exercises to the end and allows both sports to choose a block rest based on all of the items.

## State Changes

No new state fields were added. The reducer was also not changed.

Predictions are calculated from the fields already stored in the current workout entry. As before, the stage is not stored directly, and the suggestions update automatically when a value is added or deleted.

## User Interface Changes

There were no visual changes to the interface. The components were not modified, and only the order of the chips and rows they receive has changed.

## Application Flow

The overall application flow remains the same:

User types a number or selects a suggestion chip
→ an action is sent to the reducer
→ the reducer passes the action to the active sport grammar or block engine
→ the workout entry is updated
→ React re-renders the interface
→ the current stage is recalculated
→ the grammar requests chips from the vocabulary rules
→ the chips are ordered using the current context
→ the ordered suggestions are displayed

## Tests and Documentation

The test suite now contains 163 tests, increased from 60.

The 103 new tests cover:

- swimming and gym ranking rules
- context-based intervals, weights, and rest times
- matching predictions in normal lines and repeated blocks
- block-specific ranking behavior
- preset chips remaining available after ranking
- unusual typed values
- custom input and low-ranked chips

Eleven existing tests were updated because they checked the old chip or row order.

`grammar.md` was updated with a new prediction ranking section and the new interval presets. The full rules are listed in `prediction-rules.md`.

The prediction values are based on general workout conventions rather than collected user data, so they may need tuning before the user study. Predictions also do not use earlier finished lines in the workout, because those lines are currently stored only as text.
