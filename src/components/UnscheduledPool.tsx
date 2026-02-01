import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useUnscheduledRounds, useTournamentStore } from '../store';
import { RoundItem } from './RoundItem';

export const UnscheduledPool: React.FC = () => {
  const unscheduledRounds = useUnscheduledRounds();
  const scheduleRoundNext = useTournamentStore((state) => state.scheduleRoundNext);

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

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg shadow-lg p-4 ${isOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
        }`}
    >
      <h3 className="text-lg font-semibold mb-4 text-gray-700">
        📋 Tours à placer ({unscheduledRounds.length})
      </h3>

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
