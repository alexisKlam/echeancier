import React from 'react';
import { useTournamentStore } from '../store';
import { formatTime } from '../types';

// Color coding based on time gap with previous round
const getTimeGapColor = (gapMinutes: number | null): { bg: string; text: string; label: string } => {
    if (gapMinutes === null) {
        return { bg: 'bg-gray-100', text: 'text-gray-600', label: '' };
    }

    if (gapMinutes < 60) {
        // Yellow: Less than 1h
        return { bg: 'bg-yellow-400', text: 'text-yellow-900', label: 'Moins de 1h' };
    } else if (gapMinutes >= 60 && gapMinutes < 120) {
        // Green: Between 1h and 2h
        return { bg: 'bg-green-500', text: 'text-white', label: 'Entre 1h et 2h' };
    } else if (gapMinutes >= 120 && gapMinutes < 180) {
        // Orange: Between 2h and 3h
        return { bg: 'bg-orange-500', text: 'text-white', label: 'Entre 2h et 3h' };
    } else {
        // Red: More than 3h
        return { bg: 'bg-red-500', text: 'text-white', label: 'Plus de 3h' };
    }
};

// Calculate time in minutes from row
const getTimeInMinutes = (row: number, startTime: string, slotDuration: number): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    return startHour * 60 + startMin + row * slotDuration;
};

export const SeriesTableView: React.FC = () => {
    const series = useTournamentStore((state) => state.series);
    const schedule = useTournamentStore((state) => state.schedule);
    const settings = useTournamentStore((state) => state.settings);

    // Build data structure: for each series, get all rounds with their scheduled times
    const seriesData = series.map((s) => {
        const roundsWithSchedule = s.rounds.map((round) => {
            const scheduled = schedule.find((sr) => sr.roundId === round.id);
            if (scheduled) {
                const time = formatTime(scheduled.row, settings.startTime, settings.timeSlotDuration);
                const timeMinutes = getTimeInMinutes(scheduled.row, settings.startTime, settings.timeSlotDuration);
                return {
                    round,
                    scheduled: true,
                    row: scheduled.row,
                    col: scheduled.startCol,
                    time,
                    timeMinutes,
                };
            }
            return {
                round,
                scheduled: false,
                row: null,
                col: null,
                time: null,
                timeMinutes: null,
            };
        });

        // Sort by time (scheduled rounds first, then by time)
        const sortedRounds = [...roundsWithSchedule].sort((a, b) => {
            if (a.timeMinutes === null && b.timeMinutes === null) return a.round.roundNumber - b.round.roundNumber;
            if (a.timeMinutes === null) return 1;
            if (b.timeMinutes === null) return -1;
            return a.timeMinutes - b.timeMinutes;
        });

        // Calculate gaps with previous round
        const roundsWithGaps = sortedRounds.map((item, index) => {
            let gapMinutes: number | null = null;

            if (index > 0 && item.timeMinutes !== null) {
                const prevItem = sortedRounds[index - 1];
                if (prevItem.timeMinutes !== null) {
                    gapMinutes = item.timeMinutes - prevItem.timeMinutes;
                }
            }

            return { ...item, gapMinutes };
        });

        // Calculate total matches
        const totalMatches = s.rounds.reduce((acc, r) => acc + r.matchCount, 0);

        return {
            series: s,
            rounds: roundsWithGaps,
            totalMatches,
        };
    });

    // Find max number of rounds for any series
    const maxRounds = Math.max(...series.map((s) => s.rounds.length), 0);

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 border-b">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded"></div>
                    <span className="text-sm">Entre 1h et 2h avec le début du tour précédent</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-yellow-400 rounded"></div>
                    <span className="text-sm">Moins de 1h avec le début du tour précédent</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-orange-500 rounded"></div>
                    <span className="text-sm">Entre 2h et 3h avec le début du tour précédent</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-500 rounded"></div>
                    <span className="text-sm">Plus de 3h avec le début du tour précédent</span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-700 text-white">
                            <th className="p-3 text-left border-r border-gray-600 min-w-[100px]">Tableaux</th>
                            {Array.from({ length: maxRounds }).map((_, i) => (
                                <th key={i} className="p-3 text-center border-r border-gray-600 min-w-[120px]">
                                    Tour
                                </th>
                            ))}
                            <th className="p-3 text-center min-w-[80px]">Totaux</th>
                        </tr>
                    </thead>
                    <tbody>
                        {seriesData.map(({ series: s, rounds, totalMatches }) => (
                            <tr key={s.id} className="border-b border-gray-200">
                                {/* Series name with color indicator */}
                                <td className="p-2 border-r border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-full min-h-[60px] rounded-sm"
                                            style={{ backgroundColor: s.color }}
                                        />
                                        <div>
                                            <div className="font-semibold">{s.shortName}</div>
                                            <div className="text-xs text-gray-500">{s.name}</div>
                                        </div>
                                    </div>
                                </td>

                                {/* Rounds */}
                                {Array.from({ length: maxRounds }).map((_, i) => {
                                    const roundData = rounds[i];

                                    if (!roundData) {
                                        return (
                                            <td key={i} className="p-2 border-r border-gray-200 text-center text-gray-400">
                                                -
                                            </td>
                                        );
                                    }

                                    const { round, scheduled, time, gapMinutes } = roundData;
                                    const colorInfo = scheduled ? getTimeGapColor(gapMinutes) : { bg: 'bg-gray-200', text: 'text-gray-600', label: '' };

                                    return (
                                        <td key={i} className="p-2 border-r border-gray-200">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="text-sm font-medium">{round.label}</div>
                                                <div
                                                    className={`px-3 py-1 rounded text-sm ${scheduled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}
                                                >
                                                    {round.matchCount} match{round.matchCount > 1 ? 's' : ''}
                                                </div>
                                                {scheduled && time ? (
                                                    <div
                                                        className={`px-3 py-1 rounded text-sm font-medium ${colorInfo.bg} ${colorInfo.text}`}
                                                    >
                                                        {time}
                                                    </div>
                                                ) : (
                                                    <div className="px-3 py-1 rounded text-sm bg-gray-100 text-gray-400">
                                                        Non placé
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}

                                {/* Total */}
                                <td className="p-2 text-center font-medium">
                                    {totalMatches} match{totalMatches > 1 ? 's' : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
