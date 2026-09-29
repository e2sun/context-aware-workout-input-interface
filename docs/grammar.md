# Workout Grammar (v1)

This file is the spec for the prediction logic. Each stage in the transition
table (section 6) corresponds to one state in the app, and each chip list is
the set of suggestions shown in the prediction strip at that stage.

## 1. Workout-level settings

| Setting | Values | Notes |
|---|---|---|
| Sport tab | **Swim**, **Gym** | Selected first, before any entry. One sport per workout. |
| Pool unit | yd | Fixed in v1 (see Future steps) |
| Weight unit | lb | Fixed in v1 (see Future steps) |

## 2. Slot vocabulary

### Swim set

`Reps x Distance Stroke [Effort] [Interval | Rest]`

| Slot | Required? | Suggestion chips | Custom entry | Display |
|---|---|---|---|---|
| Reps | Yes | 1, 2, 3, 4, 6, 8, 10, 12, 16 | Number pad | `8 x` |
| Distance | Yes | 25, 50, 75, 100, 150, 200, 400 | Number pad (multiples of 25) | `8 x 50` |
| Stroke / Type | Yes | Free, Back, Breast, Fly, IM, Kick, Pull, Drill, Choice | Text | `8 x 50 Free` |
| Effort | Optional | Easy, Moderate, Fast, Sprint, Build, Descend | Text | `8 x 50 Free Sprint` |
| Interval **or** Rest | Optional (one, not both) | Interval: by distance (section 3). Rest: 10, 15, 20, 30 sec | Time pad | `@ :45` / `, 15 sec rest` |

### Gym set

`Sets x Reps Exercise [Weight] [Rest]`

| Slot | Required? | Suggestion chips | Custom entry | Display |
|---|---|---|---|---|
| Sets | Yes | 2, 3, 4, 5 | Number pad | `4 x` |
| Reps | Yes | 5, 6, 8, 10, 12, 15, 20 | Number pad | `4 x 8` |
| Exercise | Yes | Bench Press, Squats, Deadlift, Shoulder Press, Push-Ups, Lunges, Pull-Ups, Rows, Bicep Curls, Sit-Ups | Text (added to list) | `4 x 8 Bench Press` |
| Weight | Optional | By exercise (section 4) | Number pad | `@ 135 lb` |
| Rest | Optional | 30 sec, 60 sec, 90 sec, 2 min, 3 min | Time pad | `, 2 min rest` |

### Block (circuit)

`Rounds x ( Item + Item [+ Item ...] ) [Rest]`

| Slot | Required? | Suggestion chips | Display |
|---|---|---|---|
| Rounds | Yes | 2, 3, 4, 5 | `3 x (` |
| Swim item | 2 or more | Distance (25, 50, 100, 200) → Stroke / Type → [Effort] → [Interval] | `100 Free`, `25 Free Sprint @ :30` |
| Gym item | 2 or more | Reps (5, 8, 10, 12, 15, 20) → Exercise → [Weight] | `10 Squats`, `10 Squats @ 95 lb` |
| Separator | Automatic | `+ Add` / `Finish block` | ` + `, `)` |
| Block rest | Optional | Same rest chips as the sport | `, 1 min rest` |

Rules:
- Items may carry an interval (swim) or weight (gym); rest is block-level only.
- Blocks cannot be nested.

## 3. Swim interval chips by distance

| Distance | Interval chips |
|---|---|
| 25 | :25, :30, :35, :40 |
| 50 | :40, :45, :50, :55, 1:00 |
| 75 | 1:05, 1:10, 1:15, 1:20 |
| 100 | 1:30, 1:40, 1:45, 2:00 |
| 150 | 2:15, 2:30, 2:45 |
| 200 | 2:45, 3:00, 3:15, 3:30 |
| 400 | 5:30, 6:00, 6:30 |

## 4. Gym weight chips by exercise

| Exercise | Weight chips (lb) |
|---|---|
| Bench Press | 95, 115, 135, 155, 185 |
| Squats | 95, 135, 185, 225 |
| Deadlift | 135, 185, 225, 275 |
| Shoulder Press | 15, 20, 25, 30, 45 |
| Rows, Bicep Curls | 15, 20, 25, 30 |
| Push-Ups, Pull-Ups, Lunges, Sit-Ups | None (bodyweight) — skip to Rest / Done |

## 5. Formatting rules

Both the chip interface and the keyboard baseline must produce this exact text
so entries can be compared for errors.

