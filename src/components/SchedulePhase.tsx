import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import { useTournamentStore } from '../store';
import { ScheduleGrid } from './ScheduleGrid';
import { UnscheduledPool } from './UnscheduledPool';
import { RoundItemStatic } from './RoundItem';
import { Round, Series } from '../types';

export const SchedulePhase: React.FC = () => {
  const {
    setPhase,
    scheduleRound,
    scheduleRoundWithPush,
    unscheduleRound,
    canScheduleRound,
    autoSchedule,
    clearSchedule,
    undoSchedule,
    series,
    schedule,
  } = useTournamentStore();

  const [activeItem, setActiveItem] = useState<{
    round: Round;
    series: Series;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'round') {
      setActiveItem({
        round: active.data.current.round,
        series: active.data.current.series,
      });
    }
    setError(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || activeData.type !== 'round') return;

    const roundId = activeData.round.id;

    // Dropping back to pool
    if (overData?.type === 'pool') {
      unscheduleRound(roundId);
      return;
    }

    // Dropping on a cell
    if (overData?.type === 'cell') {
      const { row, col } = overData;

      // Use the new function that automatically pushes conflicting rounds
      scheduleRoundWithPush(roundId, row, col);
      setError(null);
    }
  };

  const handleAutoSchedule = () => {
    autoSchedule();
  };

  const handleExportJSON = () => {
    const data = {
      settings: useTournamentStore.getState().settings,
      series: useTournamentStore.getState().series,
      schedule: useTournamentStore.getState().schedule,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echeancier-tournoi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const totalRounds = series.reduce((acc, s) => acc + s.rounds.length, 0);
  const scheduledCount = schedule.length;
  const maxRow = schedule.length > 0 ? Math.max(...schedule.map((s) => s.row)) + 1 : 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen p-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPhase('config')}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
              >
                ← Configuration
              </button>
              <h2 className="text-xl font-bold text-gray-800">
                📅 Échéancier du Tournoi
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Stats */}
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
                {scheduledCount}/{totalRounds} tours placés
                {maxRow > 0 && ` • ${maxRow} créneaux`}
              </div>

              <button
                onClick={() => undoSchedule()}
                disabled={useTournamentStore.getState().scheduleHistory.length === 0}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                title="Annuler la dernière action"
              >
                ↶ Annuler
              </button>
              <button
                onClick={handleAutoSchedule}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                🪄 Auto-générer
              </button>
              <button
                onClick={clearSchedule}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                🗑️ Vider
              </button>
              <button
                onClick={handleExportJSON}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                💾 Exporter JSON
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-3 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Unscheduled pool */}
          <div className="lg:col-span-1">
            <UnscheduledPool />
          </div>

          {/* Schedule grid */}
          <div className="lg:col-span-3">
            <ScheduleGrid />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
          <strong>💡 Instructions :</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Glissez-déposez les tours depuis la liste vers la grille</li>
            <li>
              Un même série ne peut pas avoir plusieurs tours sur la même ligne
            </li>
            <li>Les tours doivent respecter l'ordre (Tour 1 avant Tour 2, etc.)</li>
            <li>Cliquez sur "Auto-générer" pour un placement automatique optimisé</li>
            <li>Les données sont sauvegardées automatiquement dans le navigateur</li>
          </ul>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem && (
          <div className="opacity-80 transform scale-105">
            <RoundItemStatic round={activeItem.round} series={activeItem.series} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
