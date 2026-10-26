import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  loadWorkoutSettings,
  saveWorkoutSettings,
  createCustomExercise,
} from './workoutStorage';

/** Estado que se guarda solo cuando cambia (no en el primer render). */
function usePersisted(load, save) {
  const [value, setValue] = useState(load);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    save(value);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return [value, setValue];
}

const saveActive = (s) => (s ? saveActiveSession(s) : clearActiveSession());

export function useWorkoutData() {
  const [exercises, setExercises] = usePersisted(loadExercises, saveExercises);
  const [routines, setRoutines] = usePersisted(loadRoutines, saveRoutines);
  const [activeRoutineId, setActiveRoutineId] = usePersisted(loadActiveRoutineId, saveActiveRoutineId);
  const [sessions, setSessions] = usePersisted(loadSessions, saveSessions);
  const [activeSession, setActiveSession] = usePersisted(loadActiveSession, saveActive);
  const [settings, setSettings] = usePersisted(loadWorkoutSettings, saveWorkoutSettings);

  const exercisesById = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);
  const activeRoutine = useMemo(() => routines.find((r) => r.id === activeRoutineId) || null, [routines, activeRoutineId]);

  const createExercise = useCallback(
    (data) => {
      const created = createCustomExercise(data);
      setExercises((list) => [...list, created]);
      return created;
    },
    [setExercises]
  );
  const updateExercise = useCallback(
    (id, patch) => setExercises((list) => list.map((e) => (e.id === id && e.isCustom ? { ...e, ...patch } : e))),
    [setExercises]
  );
  // Se oculta en vez de borrarse: el historial lo sigue nombrando.
  const archiveExercise = useCallback(
    (id) => setExercises((list) => list.map((e) => (e.id === id && e.isCustom ? { ...e, archived: true } : e))),
    [setExercises]
  );

  const updateRoutine = useCallback(
    (id, fn) => setRoutines((list) => list.map((r) => (r.id === id ? fn(r) : r))),
    [setRoutines]
  );

  return {
    exercises,
    exercisesById,
    routines,
    setRoutines,
    activeRoutine,
    activeRoutineId,
    setActiveRoutineId,
    updateRoutine,
    sessions,
    setSessions,
    activeSession,
    setActiveSession,
    settings,
    updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
    createExercise,
    updateExercise,
    archiveExercise,
  };
}
