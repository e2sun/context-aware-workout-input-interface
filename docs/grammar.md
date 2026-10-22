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

`[Reps x] Distance Stroke [Effort] [Interval | Rest]`

Without reps the line is a single swim, e.g. `100 Free`: tap a distance chip
(100–500 yd), or type a multiple of 25 and tap `n Stroke`.

| Slot | Required? | Suggestion chips | Custom entry | Display |
|---|---|---|---|---|
| Reps | Yes | 1, 2, 3, 4, 6, 8, 10, 12, 16 | Number pad | `8 x` |
| Distance | Yes | 25, 50, 75, 100, 150, 200, 400 | Number pad (multiples of 25) | `8 x 50` |
| Stroke / Type | Yes | Free, Back, Breast, Fly, IM, Kick, Pull, Drill, Choice | Text | `8 x 50 Free` |
| Effort | Optional | Easy, Moderate, Fast, Sprint, Build, Descend | Text | `8 x 50 Free Sprint` |
| Interval **or** Rest | Optional (one, not both) | Interval: by distance (section 3). Rest: 10, 15, 20, 30 sec | Time pad | `@ :45` / `, 15 sec rest` |

### Gym set

`[Sets x] Reps Exercise [Weight] [Rest]`

Without sets the line is a single set, e.g. `20 Push-Ups`: type `n` and tap
`n Exercise`.

| Slot | Required? | Suggestion chips | Custom entry | Display |
|---|---|---|---|---|
| Sets | Yes | 2, 3, 4, 5 | Number pad | `4 x` |
| Reps | Yes | 5, 6, 8, 10, 12, 15, 20 | Number pad | `4 x 8` |
| Exercise | Yes | Bench Press, Squats, Deadlift, Shoulder Press, Push-Ups, Lunges, Pull-Ups, Rows, Bicep Curls, Sit-Ups | Text (added to list) | `4 x 8 Bench Press` |
| Weight | Optional | By exercise (section 4) | Number pad | `@ 135 lb` |
| Rest | Optional | 30 sec, 60 sec, 90 sec, 2 min, 3 min | Time pad | `, 2 min rest` |

### Block (circuit)

`Rounds × ( Item + Item [+ Item ...] ) [Rest]`

| Slot | Required? | Suggestion chips | Display |
|---|---|---|---|
| Swim item | 2 or more | Number → `n x 25/50/100/200` → Stroke, **or** a single swim: distance chip (100–500 yd) → Stroke, or typed `n` (multiple of 25) → `n Stroke`; then [Effort] → [Interval] | `8 x 25 Free @ :30`, `100 Free` |
| Gym item | 2 or more | Reps (5, 8, 10, 12, 15, 20) → Exercise → [Weight] | `10 Squats`, `10 Squats @ 95 lb` |
| Separator | Automatic | Swim: `+ Add` · Gym: `+ Add Exercise` · both: `Finish Block` | ` + `, `)` |
| Rounds | Yes, chosen after Finish | `Repeat ×2`, `Repeat ×3`, `Repeat ×4`, or any count 1–99 on the number pad | `3 × (` |
| Block rest | Optional | Same rest chips as the sport | `, 1 min rest` |

Rules:
- A block is started with the **Start Block** chip, shown at S0 in both tabs.
- Items may carry an interval (swim) or weight (gym); rest is block-level only.
- Item modifiers are filled in display order: once a swim item has an
  interval, Effort is no longer offered for it.
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
| Multiply sign | Lowercase `x`, spaces on both sides; blocks use `×` for rounds | `8 x 50`, `3 × (` |
| Effort | Follows stroke, one space | `50 Free Sprint` |
| Interval | `@ ` + `:ss` under 1 min, `m:ss` otherwise | `@ :45`, `@ 1:40` |
| Weight | `@ ` + number + ` lb` | `@ 135 lb` |
| Rest | `, ` + time + ` rest`; `N sec` under 2 min, `N min` otherwise | `, 90 sec rest`, `, 2 min rest` |
| Block | `R × (` + items joined by ` + ` + `)` | `3 × (10 Squats + 10 Push-Ups + 20 Lunges)` |
| Exercise names | One fixed spelling, title case, bodyweight moves plural | `Squats`, `Push-Ups`, `Bench Press` |

## 6. Stages and transitions

**Typed numbers:** chips are predictions, not the only choices. Wherever a
slot takes a number, the number pad (or a computer keyboard: digits, `x`,
Backspace) builds a value and the chips for that slot are replaced by one chip
for it, which the user taps to confirm what the number means:

| Slot | Typed | Chip |
|---|---|---|
| Interval / rest time | Up to 2 digits = seconds, 3–4 digits = m:ss (`45`, `90`, `130`) | `@ 1:30`, `90 sec rest` |
| Weight | Pounds | `@ 140 lb` |
| Repeat count | 1–9999 | `Repeat ×12` |
| Distance / reps after **×** | Any number | the next slot's chips (stroke / exercise) |

