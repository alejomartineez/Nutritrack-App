import React, { useMemo, useState } from 'react';
import { Settings2, Play } from 'lucide-react';
import { ScreenHeader, Segmented, IconButton, toast } from '../ui';
import { dateKeyOf } from '../lib/dates';
import { useWorkoutData } from './useWorkoutData';
import { buildRoutineFromTemplate, getRoutineDayForDate, startSession, startFreeSession } from './workoutStorage';
import { finishedSessions, computeWeekPlan } from './workoutStats';
import TodayView from './TodayView';
import RoutineView from './RoutineView';
import ProgressView from './ProgressView';
import ActiveWorkout from './ActiveWorkout';
import ExerciseHistorySheet from './ExerciseHistorySheet';
import SettingsSheet from './SettingsSheet';
import { SessionDetailSheet, LogPastSheet } from './SessionSheets';

const TABS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'rutina', label: 'Rutina' },
  { value: 'progreso', label: 'Progreso' },
];

export default function WorkoutModule() {
  const data = useWorkoutData();
  const { exercises, exercisesById, routines, setRoutines, activeRoutine, setActiveRoutineId, sessions, setSessions, activeSession, setActiveSession, settings } = data;

  const [tab, setTab] = useState('hoy');
  const [workoutOpen, setWorkoutOpen] = useState(() => !!activeSession);
  const [editing, setEditing] = useState(null); // sesión pasada en edición
  const [editDayId, setEditDayId] = useState(null);
  const [detail, setDetail] = useState(null); // id de sesión
  const [historyId, setHistoryId] = useState(null);
  const [logPast, setLogPast] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const todayKey = dateKeyOf();
  const ordered = useMemo(() => finishedSessions(sessions), [sessions]);
  const todaySessions = useMemo(() => ordered.filter((s) => s.date === todayKey), [ordered, todayKey]);
  const weekPlan = useMemo(() => computeWeekPlan(activeRoutine, sessions, todayKey), [activeRoutine, sessions, todayKey]);
  const todayDay = getRoutineDayForDate(activeRoutine);

  const exerciseActions = { onCreate: data.createExercise, onUpdate: data.updateExercise, onArchive: data.archiveExercise };

  const begin = (session) => {
    if (activeSession) {
      setWorkoutOpen(true);
      toast('Ya tenés un entreno en curso', { tone: 'info' });
      return;
    }
    setActiveSession(session);
    setWorkoutOpen(true);
  };

  const saveSession = (finished) => setSessions((map) => ({ ...map, [finished.id]: finished }));

  const deleteSession = (session) => {
    setSessions((map) => {
      const next = { ...map };
      delete next[session.id];
      return next;
    });
    setDetail(null);
    toast('Entreno borrado', { action: { label: 'Deshacer', onClick: () => saveSession(session) } });
  };

  const detailSession = detail ? sessions[detail] : null;

  return (
    <div>
      <ScreenHeader
        title="Entreno"
        eyebrowTone="entreno"
        eyebrow={activeSession && !workoutOpen ? 'Entreno en curso' : undefined}
        right={
          <>
            {activeSession && !workoutOpen && (
              <IconButton icon={Play} label="Volver al entreno" variant="primary" tone="entreno" onClick={() => setWorkoutOpen(true)} />
            )}
            <IconButton icon={Settings2} label="Ajustes de entreno" onClick={() => setSettingsOpen(true)} />
          </>
        }
      >
        <Segmented value={tab} onChange={setTab} options={TABS} className="mt-3" />
      </ScreenHeader>

      <div key={tab} className="anim-tab-in pt-3">
        {tab === 'hoy' && (
          <TodayView
            routine={activeRoutine}
            todayDay={todayDay}
            todaySessions={todaySessions}
            activeSession={activeSession}
            weekPlan={weekPlan}
            lastSession={ordered[0] || null}
            exercisesById={exercisesById}
            onStart={(day) => begin(startSession(activeRoutine, day))}
            onStartFree={() => begin(startFreeSession())}
            onResume={() => setWorkoutOpen(true)}
            onGoRoutine={() => setTab('rutina')}
            onEditDay={(day) => {
              setTab('rutina');
              setEditDayId(day.id);
            }}
            onOpenSession={(s) => setDetail(s.id)}
          />
        )}

        {tab === 'rutina' && (
          <RoutineView
            routines={routines}
            routine={activeRoutine}
            setActiveRoutineId={setActiveRoutineId}
            onCreate={(templateId) => {
              const r = buildRoutineFromTemplate(templateId);
              setRoutines((list) => [...list, r]);
              setActiveRoutineId(r.id);
            }}
            onRename={(id, name) => data.updateRoutine(id, (r) => ({ ...r, name }))}
            onDelete={(id) => {
              const rest = routines.filter((r) => r.id !== id);
              setRoutines(rest);
              if (activeRoutine?.id === id) setActiveRoutineId(rest[0]?.id || null);
            }}
            updateRoutine={data.updateRoutine}
            exercises={exercises}
            exercisesById={exercisesById}
            exerciseActions={exerciseActions}
            editDayId={editDayId}
            setEditDayId={setEditDayId}
            onStart={(day) => begin(startSession(activeRoutine, day))}
          />
        )}

        {tab === 'progreso' && (
          <ProgressView
            sessionsMap={sessions}
            exercisesById={exercisesById}
            routine={activeRoutine}
            onOpenSession={(s) => setDetail(s.id)}
            onOpenExercise={setHistoryId}
            onLogPast={() => setLogPast(true)}
          />
        )}
      </div>

      {activeSession && workoutOpen && (
        <ActiveWorkout
          mode="live"
          session={activeSession}
          onChange={(fn) => setActiveSession((s) => (s ? fn(s) : s))}
          exercises={exercises}
          exercisesById={exercisesById}
          sessionsMap={sessions}
          settings={settings}
          onSettingsChange={data.updateSettings}
          onCreateExercise={data.createExercise}
          onUpdateExercise={data.updateExercise}
          onArchiveExercise={data.archiveExercise}
          onMinimize={() => setWorkoutOpen(false)}
          onDiscard={() => {
            setActiveSession(null);
            setWorkoutOpen(false);
          }}
          onSave={(finished) => {
            saveSession(finished);
            setActiveSession(null);
            setWorkoutOpen(false);
            setTab('hoy');
          }}
        />
      )}

      {editing && (
        <ActiveWorkout
          mode="edit"
          session={editing}
          onChange={(fn) => setEditing((s) => (s ? fn(s) : s))}
          exercises={exercises}
          exercisesById={exercisesById}
          sessionsMap={sessions}
          settings={settings}
          onSettingsChange={data.updateSettings}
          onCreateExercise={data.createExercise}
          onUpdateExercise={data.updateExercise}
          onArchiveExercise={data.archiveExercise}
          onDiscard={() => setEditing(null)}
          onSave={(finished) => {
            saveSession(finished);
            setEditing(null);
            toast('Entreno guardado');
          }}
        />
      )}

      {detailSession && (
        <SessionDetailSheet
          session={detailSession}
          exercisesById={exercisesById}
          onClose={() => setDetail(null)}
          onOpenExercise={setHistoryId}
          onDelete={() => deleteSession(detailSession)}
          onEdit={() => {
            setDetail(null);
            setEditing(detailSession);
          }}
        />
      )}

      {historyId && (
        <ExerciseHistorySheet exerciseId={historyId} exercise={exercisesById[historyId]} sessionsMap={sessions} onClose={() => setHistoryId(null)} />
      )}

      {logPast && (
        <LogPastSheet
          routine={activeRoutine}
          onClose={() => setLogPast(false)}
          onCreate={(date, day) => {
            const startedAt = new Date(`${date}T18:00:00`).getTime();
            const base = day ? startSession(activeRoutine, day, { date, now: startedAt }) : startFreeSession({ date, now: startedAt });
            setLogPast(false);
            setEditing({ ...base, endedAt: startedAt + 60 * 60000 });
          }}
        />
      )}

      {settingsOpen && (
        <SettingsSheet
          settings={settings}
          onChange={data.updateSettings}
          exercises={exercises}
          onCreateExercise={data.createExercise}
          onUpdateExercise={data.updateExercise}
          onArchiveExercise={data.archiveExercise}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
