# Prediction Rules

This is the full list of ranking rules in the workout input interface, from Weeks 6–7 plus the swim equipment slot. All rules are rule-based and use only the line or block currently being entered.

The rules reorder chips and do not remove them. Chips not listed in a preferred order keep their normal order after the preferred chips. The rules live in `src/grammar/swimVocab.js` and `src/grammar/gymVocab.js`, with shared helpers in `src/grammar/rank.js`.

## Swimming Rules

### Reps

There is no context at the start of a line, so the order is fixed:

`4, 8, 6, 10, 2, 3, 12, 16, 1`

### Distance (Based on Reps)

| Reps | Distance order |
|---|---|
| 1–2 | 200, 100, 50, 25 |
| 3–4 | 100, 200, 50, 25 |
| 5–8 | 50, 100, 25, 200 |
| 9 or more | 25, 50, 100, 200 |

### Stroke (Based on Distance)

| Distance | Stroke order |
|---|---|
| Up to 25 | Free, Kick, Fly, Drill, Back, Breast, Pull, Choice, IM |
| 26–50 | Free, Kick, Back, Breast, Fly, Drill, Pull, Choice, IM |
| 51–150 | Free, IM, Kick, Pull, Back, Breast, Drill, Choice, Fly |
| 151 or more | Free, Pull, IM, Choice, Kick, Back, Breast, Drill, Fly |

### Effort (Based on Distance and Stroke)

| Distance | Effort order |
|---|---|
| Up to 50 | Fast, Sprint, Build, Moderate, Easy, Descend |
| 51–150 | Moderate, Fast, Descend, Build, Easy, Sprint |
| 151 or more | Moderate, Build, Descend, Easy, Fast, Sprint |

If the stroke is Drill or Choice, Easy and Moderate move to the front at every distance.

### Equipment (Based on Stroke)

| Stroke | Equipment order |
|---|---|
| Free | Paddles, Fins, Snorkel, Pull Buoy, Kickboard |
| Back | Fins, Paddles, Snorkel, Pull Buoy, Kickboard |
| Breast | Snorkel, Paddles, Pull Buoy, Kickboard, Fins |
| Kick | Kickboard, Fins, Paddles, Snorkel, Pull Buoy |
| Pull | Pull Buoy, Paddles, Snorkel, Fins, Kickboard |
| Drill | Fins, Snorkel, Paddles, Pull Buoy, Kickboard |
| Fly, IM, Choice | Fins, Paddles, Snorkel, Pull Buoy, Kickboard |

### Interval (Based on Distance, Stroke, Effort, and Equipment)

The system estimates the most likely interval:

`estimate = distance × 0.9 sec/yd × stroke factor × effort factor × equipment factor`

| Stroke | Factor |
|---|---|
| Free | 1 |
| Pull | 1 |
| Back | 1.1 |
| Choice | 1.1 |
| IM | 1.15 |
| Breast | 1.2 |
| Fly | 1.25 |
| Kick | 1.35 |
| Drill | 1.4 |

| Effort | Factor |
|---|---|
| None or Moderate | 1 |
| Fast | 1.05 |
| Build | 1.05 |
| Easy | 1.1 |
| Descend | 1.1 |
| Sprint | 1.25 |

The effort factor changes the send-off time, not the swim speed. A harder effort leaves more recovery, so Sprint has the largest factor.

| Equipment | Factor |
|---|---|
| Fins | 0.9 |
| Paddles | 0.95 |
| None, Snorkel, Pull Buoy, or Kickboard | 1 |

The estimate is rounded to a value that is easy to read on a pace clock:

| Distance | Rounded to the nearest |
|---|---|
| Up to 100 | 5 seconds |
| 101–200 | 15 seconds |
| 201 or more | 30 seconds |

The chips are then built in three steps:

1. Start with the preset intervals for that distance.
2. Add the rounded estimate if it is not already a preset.
3. Sort the chips by how close they are to the unrounded estimate.

If a distance has no presets, the chips are the rounded estimate and one step on either side. Values of zero or below are not shown.

| Distance | Preset intervals |
|---|---|
| 25 | :25, :30, :35, :40 |
| 50 | :40, :45, :50, :55, 1:00 |
| 75 | 1:05, 1:10, 1:15, 1:20 |
| 100 | 1:30, 1:40, 1:45, 2:00 |
| 150 | 2:15, 2:30, 2:45 |
| 200 | 2:45, 3:00, 3:15, 3:30 |
| 300 (new) | 4:00, 4:30, 5:00 |
| 400 | 5:30, 6:00, 6:30 |
| 500 (new) | 7:00, 7:30, 8:00, 8:30 |

Examples:

| Workout | Estimate | Chip order |
|---|---|---|
| `8 x 50 Free` | 45 sec | :45, :40, :50, :55, 1:00 |
| `8 x 50 Kick` | 60.75 sec | 1:00, :55, :50, :45, :40 |
| `8 x 50 Free Sprint` | 56.25 sec | :55, 1:00, :50, :45, :40 |
| `4 x 100 Free` | 90 sec | 1:30, 1:40, 1:45, 2:00 |
| `4 x 100 Kick` | 121.5 sec | 2:00, 1:45, 1:40, 1:30 |
| `4 x 100 Drill` | 126 sec | 2:05 (added), 2:00, 1:45, 1:40, 1:30 |
| `8 x 50 Kick w/ Fins` | 54.68 sec | :55, 1:00, :50, :45, :40 |
| `4 x 100 Free w/ Paddles` | 85.5 sec | 1:25 (added), 1:30, 1:40, 1:45, 2:00 |

