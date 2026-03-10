import React from 'react';
import { useTournamentStore } from '../store';
import { formatTime, getContrastColor, getRoundCellPositions } from '../types';

type CellInfo = {
    roundLabel: string;
    seriesShortName: string;
    seriesColor: string;
    matchIndex: number;
    totalMatches: number;
};

export const VerticalScheduleView: React.FC = () => {
    const series = useTournamentStore((state) => state.series);
    const schedule = useTournamentStore((state) => state.schedule);
    const settings = useTournamentStore((state) => state.settings);

    const roundLookup = new Map(
        series.flatMap((s) => s.rounds.map((r) => [r.id, { round: r, series: s }] as const))
    );

    const occupiedCells = new Map<string, CellInfo>();

    for (const scheduledRound of schedule) {
        const info = roundLookup.get(scheduledRound.roundId);
        if (!info) continue;

        const positions = getRoundCellPositions(
            scheduledRound.row,
            scheduledRound.startCol,
            info.round.matchCount,
            settings.courtCount
        );

        positions.forEach((pos, idx) => {
            occupiedCells.set(`${pos.row}-${pos.col}`, {
                roundLabel: info.round.label,
                seriesShortName: info.series.shortName,
                seriesColor: info.series.color,
                matchIndex: idx + 1,
                totalMatches: info.round.matchCount,
            });
        });
    }

    const activeRows = Array.from(
        new Set(Array.from(occupiedCells.keys()).map((key) => Number(key.split('-')[0])))
    ).sort((a, b) => a - b);

    if (activeRows.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-500">
                Aucun tour place pour le moment.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activeRows.map((row) => (
                <section key={row} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-slate-700 text-white px-4 py-2 text-sm font-semibold text-center">
                        {formatTime(row, settings.startTime, settings.timeSlotDuration)} ({settings.timeSlotDuration} min)
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700">
                                    <th className="p-2 text-left border-b border-slate-200 w-20">Terrain</th>
                                    <th className="p-2 text-left border-b border-slate-200 w-32">Serie</th>
                                    <th className="p-2 text-left border-b border-slate-200">Tour</th>
                                    <th className="p-2 text-left border-b border-slate-200 w-28">Match</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: settings.courtCount }).map((_, col) => {
                                    const key = `${row}-${col}`;
                                    const cell = occupiedCells.get(key);

                                    return (
                                        <tr key={key} className="border-b border-slate-100 last:border-b-0">
                                            <td className="p-2 font-medium text-slate-700">{col + 1}</td>
                                            <td className="p-2">
                                                {cell ? (
                                                    <span
                                                        className="inline-block px-2 py-1 rounded font-semibold"
                                                        style={{
                                                            backgroundColor: cell.seriesColor,
                                                            color: getContrastColor(cell.seriesColor),
                                                        }}
                                                    >
                                                        {cell.seriesShortName}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">---</span>
                                                )}
                                            </td>
                                            <td className="p-2 text-slate-700">{cell ? cell.roundLabel : '---'}</td>
                                            <td className="p-2 text-slate-600">
                                                {cell ? `M${cell.matchIndex}/${cell.totalMatches}` : '---'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}
        </div>
    );
};
