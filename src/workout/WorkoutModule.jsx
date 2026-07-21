import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, BarChart3, Dumbbell, Flame } from 'lucide-react';
import ModuleIntro from '../ModuleIntro';
import SubTabs from '../lib/SubTabs';
import WeekView from './WeekView';
import TodayView from './TodayView';
import InWorkoutSession from './InWorkoutSession';
import ProgressView from './ProgressView';
import {
  getRoutineDayForDate,
  getSessionsForDate,
  getRecentSessions,
  computeWeekPlan,
  summarizeSession,
  loadExercises,
  saveExercises,
  loadRoutines,
  saveRoutines,
  loadActiveRoutineId,
  saveActiveRoutineId,
  loadSessions,
  saveSessions,
  loadActiveSession,
  saveActiveSession,
  clearActiveSession,
  buildRoutineFromTemplate,
  addExerciseToDay,
  removeExerciseFromDay,
  updateRoutineExerciseTarget,
  createCustomExercise,
  startSession,
  addSetToExercise,
  updateSet as updateSetInSession,
  removeSet as removeSetInSession,
  updateExerciseNotes,
  substituteExercise,
  finishSession,
} from './workoutStorage';

const workoutBadge = (Icon) => (
  <div className="flex items-center justify-center w-28 h-28 rounded-full bg-entreno-500/10 border border-entreno-500/30">
    <Icon className="w-12 h-12 text-entreno-400" />
  </div>
);

const WORKOUT_INTRO_SLIDES = [
  {
    key: 'intro',
    visual: workoutBadge(Dumbbell),
    title: 'Armá y seguí tus entrenamientos',
    text: 'Creá una rutina semanal, registrá tus series y mirá cómo progresás con el tiempo.',
  },
  {
    key: 'hoy',
    visual: workoutBadge(Flame),
    title: 'Todo empieza en «Hoy»',
    text: 'Te dice qué te toca hoy y arranca el entreno de un toque. Si es día de descanso, también.',
  },
  {
    key: 'semana',
    visual: workoutBadge(CalendarDays),
    title: 'Tu semana de entreno',
    text: 'Elegí una plantilla y armá los ejercicios de cada día. Se configura una vez.',
  },
  {
    key: 'progreso',
    visual: workoutBadge(BarChart3),
    title: 'Mirá tu progreso',
    text: 'Volumen, series por músculo, récords y el historial completo de tus sesiones.',
  },
];

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: Flame },
  { id: 'semana', label: 'Semana', icon: CalendarDays },
  { id: 'progreso', label: 'Progreso', icon: BarChart3 },
];

