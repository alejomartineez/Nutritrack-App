import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import TodayView from './TodayView';
import ProgressView from './ProgressView';
import RoutineView from './RoutineView';
import ExerciseBlock from './ExerciseBlock';
import NumberPad from './NumberPad';
import { DEFAULT_EXERCISES } from './workoutData';
import { buildRoutineFromTemplate, startSession } from './workoutStorage';
import { computeWeekPlan, buildHistoryIndex, finishedSessions } from './workoutStats';
import { dateKeyOf, addDaysToKey } from '../lib/dates';

// Humo: las pantallas renderizan con datos reales y legados sin romperse.

const exercisesById = Object.fromEntries(DEFAULT_EXERCISES.map((e) => [e.id, e]));
const routine = buildRoutineFromTemplate('upper_lower4');
const today = dateKeyOf();
const legacy = {
  id: 'old',
  routineId: 'x',
  dayId: 'y',
  dayName: 'Push',
  date: addDaysToKey(today, -3),
  startedAt: 1,
  endedAt: 3600001,
  exercises: [
    {
      id: 'e1',
      exerciseId: 'ex_press_banca',
      order: 0,
      notes: 'agarre cerrado',
      sets: [
        { id: 's1', type: 'warmup', weight: '40', reps: '10', rir: '', completed: true },
        { id: 's2', type: 'myorep', weight: 80, reps: 8, rir: '4+', completed: true },
        { id: 's3', type: 'superset', weight: '', reps: '', rir: '', completed: false },
      ],
    },
    { id: 'e2', exerciseId: 'ex_desconocido', sets: [{ id: 's4', type: 'effective', weight: 10, reps: 10, completed: true }] },
    { id: 'e3', exerciseId: 'ex_dominadas', sets: [{ id: 's5', type: 'effective', weight: '', reps: 9, completed: true }] },
  ],
};
const sessions = { old: legacy };
const noop = () => {};

describe('pantallas de entreno', () => {
  it('Hoy: sin rutina, planificado, descanso, en curso y hecho', () => {
    const base = { weekPlan: computeWeekPlan(routine, sessions, today), exercisesById, lastSession: legacy, onStart: noop, onStartFree: noop, onResume: noop, onGoRoutine: noop, onEditDay: noop, onOpenSession: noop };
    expect(renderToString(<TodayView {...base} routine={null} todayDay={null} todaySessions={[]} activeSession={null} />)).toContain('Empezá a entrenar');
    expect(renderToString(<TodayView {...base} routine={routine} todayDay={routine.days[0]} todaySessions={[]} activeSession={null} />)).toContain('Empezar');
    expect(renderToString(<TodayView {...base} routine={routine} todayDay={routine.days[2]} todaySessions={[]} activeSession={null} />)).toContain('descanso');
    expect(renderToString(<TodayView {...base} routine={routine} todayDay={routine.days[0]} todaySessions={[]} activeSession={startSession(routine, routine.days[0])} />)).toContain('Continuar');
    expect(renderToString(<TodayView {...base} routine={routine} todayDay={routine.days[0]} todaySessions={[{ ...legacy, date: today }]} activeSession={null} />)).toContain('Entrenaste hoy');
  });

  it('Progreso con datos legados y vacío', () => {
    const html = renderToString(<ProgressView sessionsMap={sessions} exercisesById={exercisesById} routine={routine} onOpenSession={noop} onOpenExercise={noop} onLogPast={noop} />);
    expect(html).toContain('Historial');
    expect(html).toContain('Récords');
    expect(renderToString(<ProgressView sessionsMap={{}} exercisesById={exercisesById} routine={null} onOpenSession={noop} onOpenExercise={noop} onLogPast={noop} />)).toContain('Todavía no hay entrenos');
  });

  it('Rutina: plantillas y semana', () => {
    const props = { routines: [routine], setActiveRoutineId: noop, onCreate: noop, onRename: noop, onDelete: noop, updateRoutine: noop, exercises: DEFAULT_EXERCISES, exercisesById, exerciseActions: {}, editDayId: null, setEditDayId: noop, onStart: noop };
    expect(renderToString(<RoutineView {...props} routine={null} />)).toContain('Full body 3 días');
    expect(renderToString(<RoutineView {...props} routine={routine} />)).toContain('Torso A');
  });

  it('Bloque de ejercicio muestra "Anterior", tipos legados y récord', () => {
    const { entries, best } = buildHistoryIndex(sessions);
    const sex = {
      id: 'x',
      exerciseId: 'ex_press_banca',
      notes: '',
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      sets: [
        { id: 'a', type: 'warmup', weight: '', reps: '', rir: '', completed: false },
        { id: 'b', type: 'effective', weight: 85, reps: 8, rir: '', completed: true },
        { id: 'c', type: 'myorep', weight: '', reps: '', rir: '', completed: false },
      ],
    };
    const html = renderToString(
      <ExerciseBlock sex={sex} exercise={exercisesById.ex_press_banca} prevEntry={entries.get('ex_press_banca')[0]} best={best.get('ex_press_banca')} hint={null} editing={{ setId: 'c', field: 'weight', buffer: '', fresh: true }} onOpenCell={noop} onCheck={noop} onAdopt={noop} onSetMenu={noop} onAddSet={noop} onMenu={noop} onHistory={noop} />
    );
    expect(html).toContain('40 × 10'); // calentamiento vs calentamiento
    expect(html).toContain('Récord');
    expect(html).toContain('>M<');
    expect(finishedSessions(sessions)).toHaveLength(1);
  });

  it('Teclado', () => {
    const html = renderToString(<NumberPad label="Peso · Serie 1" decimal step={2.5} reference="60 kg" nextLabel="Siguiente" onKey={noop} onStep={noop} onNext={noop} onCancel={noop} onPlates={noop} />);
    expect(html).toContain('+2,5');
    expect(html).toContain('Anterior 60 kg');
  });
});