A time whose seconds part is 60 or more (e.g. `175`) gets no time chip.
Backspace removes typed digits before any slot.


**Ending a line:** a **Done** chip is shown whenever the remaining slots are
all optional. When the user fills the *last* possible slot (swim interval/rest,
gym rest, block rest), the line is committed automatically — no extra tap.

| # | Stage | Chips shown | Tap → next stage |
|---|---|---|---|
| S0 | Line start | Number pad · Swim: reps, distance (`100 yd` …) · Gym: sets · **Start Block** | Number `n` → S1 · Swim distance → SW1 · Start Block → BL1 |
| S1 | Number entered | **Swim:** `n x 25/50/100/200`, `n Stroke` (single swim, when `n` is a multiple of 25) · **Gym:** `n x 5/8/10/12`, `n Exercise` (single set) · **×** key | `n x d` → SW1 / GY1 · single → SW2 / GY2 · × → S2 |
| S2 | `n x` typed | Swim: distance chips, or type a distance → Stroke · Gym: reps chips, or type reps → Exercise | → SW1 / SW2 · GY1 / GY2 |
| SW1 | Reps x distance done | Stroke / Type | → SW2 |
| SW2 | Stroke done | Effort, Interval (by distance), Rest, **Done** | Effort → SW3 · Interval/Rest → commit · Done → commit |
| SW3 | Effort done | Interval (by distance), Rest, **Done** | Interval/Rest → commit · Done → commit |
| GY1 | Sets x reps done | Exercise | → GY2 |
| GY2 | Exercise done | Weight (by exercise), Rest, **Done** | Weight → GY3 · Rest → commit · Done → commit |
| GY3 | Weight done | Rest, **Done** | Rest → commit · Done → commit |
| BL1 | Block item start | Swim: reps chips, distance chips (`100 yd` …) · Gym: reps chips · or number pad | → BL2 |
| BL2 | Item number done | Swim: `n x d`, `n Stroke`, then Stroke · Gym: `r Exercise` | → BL3 |
| BL3 | Item core done | Swim: Effort, Interval · Gym: Weight · plus `+ Add`, `Finish Block`* | Modifier → BL3 (that modifier removed) · `+ Add` → BL1 · Finish → BL4 |
| BL4 | Block closed | `Repeat ×2/×3/×4`, or type a count | → BL5 |
| BL5 | Rounds chosen | Rest, **Done** (number pad still edits the count) | Rest → commit · Done → commit |

\* `Finish Block` appears only once the block has 2 or more items.

Backspace inside a block steps back one slot: BL5 → BL4 (a typed count one digit at a time) → BL3, BL3 removes
the item's last modifier and then its core slots one at a time (→ BL2 → BL1,
numbers one digit at a time), an empty item is removed (→ previous item's
BL3), and deleting an empty block returns to S0.

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
| 5 | Swim | `3 × (100 Free + 50 Kick + 25 Free Sprint)` | Start Block → (BL1 → BL2 → BL3) x3 → BL4 → BL5 → Done |
| 6 | Gym | `4 x 8 Bench Press @ 135 lb` | S1 → GY1 → GY2 → GY3 → Done |
| 7 | Gym | `3 x 10 Squats` | S1 → GY1 → GY2 → Done |
| 8 | Gym | `3 x 12 Shoulder Press @ 20 lb` | S1 → GY1 → GY2 → GY3 → Done |
| 9 | Gym | `4 x 5 Deadlift @ 185 lb, 2 min rest` | S1 → GY1 → GY2 → GY3 → commit |
| 10 | Gym | `3 × (10 Squats + 10 Push-Ups + 20 Lunges)` | Start Block → (BL1 → BL2 → BL3) x3 → BL4 → BL5 → Done |

Test 5 changed from `25 Sprint` to `25 Free Sprint` because Effort is now its
own slot that follows Stroke.

## 8. Future steps

- **Swim equipment slot** — optional slot after Effort: Fins, Paddles,
  Snorkel, Pull Buoy, Kickboard; displayed as `w/ Fins`.
- **Unit options** — meters for swim distances and kg for weights, with a
  workout-level toggle and conversion of existing lines.
- **More sport tabs** — the tab design leaves room for sports beyond Swim and
  Gym (e.g. running, cycling), each with its own grammar.
- **Custom text entry** — a `Custom…` chip that opens the device keyboard for
  names not in the chip lists (e.g. a new exercise or stroke). Letters filter
  the existing chips; with no match the chip becomes `Add "<name>"`. Applies to
  single lines and block items alike. Also needed for the keyboard baseline in
  section 5.
- **Saved custom chips** — exercises, strokes and typed values (intervals,
  rests, weights) the user enters are saved and offered as regular chips next
  time, e.g. a typed `@ 1:15` joins that distance's interval chips.
