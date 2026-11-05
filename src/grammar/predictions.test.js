import { describe, expect, it } from 'vitest'
import * as swim from './swim.js'
import * as gym from './gym.js'
import { closestFirst, inBand, rankFirst } from './rank.js'
import { initialState, workoutReducer } from '../state/workoutReducer.js'

const SPORTS = { swim, gym }

function tap(state, label) {
  const g = SPORTS[state.sport]
  const chip = g
    .getSuggestions(state.current)
    .flatMap((group) => group.chips)
    .find((c) => c.label === label)
  if (!chip) throw new Error(`No "${label}" chip at stage ${g.getStage(state.current).id}`)
  return workoutReducer(state, { type: 'chip', chip })
}

const enter = (sport, labels, from = initialState(sport)) => labels.reduce(tap, from)
const typeNumber = (state, n) =>
  [...String(n)].reduce((s, d) => workoutReducer(s, { type: 'digit', digit: Number(d) }), state)

// The labels in one row of the strip.
function row(state, label) {
  const group = SPORTS[state.sport].getSuggestions(state.current).find((g) => g.label === label)
  return group ? group.chips.map((c) => c.label) : []
}

const swimLine = (...labels) => enter('swim', labels)
const gymLine = (...labels) => enter('gym', labels)
const swimBlock = (...labels) => enter('swim', ['Start Block', ...labels])
const gymBlock = (...labels) => enter('gym', ['Start Block', ...labels])

