# Context-Aware Workout Input Interface

## Overview

The goal of this project is to build a mobile-style web application that makes
it faster and easier to enter structured workouts. Structured workouts often
contain a mix of repetitions, distances, exercises, times, rest periods,
weights, symbols, and repeated groups. Typing these manually with a standard
mobile keyboard can be slow and repetitive. For example, a swimmer may want to
enter `8 × 50 Free @ :45`, while someone creating a gym workout may enter
`3 × (10 Squats + 10 Push-Ups + 20 Lunges)`. The coding project will focus on
creating an interface that understands the structure of these workouts and
predicts what the user is likely to enter next.

## Interface

The application will be built as a phone-sized web interface using React. At
the top of the screen, the user will see the workout they are currently
creating. Below that will be a prediction strip that changes depending on the
current state of the workout. For example, if the user enters `8`, the
interface may suggest `8 × 25`, `8 × 50`, and `8 × 100`. If the user selects
`8 × 50`, the suggestions will then change to swimming options such as Free,
Back, Breast, Fly, or IM. After selecting a stroke, the interface may suggest
interval or rest options such as `@ :40`, `@ :45`, or `@ :50`. The user can tap
these suggestions instead of typing the full workout manually.

## Supported Workouts

The project will support two main workout types: swimming and gym-based
workouts. Swimming entries will follow a structure such as repetition,
distance, stroke, and interval or rest. Gym entries will follow a structure
such as sets, repetitions, exercise, optional weight, and rest. The system will
also support multi-part workout blocks, such as
`3 × (10 Squats + 10 Push-Ups + 20 Lunges)`, so users do not need to manually
type symbols or repeat the same group multiple times.

## Prediction Approach

The first version of the system will use simple rule-based logic rather than
machine learning. The program will keep track of what stage of the workout the
user is currently entering and use that information to determine which
suggestions should appear next. For example, after a swimming distance is
selected, the program will suggest stroke types, while after a gym exercise is
selected, it may suggest weight or rest options.

The full rule set is defined in [grammar.md](grammar.md).

## Evaluation

The main purpose of the coding portion is to create a working prototype of this
context-aware input technique. Later in the semester, the prototype can be
compared with a standard mobile keyboard to evaluate whether it reduces entry
time, number of taps, and errors while making workout creation easier for
users.