export default function WorkoutModule() {
  const [subTab, setSubTab] = useState('hoy'); // 'hoy' | 'semana' | 'progreso'
  const [loaded, setLoaded] = useState(false);
  // El editor de día y el alta de rutina se abren tanto desde "Semana" como
  // desde el hero de "Hoy", así que el estado vive acá y WeekView lo recibe
  // controlado.
  const [editingDayId, setEditingDayId] = useState(null);
  const [showNewRoutine, setShowNewRoutine] = useState(false);

  const [exercises, setExercises] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [activeRoutineId, setActiveRoutineId] = useState(null);
  const [sessions, setSessions] = useState({});
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    setExercises(loadExercises());
    setRoutines(loadRoutines());
    setActiveRoutineId(loadActiveRoutineId());
    setSessions(loadSessions());
    setActiveSession(loadActiveSession());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveExercises(exercises);
  }, [exercises, loaded]);

  useEffect(() => {
    if (loaded) saveRoutines(routines);
  }, [routines, loaded]);

  useEffect(() => {
    if (loaded) saveActiveRoutineId(activeRoutineId);
  }, [activeRoutineId, loaded]);

  useEffect(() => {
    if (loaded) saveSessions(sessions);
  }, [sessions, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (activeSession) saveActiveSession(activeSession);
    else clearActiveSession();
  }, [activeSession, loaded]);

  const exercisesById = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);
  const activeRoutine = useMemo(() => routines.find((r) => r.id === activeRoutineId) || null, [routines, activeRoutineId]);

  // Estado de hoy y de la semana, compartido entre "Hoy" y "Semana".
  const todayDay = useMemo(() => getRoutineDayForDate(activeRoutine), [activeRoutine]);
  const todaySessions = useMemo(() => getSessionsForDate(sessions), [sessions]);
  const weekPlan = useMemo(() => computeWeekPlan(activeRoutine, sessions), [activeRoutine, sessions]);
  const lastSession = useMemo(() => getRecentSessions(sessions, 1)[0] || null, [sessions]);
  const lastSessionSummary = useMemo(
    () => (lastSession ? summarizeSession(lastSession, exercisesById) : null),
    [lastSession, exercisesById]
  );

  const updateActiveRoutine = (updater) => {
    setRoutines((prev) => prev.map((r) => (r.id === activeRoutineId ? updater(r) : r)));
  };

  // ------------------------------- Rutinas --------------------------------

  const handleCreateRoutine = (templateId, name) => {
    const routine = buildRoutineFromTemplate(templateId, name);
    setRoutines((prev) => [...prev, routine]);
    setActiveRoutineId(routine.id);
  };

  const handleRenameRoutine = (routineId, name) => {
    const clean = name.trim();
    if (!clean) return;
    setRoutines((prev) => prev.map((r) => (r.id === routineId ? { ...r, name: clean } : r)));
  };

  const handleDeleteRoutine = (routineId) => {
    const next = routines.filter((r) => r.id !== routineId);
    setRoutines(next);
    if (activeRoutineId === routineId) setActiveRoutineId(next[0]?.id || null);
  };

  const handleCreateCustomExercise = (data) => {
    const newExercise = createCustomExercise(data);
    setExercises((prev) => [...prev, newExercise]);
    return newExercise.id;
  };

  const handleAddExercise = (dayId, exerciseId) => {
    updateActiveRoutine((r) => addExerciseToDay(r, dayId, exerciseId));
  };

  const handleRemoveExercise = (dayId, routineExerciseId) => {
    updateActiveRoutine((r) => removeExerciseFromDay(r, dayId, routineExerciseId));
  };

  const handleUpdateTarget = (dayId, routineExerciseId, patch) => {
    updateActiveRoutine((r) => updateRoutineExerciseTarget(r, dayId, routineExerciseId, patch));
  };

  // ------------------------------- Sesiones --------------------------------

  const handleStartSession = (day) => {
    setActiveSession(startSession(activeRoutine, day));
  };

  const handleAddSet = (sessionExerciseId, set) => {
    setActiveSession((s) => addSetToExercise(s, sessionExerciseId, set));
  };

  const handleUpdateSet = (sessionExerciseId, setId, patch) => {
    setActiveSession((s) => updateSetInSession(s, sessionExerciseId, setId, patch));
  };

  const handleRemoveSet = (sessionExerciseId, setId) => {
    setActiveSession((s) => removeSetInSession(s, sessionExerciseId, setId));
  };

  const handleUpdateNotes = (sessionExerciseId, notes) => {
    setActiveSession((s) => updateExerciseNotes(s, sessionExerciseId, notes));
  };

  const handleSubstitute = (sessionExerciseId, newExerciseId) => {
    setActiveSession((s) => substituteExercise(s, sessionExerciseId, newExerciseId));
  };

  const handleFinishSession = () => {
    const finished = finishSession(activeSession);
    setSessions((prev) => ({ ...prev, [finished.id]: finished }));
    setActiveSession(null);
  };

  const handleDiscardSession = () => {
    setActiveSession(null);
  };

  if (!loaded) return null;

  if (activeSession) {
    return (
      <InWorkoutSession
        session={activeSession}
        exercisesById={exercisesById}
        exercises={exercises}
        sessionsMap={sessions}
        onAddSet={handleAddSet}
        onUpdateSet={handleUpdateSet}
        onRemoveSet={handleRemoveSet}
        onUpdateNotes={handleUpdateNotes}
        onSubstitute={handleSubstitute}
        onCreateCustomExercise={handleCreateCustomExercise}
        onFinish={handleFinishSession}
        onDiscard={handleDiscardSession}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ModuleIntro
        storageKey="workout_intro_seen"
        slides={WORKOUT_INTRO_SLIDES}
        dotActiveClass="bg-entreno-400"
        buttonClass="bg-entreno-500 hover:bg-entreno-400 text-neutral-900"
        finalLabel="Entendido"
      />

      <SubTabs tabs={TABS} value={subTab} onChange={setSubTab} accent="entreno" />

      {subTab === 'hoy' && (
        <TodayView
          activeRoutine={activeRoutine}
          todayDay={todayDay}
          todaySessions={todaySessions}
          lastSession={lastSession}
          lastSessionSummary={lastSessionSummary}
          weekPlan={weekPlan}
          summarize={(session) => summarizeSession(session, exercisesById)}
          onStartSession={handleStartSession}
          onEditDay={(day) => {
            setSubTab('semana');
            setEditingDayId(day.id);
          }}
          onCreateRoutine={() => {
            setSubTab('semana');
            setShowNewRoutine(true);
          }}
          onGoToWeek={() => setSubTab('semana')}
        />
      )}

      {subTab === 'semana' && (
        <WeekView
          routines={routines}
          activeRoutine={activeRoutine}
          activeRoutineId={activeRoutineId}
          setActiveRoutineId={setActiveRoutineId}
          exercises={exercises}
          weekPlan={weekPlan}
          editingDayId={editingDayId}
          setEditingDayId={setEditingDayId}
          showNewRoutine={showNewRoutine}
          setShowNewRoutine={setShowNewRoutine}
          onCreateRoutine={handleCreateRoutine}
          onRenameRoutine={handleRenameRoutine}
          onDeleteRoutine={handleDeleteRoutine}
          onAddExercise={handleAddExercise}
          onRemoveExercise={handleRemoveExercise}
          onUpdateTarget={handleUpdateTarget}
          onCreateCustomExercise={handleCreateCustomExercise}
          onStartSession={handleStartSession}
        />
      )}

      {subTab === 'progreso' && (
        <ProgressView
          sessionsMap={sessions}
          exercisesById={exercisesById}
          activeRoutine={activeRoutine}
          onGoToToday={() => setSubTab('hoy')}
        />
      )}
    </div>
  );
}
