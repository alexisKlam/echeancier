import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useUnscheduledRounds, useTournamentStore } from '../store';
import { RoundItem } from './RoundItem';

export const UnscheduledPool: React.FC = () => {
  const unscheduledRounds = useUnscheduledRounds();
  const scheduleRoundNext = useTournamentStore((state) => state.scheduleRoundNext);
  const series = useTournamentStore((state) => state.series);
  const schedule = useTournamentStore((state) => state.schedule);
  const unscheduleSeries = useTournamentStore((state) => state.unscheduleSeries);

  const { setNodeRef, isOver } = useDroppable({
    id: 'unscheduled-pool',
    data: {
      type: 'pool',
    },
  });

  // Group by series
  const groupedRounds = unscheduledRounds.reduce((acc, item) => {
    if (!acc[item.seriesId]) {
      acc[item.seriesId] = {
        series: item.series,
        rounds: [],
      };
    }
    acc[item.seriesId].rounds.push(item);
    return acc;
  }, {} as Record<string, { series: typeof unscheduledRounds[0]['series']; rounds: typeof unscheduledRounds }>);

  const handleResetSeries = (seriesId: string, seriesName: string) => {
    if (!window.confirm(`Retirer tous les tours places de la serie "${seriesName}" ?`)) {
      return;
    }
    unscheduleSeries(seriesId);
  };

  const scheduledCountBySeries = schedule.reduce((acc, item) => {
    for (const s of series) {
      if (s.rounds.some((r) => r.id === item.roundId)) {
        acc[s.id] = (acc[s.id] || 0) + 1;
        break;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg shadow-lg p-4 ${isOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
        }`}
    >
      <h3 className="text-lg font-semibold mb-4 text-gray-700">
        📋 Tours à placer ({unscheduledRounds.length})
      </h3>

      <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200 space-y-2">
        <div className="text-sm font-semibold text-gray-700">Reset par serie</div>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {series.map((s) => {
            const scheduledCount = scheduledCountBySeries[s.id] || 0;
            return (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-700 truncate" title={s.name}>
                  {s.shortName} ({scheduledCount}/{s.rounds.length} places)
                </span>
                <button
                  type="button"
                  onClick={() => handleResetSeries(s.id, s.name)}
                  disabled={scheduledCount === 0}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Retirer tous
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {unscheduledRounds.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          ✅ Tous les tours sont placés !
        </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(groupedRounds).map(([seriesId, { series, rounds }]) => (
            <div key={seriesId}>
              <div
                className="text-sm font-medium mb-2 px-2 py-1 rounded"
                style={{
                  backgroundColor: series.color + '30',
                  color: series.color,
                }}
              >
                {series.name}
              </div>
              <div className="flex flex-wrap gap-2">
                {rounds
                  .sort((a, b) => a.roundNumber - b.roundNumber)
                  .map((item) => (
                    <RoundItem
                      key={item.id}
                      round={item}
                      series={item.series}
                      onDoubleClick={() => scheduleRoundNext(item.id)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
