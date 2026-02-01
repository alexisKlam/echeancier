import React, { useMemo } from 'react';
import { useTournamentStore } from '../store';
import { ScheduleCell } from './ScheduleCell';
import { formatTime } from '../types';

export const ScheduleGrid: React.FC = () => {
  const settings = useTournamentStore((state) => state.settings);
  const schedule = useTournamentStore((state) => state.schedule);
  const series = useTournamentStore((state) => state.series);

  // Calculate total rounds to determine max rows needed
  const totalRounds = series.reduce((acc, s) => acc + s.rounds.length, 0);

  // Calculate number of rows based on start and end time
  const calculateMaxRows = (): number => {
    const [startHour, startMin] = settings.startTime.split(':').map(Number);
    const [endHour, endMin] = (settings.endTime || '18:00').split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;
    return Math.ceil(totalMinutes / settings.timeSlotDuration);
  };

  // Determine the number of rows to display
  const maxScheduledRow = Math.max(0, ...schedule.map((sr) => sr.row));
  const calculatedMaxRows = calculateMaxRows();
  const minRows = Math.max(
    5,
    Math.ceil(totalRounds / settings.courtCount),
    maxScheduledRow + 2
  );
  const rowCount = Math.min(calculatedMaxRows, Math.max(minRows, calculatedMaxRows));

  const rows = useMemo(() => {
    return Array.from({ length: rowCount }, (_, i) => i);
  }, [rowCount]);

  const cols = useMemo(() => {
    return Array.from({ length: settings.courtCount }, (_, i) => i);
  }, [settings.courtCount]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="grid bg-gray-800 text-white font-semibold"
        style={{
          gridTemplateColumns: `80px repeat(${settings.courtCount}, minmax(100px, 1fr))`,
        }}
      >
        <div className="p-2 text-center border-r border-gray-600">Heure</div>
        {cols.map((col) => (
          <div key={col} className="p-2 text-center border-r border-gray-600">
            Terrain {col + 1}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-auto max-h-[70vh]">
        {rows.map((row) => (
          <div
            key={row}
            className="grid border-b border-gray-200"
            style={{
              gridTemplateColumns: `80px repeat(${settings.courtCount}, minmax(100px, 1fr))`,
            }}
          >
            {/* Time column */}
            <div className="p-2 text-center bg-gray-100 font-medium text-sm border-r border-gray-200 flex items-center justify-center">
              {formatTime(row, settings.startTime, settings.timeSlotDuration)}
            </div>

            {/* Court cells */}
            {cols.map((col) => (
              <ScheduleCell key={`${row}-${col}`} row={row} col={col} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
