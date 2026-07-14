import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, BarChart3 } from 'lucide-react';
import WeekView from './WeekView';
import InWorkoutSession from './InWorkoutSession';
import Analytics from './Analytics';
import {
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

export default function WorkoutModule() {
  const [subTab, setSubTab] = useState('semana'); // 'semana' | 'analiticas'
  const [loaded, setLoaded] = useState(false);

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

  const updateActiveRoutine = (updater) => {
    setRoutines((prev) => prev.map((r) => (r.id === activeRoutineId ? updater(r) : r)));
  };

  // ------------------------------- Rutinas --------------------------------

  const handleCreateRoutine = (templateId, name) => {
    const routine = buildRoutineFromTemplate(templateId, name);
    setRoutines((prev) => [...prev, routine]);
    setActiveRoutineId(routine.id);
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
      <div className="grid grid-cols-2 gap-2 bg-neutral-900 border border-orange-500/20 rounded-2xl p-1">
        <button
          onClick={() => setSubTab('semana')}
          className={`py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            subTab === 'semana' ? 'bg-orange-500 text-neutral-900' : 'text-slate-400'
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Semana
        </button>
        <button
          onClick={() => setSubTab('analiticas')}
          className={`py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            subTab === 'analiticas' ? 'bg-orange-500 text-neutral-900' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Analíticas
        </button>
      </div>

      {subTab === 'semana' && (
        <WeekView
          routines={routines}
          activeRoutine={activeRoutine}
          activeRoutineId={activeRoutineId}
          setActiveRoutineId={setActiveRoutineId}
          exercises={exercises}
          onCreateRoutine={handleCreateRoutine}
          onAddExercise={handleAddExercise}
          onRemoveExercise={handleRemoveExercise}
          onUpdateTarget={handleUpdateTarget}
          onCreateCustomExercise={handleCreateCustomExercise}
          onStartSession={handleStartSession}
        />
      )}

      {subTab === 'analiticas' && <Analytics sessionsMap={sessions} exercisesById={exercisesById} />}
    </div>
  );
}