const STROKES = ['Free', 'Back', 'Breast', 'Fly', 'IM', 'Kick', 'Pull', 'Drill', 'Choice']
const EFFORTS = ['Easy', 'Moderate', 'Fast', 'Sprint', 'Build', 'Descend']
const EXERCISES = [
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
const sorted = (list) => [...list].sort()

describe('rank helpers', () => {
  it('rankFirst reorders without dropping or adding values', () => {
    expect(rankFirst(['c', 'x', 'a'], ['a', 'b', 'c', 'd'])).toEqual(['c', 'a', 'b', 'd'])
  })

  it('closestFirst keeps the original order on ties', () => {
    expect(closestFirst([10, 20, 30], 20)).toEqual([20, 10, 30])
    expect(closestFirst([30, 10], 20)).toEqual([30, 10])
  })

  it('inBand picks the first row the number fits', () => {
    const bands = [[5, 'low'], [Infinity, 'high']]
    expect([inBand(bands, 5), inBand(bands, 6)]).toEqual(['low', 'high'])
  })
})

describe('swim: strokes depend on distance', () => {
  it('short sets favour Free and Kick, and IM goes last', () => {
    expect(row(swimLine('8', '8 x 50'), 'Stroke').slice(0, 3)).toEqual(['Free', 'Kick', 'Back'])
    expect(row(swimLine('8', '8 x 50'), 'Stroke').at(-1)).toBe('IM')
    expect(row(swimLine('8', '8 x 25'), 'Stroke').at(-1)).toBe('IM')
  })

  it('IM ranks high at 100, and Fly goes last at long distances', () => {
    expect(row(swimLine('4', '4 x 100'), 'Stroke').slice(0, 2)).toEqual(['Free', 'IM'])
    expect(row(swimLine('2', '2 x 200'), 'Stroke').slice(0, 2)).toEqual(['Free', 'Pull'])
    expect(row(swimLine('2', '2 x 200'), 'Stroke').at(-1)).toBe('Fly')
  })

  it('typed distances rank the same way', () => {
    const s = typeNumber(workoutReducer(swimLine('2'), { type: 'times' }), 300)
    expect(row(s, 'Stroke').slice(0, 2)).toEqual(['Free', 'Pull'])
    const single = typeNumber(initialState('swim'), 400)
    expect(row(single, 'Single').slice(0, 2)).toEqual(['400 Free', '400 Pull'])
  })
})

describe('swim: distances depend on reps', () => {
  it.each([
    ['2', '2 x 200'],
    ['4', '4 x 100'],
    ['8', '8 x 50'],
    ['12', '12 x 25'],
  ])('%s reps -> %s first', (reps, first) => {
    expect(row(swimLine(reps), 'Set')[0]).toBe(first)
  })

  it('a multiple of 25 offers single swims first, other numbers only sets', () => {
    const groups = (n) => swim.getSuggestions(typeNumber(initialState('swim'), n).current).map((g) => g.label)
    expect(groups(100)).toEqual(['Single', 'Set'])
    expect(groups(8)).toEqual(['Set'])
  })
})

describe('swim: intervals depend on distance, stroke and effort', () => {
  it.each([
    [['8', '8 x 50', 'Free'], '@ :45'],
    [['8', '8 x 50', 'Fly'], '@ :55'],
    [['8', '8 x 50', 'Kick'], '@ 1:00'],
    [['8', '8 x 25', 'Fly'], '@ :30'],
    [['4', '4 x 100', 'Free'], '@ 1:30'],
    [['4', '4 x 100', 'Pull'], '@ 1:30'],
    [['4', '4 x 100', 'Back'], '@ 1:40'],
    [['4', '4 x 100', 'Kick'], '@ 2:00'],
    [['2', '2 x 200', 'Free'], '@ 3:00'],
    [['8', '8 x 50', 'Free', 'Sprint'], '@ :55'],
  ])('%j -> %s first', (labels, first) => {
    expect(row(swimLine(...labels), 'Interval')[0]).toBe(first)
  })

  it('keeps every preset and adds the estimate when no preset fits', () => {
    expect(row(swimLine('4', '4 x 100', 'Drill'), 'Interval')).toEqual([
      '@ 2:05',
      '@ 2:00',
      '@ 1:45',
      '@ 1:40',
      '@ 1:30',
    ])
  })

  it('offers intervals for the 300 and 500 yd single swims', () => {
    expect(row(enter('swim', ['300 yd', 'Free']), 'Interval')[0]).toBe('@ 4:30')
    expect(row(enter('swim', ['500 yd', 'Free']), 'Interval')[0]).toBe('@ 7:30')
  })

  it('estimates intervals for a typed distance with no presets', () => {
    const s = tap(typeNumber(workoutReducer(swimLine('4'), { type: 'times' }), 125), 'Free')
    expect(row(s, 'Interval')).toEqual(['@ 2:00', '@ 1:45', '@ 2:15'])
  })
})

describe('swim: efforts and rests', () => {
  it('efforts follow distance, with Drill staying easy', () => {
    expect(row(swimLine('8', '8 x 25', 'Free'), 'Effort')[0]).toBe('Fast')
    expect(row(swimLine('4', '4 x 100', 'Free'), 'Effort')[0]).toBe('Moderate')
    expect(row(swimLine('8', '8 x 25', 'Drill'), 'Effort').slice(0, 2)).toEqual(['Easy', 'Moderate'])
  })

  it('rests grow with distance and with Sprint', () => {
    expect(row(swimLine('8', '8 x 50', 'Free'), 'Rest')[0]).toBe('15 sec rest')
    expect(row(swimLine('2', '2 x 200', 'Free'), 'Rest')[0]).toBe('20 sec rest')
    expect(row(enter('swim', ['400 yd', 'Free']), 'Rest')[0]).toBe('30 sec rest')
    expect(row(swimLine('8', '8 x 50', 'Free', 'Sprint'), 'Rest')[0]).toBe('30 sec rest')
  })
})

describe('gym: chips depend on sets and reps', () => {
  it.each([
    ['3', '3 x 10'],
    ['4', '4 x 8'],
    ['5', '5 x 5'],
  ])('%s sets -> %s first', (sets, first) => {
    expect(row(gymLine(sets), 'Reps')[0]).toBe(first)
  })

  it('low reps favour heavy lifts, high reps favour bodyweight', () => {
    expect(row(gymLine('5', '5 x 5'), 'Exercise').slice(0, 2)).toEqual(['Deadlift', 'Squats'])
    expect(row(gymLine('3', '3 x 10'), 'Exercise').slice(0, 2)).toEqual(['Bench Press', 'Squats'])
    const typed = typeNumber(workoutReducer(gymLine('3'), { type: 'times' }), 20)
    expect(row(typed, 'Exercise').slice(0, 2)).toEqual(['Push-Ups', 'Sit-Ups'])
  })

  it('a number too high to be sets offers single sets first', () => {
    const groups = (n) => gym.getSuggestions(typeNumber(initialState('gym'), n).current).map((g) => g.label)
    expect(groups(4)).toEqual(['Reps', 'Single'])
    expect(groups(20)).toEqual(['Single', 'Reps'])
    expect(row(typeNumber(initialState('gym'), 20), 'Single')[0]).toBe('20 Push-Ups')
  })
})

describe('gym: weights and rests depend on the exercise and reps', () => {
  it.each([
    [['4', '4 x 5', 'Bench Press'], '@ 155 lb'],
    [['4', '4 x 8', 'Bench Press'], '@ 135 lb'],
    [['4', '4 x 12', 'Bench Press'], '@ 115 lb'],
    [['3', '3 x 12', 'Shoulder Press'], '@ 20 lb'],
  ])('%j -> %s first', (labels, first) => {
    expect(row(gymLine(...labels), 'Weight')[0]).toBe(first)
  })

  it.each([
    [['4', '4 x 5', 'Deadlift'], '3 min rest'],
    [['4', '4 x 8', 'Deadlift'], '3 min rest'],
    [['4', '4 x 8', 'Bench Press'], '2 min rest'],
    [['4', '4 x 5', 'Squats'], '3 min rest'],
    [['3', '3 x 10', 'Rows'], '90 sec rest'],
    [['3', '3 x 12', 'Bicep Curls'], '60 sec rest'],
    [['3', '3 x 10', 'Push-Ups'], '60 sec rest'],
  ])('%j -> %s first', (labels, first) => {
    expect(row(gymLine(...labels), 'Rest')[0]).toBe(first)
  })

  it('high reps lower the rest, and tiers stay in range', () => {
    const s = typeNumber(workoutReducer(gymLine('3'), { type: 'times' }), 15)
    expect(row(tap(s, 'Bench Press'), 'Rest')[0]).toBe('90 sec rest')
    const pushUps = typeNumber(workoutReducer(gymLine('3'), { type: 'times' }), 30)
    expect(row(tap(pushUps, 'Push-Ups'), 'Rest')[0]).toBe('60 sec rest')
  })

  it('the rest ranking still applies after a weight is chosen', () => {
    expect(row(gymLine('4', '4 x 5', 'Deadlift', '@ 225 lb'), 'Rest')[0]).toBe('3 min rest')
  })
})

describe('blocks use the same predictions as lines', () => {
  it.each([
    [['8', '8 x 50'], 'Stroke'],
    [['4', '4 x 100', 'Kick'], 'Interval'],
    [['4', '4 x 100', 'Kick'], 'Effort'],
    [['8', '8 x 50', 'Free', 'Sprint'], 'Interval'],
  ])('swim %j %s', (labels, label) => {
    expect(row(swimBlock(...labels), label)).toEqual(row(swimLine(...labels), label))
  })

  it('later swim items are predicted from their own context', () => {
    const s = swimBlock('8', '8 x 25', 'Free', '+ Add', '4', '4 x 100', 'Kick')
    expect(row(s, 'Interval')[0]).toBe('@ 2:00')
  })

  it('gym items rank exercises and weights by their reps', () => {
    expect(row(gymBlock('5'), 'Exercise').slice(0, 2)).toEqual(['5 Deadlift', '5 Squats'])
    expect(row(gymBlock('20'), 'Exercise').slice(0, 2)).toEqual(['20 Push-Ups', '20 Sit-Ups'])
    expect(row(gymBlock('5', '5 Bench Press'), 'Weight')[0]).toBe('@ 155 lb')
  })

  it('exercises already in the block go last but stay available', () => {
    const s = gymBlock('10', '10 Bench Press', '+ Add Exercise', '10')
    expect(row(s, 'Exercise')[0]).toBe('10 Squats')
    expect(row(s, 'Exercise').at(-1)).toBe('10 Bench Press')
  })

  it('gym block rest follows the most demanding item', () => {
    const light = ['20', '20 Push-Ups', '+ Add Exercise', '20', '20 Sit-Ups', 'Finish Block', 'Repeat ×3']
    expect(row(gymBlock(...light), 'Rest')[0]).toBe('60 sec rest')
    const heavy = ['5', '5 Deadlift', '+ Add Exercise', '20', '20 Push-Ups', 'Finish Block', 'Repeat ×3']
    expect(row(gymBlock(...heavy), 'Rest')[0]).toBe('3 min rest')
  })

  it('swim block rest follows the yards in one round, and any sprint', () => {
    const short = ['2', '2 x 25', 'Free', '+ Add', '2', '2 x 25', 'Kick', 'Finish Block', 'Repeat ×3']
    expect(row(swimBlock(...short), 'Rest')[0]).toBe('15 sec rest')
    const long = ['400 yd', 'Free', '+ Add', '100 yd', 'Kick', 'Finish Block', 'Repeat ×2']
    expect(row(swimBlock(...long), 'Rest')[0]).toBe('30 sec rest')
    const sprint = ['2', '2 x 25', 'Free', 'Sprint', '+ Add', '2', '2 x 25', 'Kick', 'Finish Block', 'Repeat ×3']
    expect(row(swimBlock(...sprint), 'Rest')[0]).toBe('30 sec rest')
  })
})

describe('ranking never removes a preset', () => {
  it.each([1, 2, 3, 4, 5, 6, 8, 12, 16, 40])('swim: all %i x d chips stay', (reps) => {
    const s = typeNumber(initialState('swim'), reps)
    expect(sorted(row(s, 'Set'))).toEqual(sorted([25, 50, 100, 200].map((d) => `${reps} x ${d}`)))
  })

  it.each([25, 50, 75, 100, 150, 200, 300, 400, 500, 1000])('swim: all strokes and efforts stay at %i yd', (distance) => {
    const s = tap(typeNumber(workoutReducer(typeNumber(initialState('swim'), 2), { type: 'times' }), distance), 'Free')
    expect(sorted(row(s, 'Effort'))).toEqual(sorted(EFFORTS))
    expect(sorted(row(s, 'Rest'))).toEqual(sorted(['10 sec rest', '15 sec rest', '20 sec rest', '30 sec rest']))
    const before = typeNumber(workoutReducer(typeNumber(initialState('swim'), 2), { type: 'times' }), distance)
    expect(sorted(row(before, 'Stroke'))).toEqual(sorted(STROKES))
  })

  it.each([1, 5, 6, 10, 12, 13, 20, 100])('gym: all exercises stay at %i reps', (reps) => {
    const s = typeNumber(workoutReducer(typeNumber(initialState('gym'), 3), { type: 'times' }), reps)
    expect(sorted(row(s, 'Exercise'))).toEqual(sorted(EXERCISES))
  })

  it.each(EXERCISES)('gym: every rest stays for %s', (exercise) => {
    const s = tap(typeNumber(workoutReducer(typeNumber(initialState('gym'), 3), { type: 'times' }), 8), exercise)
    expect(row(s, 'Rest')).toHaveLength(5)
  })
})

describe('predicted rows stay valid for unusual values', () => {
  it.each([1, 3, 10, 26, 33, 125, 1000, 9999])('typed distance %i gives unique, positive intervals', (distance) => {
    for (const stroke of STROKES) {
      for (const effort of [null, ...EFFORTS]) {
        let s = tap(typeNumber(workoutReducer(typeNumber(initialState('swim'), 2), { type: 'times' }), distance), stroke)
        if (effort) s = tap(s, effort)
        const labels = row(s, 'Interval')
        expect(labels.length).toBeGreaterThan(0)
        expect(new Set(labels).size).toBe(labels.length)
        expect(labels.join()).not.toContain('-')
        expect(labels).not.toContain('@ :00')
      }
    }
  })
})

describe('custom input still wins over predictions', () => {
  it('a typed interval replaces the ranked chips', () => {
    const s = typeNumber(swimLine('8', '8 x 50', 'Kick'), 52)
    expect(row(s, 'Interval')).toEqual(['@ :52'])
    expect(tap(s, '@ :52').lines).toEqual(['8 x 50 Kick @ :52'])
  })

  it('a typed block rest replaces the ranked chips', () => {
    const labels = ['5', '5 Deadlift', '+ Add Exercise', '5', '5 Squats', 'Finish Block', 'Repeat ×2']
    const s = typeNumber(gymBlock(...labels), 45)
    expect(row(s, 'Rest')).toEqual(['45 sec rest'])
  })

  it('low-ranked chips still work', () => {
    expect(swimLine('8', '8 x 25', 'IM', 'Done').lines).toEqual(['8 x 25 IM'])
    expect(gymLine('5', '5 x 12', 'Sit-Ups', '30 sec rest').lines).toEqual(['5 x 12 Sit-Ups, 30 sec rest'])
  })

  it('a typed weight outside the presets keeps the exercise rest ranking', () => {
    const s = tap(typeNumber(gymLine('4', '4 x 5', 'Deadlift'), 500), '@ 500 lb')
    expect(row(s, 'Rest')[0]).toBe('3 min rest')
  })
})

describe('swim equipment', () => {
  const rows = (state) => swim.getSuggestions(state.current).map((g) => g.label)
  const text = (state) => swim.format(state.current)
  const del = (state) => workoutReducer(state, { type: 'delete' })
  const stage = (state) => swim.getStage(state.current).id

  it('is offered after the stroke and after an effort', () => {
    expect(rows(swimLine('8', '8 x 50', 'Free'))).toEqual(['Effort', 'Equipment', 'Interval', 'Rest', null])
    expect(rows(swimLine('8', '8 x 50', 'Free', 'Fast'))).toEqual(['Equipment', 'Interval', 'Rest', null])
  })

  it('removes effort and equipment once equipment is chosen', () => {
    const s = swimLine('8', '8 x 50', 'Free', 'Fins')
    expect(stage(s)).toBe('SW4')
    expect(rows(s)).toEqual(['Interval', 'Rest', null])
  })

  it.each([
    [['8', '8 x 50', 'Kick', 'Fins', '@ :55'], '8 x 50 Kick w/ Fins @ :55'],
    [['4', '4 x 100', 'Pull', 'Fast', 'Pull Buoy', '20 sec rest'], '4 x 100 Pull Fast w/ Pull Buoy, 20 sec rest'],
    [['6', '6 x 50', 'Free', 'Paddles', 'Done'], '6 x 50 Free w/ Paddles'],
  ])('%j -> %s', (labels, expected) => {
    expect(swimLine(...labels).lines).toEqual([expected])
  })

  it('works on a single swim', () => {
    expect(enter('swim', ['200 yd', 'Free', 'Snorkel', 'Done']).lines).toEqual(['200 Free w/ Snorkel'])
  })

  it.each([
    ['Kick', ['Kickboard', 'Fins']],
    ['Pull', ['Pull Buoy', 'Paddles']],
    ['Free', ['Paddles', 'Fins']],
    ['Drill', ['Fins', 'Snorkel']],
    ['Fly', ['Fins', 'Paddles']],
  ])('%s ranks %j first', (stroke, first) => {
    expect(row(swimLine('8', '8 x 50', stroke), 'Equipment').slice(0, 2)).toEqual(first)
  })

  it.each(STROKES)('keeps every chip for %s', (stroke) => {
    expect(sorted(row(swimLine('8', '8 x 50', stroke), 'Equipment'))).toEqual(
      sorted(['Fins', 'Paddles', 'Snorkel', 'Pull Buoy', 'Kickboard']),
    )
  })

  it('fins and paddles shorten the interval, other equipment does not', () => {
    expect(row(swimLine('8', '8 x 50', 'Kick', 'Fins'), 'Interval')[0]).toBe('@ :55')
    expect(row(swimLine('4', '4 x 100', 'Free', 'Paddles'), 'Interval')[0]).toBe('@ 1:25')
    expect(row(swimLine('8', '8 x 50', 'Kick', 'Kickboard'), 'Interval')[0]).toBe('@ 1:00')
  })

  it('delete removes equipment first, then effort', () => {
    let s = swimLine('8', '8 x 50', 'Free', 'Sprint', 'Fins')
    expect(text(s)).toBe('8 x 50 Free Sprint w/ Fins')
    s = del(s)
    expect([stage(s), text(s)]).toEqual(['SW3', '8 x 50 Free Sprint'])
    s = del(s)
    expect([stage(s), text(s)]).toEqual(['SW2', '8 x 50 Free'])
  })

  it('a typed interval follows the equipment', () => {
    const s = typeNumber(swimLine('8', '8 x 50', 'Kick', 'Fins'), 52)
    expect(tap(s, '@ :52').lines).toEqual(['8 x 50 Kick w/ Fins @ :52'])
  })

  it('works in blocks, using the same ranking and interval rules', () => {
    const labels = ['8', '8 x 50', 'Kick']
    expect(row(swimBlock(...labels), 'Equipment')).toEqual(row(swimLine(...labels), 'Equipment'))
    let s = swimBlock(...labels, 'Fins')
    expect(rows(s)).toEqual(['Interval', null])
    expect(row(s, 'Interval')).toEqual(row(swimLine(...labels, 'Fins'), 'Interval'))
    s = tap(s, '@ :55')
    expect(text(s)).toBe('(8 x 50 Kick w/ Fins @ :55')
    expect(rows(s)).toEqual([null])
    expect(text(del(s))).toBe('(8 x 50 Kick w/ Fins')
    expect(text(del(del(s)))).toBe('(8 x 50 Kick')
    s = enter('swim', ['+ Add', '100 yd', 'Free', 'Finish Block', 'Repeat ×2', 'Done'], s)
    expect(s.lines).toEqual(['2 × (8 x 50 Kick w/ Fins @ :55 + 100 Free)'])
  })
})