### Rest (Based on Distance and Effort)

| Distance | Rest order (seconds) |
|---|---|
| Up to 50 | 15, 10, 20, 30 |
| 51–100 | 15, 20, 10, 30 |
| 101–200 | 20, 15, 30, 10 |
| 201 or more | 30, 20, 15, 10 |

If the effort is Sprint, the order is always `30, 20, 15, 10`.

### Swimming Blocks

- Block items use the same stroke, effort, equipment, and interval rules as normal lines.
- Block rest treats one round as a single swim, using the total yards in that round. For example, `100 Free + 8 x 25 Kick + 50 Free` counts as 350 yards.
- If any item in the block is Sprint, the block uses the Sprint rest order.
- Strokes already used in a block are not moved down, because blocks often repeat a stroke.

## Gym Rules

### Sets

There is no context at the start of a line, so the order is fixed:

`3, 4, 5, 2`

### Reps (Based on Sets)

| Sets | Reps order |
|---|---|
| 1–3 | 10, 12, 8, 5 |
| 4 | 8, 10, 12, 5 |
| 5 | 5, 8, 10, 12 |
| 6 or more | 10, 8, 12, 5 |

Block items have no sets, so block reps use a fixed order:

`10, 12, 15, 8, 20, 5`

### Exercise (Based on Reps)

| Reps | Exercise order |
|---|---|
| 1–6 | Deadlift, Squats, Bench Press, Shoulder Press, Rows, Pull-Ups, Bicep Curls, Lunges, Push-Ups, Sit-Ups |
| 7–12 | Bench Press, Squats, Rows, Shoulder Press, Pull-Ups, Deadlift, Lunges, Bicep Curls, Push-Ups, Sit-Ups |
| 13 or more | Push-Ups, Sit-Ups, Lunges, Bicep Curls, Squats, Rows, Shoulder Press, Bench Press, Pull-Ups, Deadlift |

### Weight (Based on Exercise and Reps)

The system chooses a target between the exercise's lightest and heaviest preset:

`target = lightest + position × (heaviest − lightest)`

| Reps | Position |
|---|---|
| 1–5 | 0.75 |
| 6–10 | 0.5 |
| 11 or more | 0.25 |

Chips are sorted by how close they are to the target. If two chips are equally close, the lighter chip comes first.

| Exercise | Preset weights (lb) |
|---|---|
| Bench Press | 95, 115, 135, 155, 185 |
| Squats | 95, 135, 185, 225 |
| Deadlift | 135, 185, 225, 275 |
| Shoulder Press | 15, 20, 25, 30, 45 |
| Rows | 15, 20, 25, 30 |
| Bicep Curls | 15, 20, 25, 30 |
| Push-Ups, Lunges, Pull-Ups, Sit-Ups | None (bodyweight) |

Examples for Bench Press:

| Workout | Target | Chip order (lb) |
|---|---|---|
| `4 x 5` | 162.5 | 155, 185, 135, 115, 95 |
| `4 x 8` | 140 | 135, 155, 115, 95, 185 |
| `4 x 12` | 117.5 | 115, 135, 95, 155, 185 |

### Rest (Based on Exercise and Reps)

Each exercise belongs to a rest tier:

| Tier | Exercises |
|---|---|
| 0 | Bicep Curls, Push-Ups, Sit-Ups |
| 1 | Shoulder Press, Rows, Pull-Ups, Lunges |
| 2 | Squats, Bench Press |
| 3 | Deadlift |

Reps can move the exercise up or down one tier. The final tier always stays between 0 and 3.

| Reps | Tier change |
|---|---|
| 1–5 | +1 |
| 6–14 | None |
| 15 or more | −1 |

| Final tier | Rest order |
|---|---|
| 0 | 60 sec, 30 sec, 90 sec, 2 min, 3 min |
| 1 | 90 sec, 60 sec, 2 min, 30 sec, 3 min |
| 2 | 2 min, 3 min, 90 sec, 60 sec, 30 sec |
| 3 | 3 min, 2 min, 90 sec, 60 sec, 30 sec |

An exercise without a listed tier uses tier 1. The current interface has no way to enter one, but this keeps the rule ready for custom exercise names.

### Gym Blocks

- Block items use the same exercise and weight rules as normal lines.
- Exercises already used in the block move to the end of the row, but they can still be selected.
- Block rest uses the highest final tier of any item in the block.

## Rules for Both Sports

### First Typed Number

| Sport | Condition | Row shown first |
|---|---|---|
| Swim | Number is a multiple of 25 | `Single` |
| Swim | Any other number | `Set` is the only row |
| Gym | Number is above 6 | `Single` |
| Gym | Number is 6 or below | `Reps` |

### Repeat Count

There is no block-specific context for this rule, so the order is fixed:

`Repeat ×3, Repeat ×2, Repeat ×4`

### Typed Values

- A typed value replaces the preset chips for that slot.
- A typed distance or rep count is used as context for later slots. For example, a typed distance of `300` ranks strokes using the 151-or-more row.
- A typed weight does not change the rest ranking, because rest uses the exercise and reps.

### Unchanged Behavior

- The order of chip rows at the swim and gym entry stages is unchanged, except for the first-number rule above.
- Done, Start Block, `+ Add`, `+ Add Exercise`, and Finish Block are not ranked.
- The distance chips for starting a single swim stay in the order `100, 200, 300, 400, 500`.