| Element | Rule | Example |
|---|---|---|
| Multiply sign | Lowercase `x`, spaces on both sides | `8 x 50` |
| Effort | Follows stroke, one space | `50 Free Sprint` |
| Interval | `@ ` + `:ss` under 1 min, `m:ss` otherwise | `@ :45`, `@ 1:40` |
| Weight | `@ ` + number + ` lb` | `@ 135 lb` |
| Rest | `, ` + time + ` rest`; `N sec` under 2 min, `N min` otherwise | `, 90 sec rest`, `, 2 min rest` |
| Block | `R x (` + items joined by ` + ` + `)` | `3 x (10 Squats + 10 Push-Ups + 20 Lunges)` |
| Exercise names | One fixed spelling, title case, bodyweight moves plural | `Squats`, `Push-Ups`, `Bench Press` |

## 6. Stages and transitions

**Ending a line:** a **Done** chip is shown whenever the remaining slots are
all optional. When the user fills the *last* possible slot (swim interval/rest,
gym rest, block rest), the line is committed automatically — no extra tap.

| # | Stage | Chips shown | Tap → next stage |
|---|---|---|---|
| S0 | Line start | Number pad | Number `n` → S1 |
| S1 | Number entered | **Swim:** `n x 25/50/100/200`, `n rounds (…)` · **Gym:** `n x 5/8/10/12`, `n rounds (…)` | `n x d` → SW1 / GY1 · `n rounds` → BL1 |
| SW1 | Reps x distance done | Stroke / Type | → SW2 |
| SW2 | Stroke done | Effort, Interval (by distance), Rest, **Done** | Effort → SW3 · Interval/Rest → commit · Done → commit |
| SW3 | Effort done | Interval (by distance), Rest, **Done** | Interval/Rest → commit · Done → commit |
| GY1 | Sets x reps done | Exercise | → GY2 |
| GY2 | Exercise done | Weight (by exercise), Rest, **Done** | Weight → GY3 · Rest → commit · Done → commit |
| GY3 | Weight done | Rest, **Done** | Rest → commit · Done → commit |
| BL1 | Block item start | Swim: distance · Gym: reps | → BL2 |
| BL2 | Item number done | Swim: Stroke / Type · Gym: Exercise | → BL3 |
| BL3 | Item core done | Swim: Effort, Interval · Gym: Weight · plus `+ Add`, `Finish block`* | Modifier → BL3 (that modifier removed) · `+ Add` → BL1 · Finish → BL4 |
| BL4 | Block closed | Rest, **Done** | Rest → commit · Done → commit |

\* `Finish block` appears only once the block has 2 or more items.

Commit → the line is added to the workout and the next line starts at S0.

Always available: **Backspace** (removes the last slot, not the last
character), **Custom** (number/time pad or text), and tapping a committed line
to edit it.

## 7. Development test workouts

| # | Sport | Workout | Stage path |
|---|---|---|---|
| 1 | Swim | `8 x 50 Free @ :45` | S1 → SW1 → SW2 → commit |
| 2 | Swim | `4 x 100 IM @ 1:40` | S1 → SW1 → SW2 → commit |
| 3 | Swim | `6 x 25 Fly @ :30` | S1 → SW1 → SW2 → commit |
| 4 | Swim | `4 x 50 Kick, 15 sec rest` | S1 → SW1 → SW2 → commit |
| 5 | Swim | `3 x (100 Free + 50 Kick + 25 Free Sprint)` | S1 → (BL1 → BL2 → BL3) x3 → BL4 → Done |
| 6 | Gym | `4 x 8 Bench Press @ 135 lb` | S1 → GY1 → GY2 → GY3 → Done |
| 7 | Gym | `3 x 10 Squats` | S1 → GY1 → GY2 → Done |
| 8 | Gym | `3 x 12 Shoulder Press @ 20 lb` | S1 → GY1 → GY2 → GY3 → Done |
| 9 | Gym | `4 x 5 Deadlift @ 185 lb, 2 min rest` | S1 → GY1 → GY2 → GY3 → commit |
| 10 | Gym | `3 x (10 Squats + 10 Push-Ups + 20 Lunges)` | S1 → (BL1 → BL2 → BL3) x3 → BL4 → Done |

Test 5 changed from `25 Sprint` to `25 Free Sprint` because Effort is now its
own slot that follows Stroke.

## 8. Future steps

- **Swim equipment slot** — optional slot after Effort: Fins, Paddles,
  Snorkel, Pull Buoy, Kickboard; displayed as `w/ Fins`.
- **Unit options** — meters for swim distances and kg for weights, with a
  workout-level toggle and conversion of existing lines.
- **More sport tabs** — the tab design leaves room for sports beyond Swim and
  Gym (e.g. running, cycling), each with its own grammar.
