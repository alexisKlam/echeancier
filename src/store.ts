import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  TournamentState,
  Series,
  Round,
  ScheduledRound,
  TournamentSettings,
  generateSeriesColor,
  generateId,
  getRoundCellPositions,
} from './types';

interface TournamentStore extends TournamentState {
  // Settings actions
  updateSettings: (settings: Partial<TournamentSettings>) => void;

  // Series actions
  addSeries: (name: string, shortName: string) => void;
  removeSeries: (id: string) => void;
  updateSeries: (id: string, updates: Partial<Omit<Series, 'id' | 'color'>>) => void;

  // Round actions
  addRound: (seriesId: string, matchCount: number, label: string) => void;
  removeRound: (seriesId: string, roundId: string) => void;
  updateRound: (seriesId: string, roundId: string, updates: Partial<Omit<Round, 'id' | 'seriesId' | 'roundNumber'>>) => void;

  // Schedule actions
  scheduleRound: (roundId: string, row: number, col: number) => void;
  scheduleRoundWithPush: (roundId: string, row: number, col: number) => void;
  scheduleRoundNext: (roundId: string) => void;
  unscheduleRound: (roundId: string) => void;
  moveScheduledRound: (roundId: string, newRow: number, newCol: number) => void;
  removeEmptyCell: (row: number, col: number) => void;
  clearSchedule: () => void;
  undoSchedule: () => void;

  // Phase actions
  setPhase: (phase: 'config' | 'schedule') => void;

  // Auto-schedule
  autoSchedule: () => void;

  // Reset
  resetAll: () => void;

  // Validation
  canScheduleRound: (roundId: string, row: number, col: number, excludeRoundId?: string) => { valid: boolean; reason?: string };
}

const defaultSettings: TournamentSettings = {
  courtCount: 8,
  timeSlotDuration: 35,
  startTime: '08:00',
  endTime: '18:00',
};

const initialState: TournamentState = {
  settings: defaultSettings,
  series: [],
  schedule: [],
  scheduleHistory: [],
  currentPhase: 'config',
};

export const useTournamentStore = create<TournamentStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      addSeries: (name, shortName) =>
        set((state) => {
          const newIndex = state.series.length;
          const newSeries: Series = {
            id: generateId(),
            name,
            shortName,
            color: generateSeriesColor(newIndex, newIndex + 1),
            rounds: [],
          };
          // Regenerate colors for all series
          const updatedSeries = [...state.series, newSeries].map((s, i, arr) => ({
            ...s,
            color: generateSeriesColor(i, arr.length),
          }));
          return { series: updatedSeries };
        }),

      removeSeries: (id) =>
        set((state) => {
          const filteredSeries = state.series.filter((s) => s.id !== id);
          // Regenerate colors
          const updatedSeries = filteredSeries.map((s, i, arr) => ({
            ...s,
            color: generateSeriesColor(i, arr.length),
          }));
          // Remove scheduled rounds for this series
          const seriesRoundIds = state.series
            .find((s) => s.id === id)
            ?.rounds.map((r) => r.id) || [];
          const filteredSchedule = state.schedule.filter(
            (sr) => !seriesRoundIds.includes(sr.roundId)
          );
          return { series: updatedSeries, schedule: filteredSchedule };
        }),

      updateSeries: (id, updates) =>
        set((state) => ({
          series: state.series.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      addRound: (seriesId, matchCount, label) =>
        set((state) => ({
          series: state.series.map((s) => {
            if (s.id !== seriesId) return s;
            const newRound: Round = {
              id: generateId(),
              seriesId,
              roundNumber: s.rounds.length + 1,
              matchCount,
              label,
            };
            return { ...s, rounds: [...s.rounds, newRound] };
          }),
        })),

      removeRound: (seriesId, roundId) =>
        set((state) => {
          // Remove from schedule
          const filteredSchedule = state.schedule.filter(
            (sr) => sr.roundId !== roundId
          );
          // Remove round and renumber
          const updatedSeries = state.series.map((s) => {
            if (s.id !== seriesId) return s;
            const filteredRounds = s.rounds
              .filter((r) => r.id !== roundId)
              .map((r, i) => ({ ...r, roundNumber: i + 1 }));
            return { ...s, rounds: filteredRounds };
          });
          return { series: updatedSeries, schedule: filteredSchedule };
        }),

      updateRound: (seriesId, roundId, updates) =>
        set((state) => ({
          series: state.series.map((s) => {
            if (s.id !== seriesId) return s;
            return {
              ...s,
              rounds: s.rounds.map((r) =>
                r.id === roundId ? { ...r, ...updates } : r
              ),
            };
          }),
        })),

      scheduleRound: (roundId, row, col) =>
        set((state) => {
          // Save current state to history
          const newHistory = [...state.scheduleHistory, state.schedule].slice(-20); // Keep last 20 states
          // Remove if already scheduled
          const filtered = state.schedule.filter((sr) => sr.roundId !== roundId);
          return {
            schedule: [...filtered, { roundId, row, startCol: col }],
            scheduleHistory: newHistory,
          };
        }),

      unscheduleRound: (roundId) =>
        set((state) => {
          // Save current state to history
          const newHistory = [...state.scheduleHistory, state.schedule].slice(-20);
          return {
            schedule: state.schedule.filter((sr) => sr.roundId !== roundId),
            scheduleHistory: newHistory,
          };
        }),

      moveScheduledRound: (roundId, newRow, newCol) =>
        set((state) => {
          // Save current state to history
          const newHistory = [...state.scheduleHistory, state.schedule].slice(-20);
          return {
            schedule: state.schedule.map((sr) =>
              sr.roundId === roundId ? { ...sr, row: newRow, startCol: newCol } : sr
            ),
            scheduleHistory: newHistory,
          };
        }),

      removeEmptyCell: (row, col) => {
        const state = get();
        const { series, schedule, settings } = state;

        // Helper to get all positions occupied by a round
        const getOccupiedPositions = (sr: ScheduledRound): Array<{ row: number, col: number }> => {
          for (const s of series) {
            const r = s.rounds.find((r) => r.id === sr.roundId);
            if (r) {
              return getRoundCellPositions(sr.row, sr.startCol, r.matchCount, settings.courtCount);
            }
          }
          return [{ row: sr.row, col: sr.startCol }];
        };

        // Helper to convert position to linear index
        const posToLinearIndex = (pos: { row: number, col: number }): number => {
          return pos.row * settings.courtCount + pos.col;
        };

        // Check if the cell is empty
        const cellOccupied = schedule.some(sr => {
          const positions = getOccupiedPositions(sr);
          return positions.some(p => p.row === row && p.col === col);
        });

        if (cellOccupied) {
          console.warn('Cannot remove a cell that is occupied by a round');
          return;
        }

        // Find all rounds that come after this cell (in linear order)
        const targetCellIndex = posToLinearIndex({ row, col });
        const roundsToShift: ScheduledRound[] = [];
        const roundsNotToShift: ScheduledRound[] = [];

        for (const sr of schedule) {
          const startIndex = posToLinearIndex({ row: sr.row, col: sr.startCol });

          // If the round starts after the removed cell, it needs to be shifted back
          if (startIndex > targetCellIndex) {
            roundsToShift.push(sr);
          } else {
            roundsNotToShift.push(sr);
          }
        }

        // Sort rounds to shift by their position (earliest first for backward shift)
        roundsToShift.sort((a, b) => {
          const aStart = posToLinearIndex({ row: a.row, col: a.startCol });
          const bStart = posToLinearIndex({ row: b.row, col: b.startCol });
          return aStart - bStart; // Ascending order (earliest first)
        });

        // Shift each round back by 1 cell
        const shiftedRounds: ScheduledRound[] = [];

        for (const sr of roundsToShift) {
          const currentIndex = posToLinearIndex({ row: sr.row, col: sr.startCol });
          const newIndex = currentIndex - 1; // Shift back by 1

          // Convert back to row/col
          const newRow = Math.floor(newIndex / settings.courtCount);
          const newCol = newIndex % settings.courtCount;

          shiftedRounds.push({
            ...sr,
            row: newRow,
            startCol: newCol
          });
        }

        // Combine: rounds that don't move + shifted rounds
        const newSchedule = [...roundsNotToShift, ...shiftedRounds];

        // Save current state to history before applying changes
        const newHistory = [...state.scheduleHistory, state.schedule].slice(-20);

        set({
          schedule: newSchedule,
          scheduleHistory: newHistory,
        });
      },

      clearSchedule: () => set((state) => {
        // Save current state to history
        const newHistory = [...state.scheduleHistory, state.schedule].slice(-20);
        return {
          schedule: [],
          scheduleHistory: newHistory,
        };
      }),

      undoSchedule: () => set((state) => {
        if (state.scheduleHistory.length === 0) return state;

        // Get the last state from history
        const newHistory = [...state.scheduleHistory];
        const previousSchedule = newHistory.pop()!;

        return {
          schedule: previousSchedule,
          scheduleHistory: newHistory,
        };
      }),

      scheduleRoundNext: (roundId) => {
        const state = get();
        const { series, schedule, settings } = state;

        // Find the round being placed
        let targetRound: Round | undefined;
        for (const s of series) {
          const r = s.rounds.find((r) => r.id === roundId);
          if (r) {
            targetRound = r;
            break;
          }
        }

        if (!targetRound) return;

        const matchCount = targetRound.matchCount;

        // Find the next available position after the last scheduled round
        let targetRow = 0;
        let targetCol = 0;

        if (schedule.length > 0) {
          // Find the maximum row used by any round
          const maxRow = Math.max(...schedule.flatMap(sr => {
            for (const s of series) {
              const r = s.rounds.find((r) => r.id === sr.roundId);
              if (r) {
                const positions = getRoundCellPositions(sr.row, sr.startCol, r.matchCount, settings.courtCount);
                return positions.map(p => p.row);
              }
            }
            return [sr.row];
          }));

          // Helper to check if positions are free
          const arePositionsFree = (startRow: number, startCol: number): boolean => {
            const testPositions = getRoundCellPositions(startRow, startCol, matchCount, settings.courtCount);

            return !schedule.some(sr => {
              for (const s of series) {
                const r = s.rounds.find((r) => r.id === sr.roundId);
                if (r) {
                  const occupiedPositions = getRoundCellPositions(sr.row, sr.startCol, r.matchCount, settings.courtCount);
                  return testPositions.some(tp =>
                    occupiedPositions.some(op => op.row === tp.row && op.col === tp.col)
                  );
                }
              }
              return false;
            });
          };

          // Try to find space starting from the last row
          let foundSpace = false;

          // Try all positions on the last row and beyond
          for (let row = maxRow; row <= maxRow + 5 && !foundSpace; row++) {
            for (let col = 0; col < settings.courtCount && !foundSpace; col++) {
              if (arePositionsFree(row, col)) {
                targetRow = row;
                targetCol = col;
                foundSpace = true;
              }
            }
          }

          // If still no space found, just place at next row, col 0
          if (!foundSpace) {
            targetRow = maxRow + 1;
            targetCol = 0;
          }
        }

        // Use scheduleRound to place it
        get().scheduleRound(roundId, targetRow, targetCol);
      },

      scheduleRoundWithPush: (roundId, row, col) => {
        const state = get();
        const { series, schedule, settings } = state;

        // Find the round being placed
        let targetRound: Round | undefined;
        let targetSeries: Series | undefined;
        for (const s of series) {
          const r = s.rounds.find((r) => r.id === roundId);
          if (r) {
            targetRound = r;
            targetSeries = s;
            break;
          }
        }

        if (!targetRound || !targetSeries) return;

        const matchCount = targetRound.matchCount;

        // Helper to get all positions occupied by a round
        const getOccupiedPositions = (sr: ScheduledRound): Array<{ row: number, col: number }> => {
          for (const s of series) {
            const r = s.rounds.find((r) => r.id === sr.roundId);
            if (r) {
              return getRoundCellPositions(sr.row, sr.startCol, r.matchCount, settings.courtCount);
            }
          }
          return [{ row: sr.row, col: sr.startCol }];
        };

        // Helper to convert position to linear index (for sorting)
        const posToLinearIndex = (pos: { row: number, col: number }): number => {
          return pos.row * settings.courtCount + pos.col;
        };

        // Get all positions for the new round
        const targetPositions = getRoundCellPositions(row, col, matchCount, settings.courtCount);
        const targetStartIndex = posToLinearIndex({ row, col });
        const targetEndIndex = posToLinearIndex(targetPositions[targetPositions.length - 1]);

        // Remove the round being placed from the schedule (if it was already scheduled)
        let newSchedule = schedule.filter(sr => sr.roundId !== roundId);

        // VALIDATION: Check that we're not placing the round in the middle of another round
        // A round can only be placed before or after another round, not cutting through it
        for (const sr of newSchedule) {
          const positions = getOccupiedPositions(sr);

          // Count how many cells of this existing round are overlapped by the new round
          const overlappingCells = positions.filter(pos =>
            targetPositions.some(tp => tp.row === pos.row && tp.col === pos.col)
          ).length;

          // If we overlap some but not all cells, we're cutting through the middle - BLOCK IT
          if (overlappingCells > 0 && overlappingCells < positions.length) {
            console.warn('Cannot place round in the middle of another round');
            return; // Block the placement
          }
        }

        // Find all rounds that need to be shifted
        // First, check if we can place the round without any overlap
        const hasAnyOverlap = newSchedule.some(sr => {
          const positions = getOccupiedPositions(sr);
          return positions.some(pos =>
            targetPositions.some(tp => tp.row === pos.row && tp.col === pos.col)
          );
        });

        // If there's no overlap, simply place the round without shifting anyone
        if (!hasAnyOverlap) {
          newSchedule.push({ roundId, row, startCol: col });

          const newHistory = [...state.scheduleHistory, state.schedule].slice(-20);
          set({
            schedule: newSchedule,
            scheduleHistory: newHistory,
          });
          return;
        }

        // Otherwise, we need to shift rounds
        const roundsToShift: ScheduledRound[] = [];
        const roundsNotToShift: ScheduledRound[] = [];

        for (const sr of newSchedule) {
          const positions = getOccupiedPositions(sr);
          const startIndex = posToLinearIndex({ row: sr.row, col: sr.startCol });

          // Check if this round overlaps with target positions
          const hasOverlap = positions.some(pos =>
            targetPositions.some(tp => tp.row === pos.row && tp.col === pos.col)
          );

          // Check if this round starts at or after the insertion point
          const startsAtOrAfter = startIndex >= targetStartIndex;

          // Shift if there's overlap OR if it starts at/after the insertion point
          if (hasOverlap || startsAtOrAfter) {
            roundsToShift.push(sr);
          } else {
            roundsNotToShift.push(sr);
          }
        }

        // Sort rounds to shift from last to first (by their position in the grid)
        roundsToShift.sort((a, b) => {
          const aPos = getOccupiedPositions(a);
          const bPos = getOccupiedPositions(b);
          const aStart = posToLinearIndex({ row: a.row, col: a.startCol });
          const bStart = posToLinearIndex({ row: b.row, col: b.startCol });
          return bStart - aStart; // Descending order (last first)
        });

        // Shift each round by the number of cells needed (matchCount of the inserted round)
        const shiftAmount = matchCount;
        const shiftedRounds: ScheduledRound[] = [];

        for (const sr of roundsToShift) {
          // Calculate new position by adding shiftAmount cells
          const currentPositions = getOccupiedPositions(sr);
          const firstCellIndex = posToLinearIndex({ row: sr.row, col: sr.startCol });
          const newFirstCellIndex = firstCellIndex + shiftAmount;

          // Convert back to row/col
          const newRow = Math.floor(newFirstCellIndex / settings.courtCount);
          const newCol = newFirstCellIndex % settings.courtCount;

          shiftedRounds.push({
            ...sr,
            row: newRow,
            startCol: newCol
          });
        }

        // Combine: rounds that don't move + new round + shifted rounds
        newSchedule = [
          ...roundsNotToShift,
          { roundId, row, startCol: col },
          ...shiftedRounds
        ];

        // Save current state to history before applying changes
        const newHistory = [...state.scheduleHistory, state.schedule].slice(-20);

        set({
          schedule: newSchedule,
          scheduleHistory: newHistory,
        });
      },

      setPhase: (phase) => set({ currentPhase: phase }),

      canScheduleRound: (roundId, row, col, excludeRoundId) => {
        const state = get();
        const { series, schedule, settings } = state;

        // Find the round and its series
        let targetRound: Round | undefined;
        let targetSeries: Series | undefined;
        for (const s of series) {
          const r = s.rounds.find((r) => r.id === roundId);
          if (r) {
            targetRound = r;
            targetSeries = s;
            break;
          }
        }

        if (!targetRound || !targetSeries) {
          return { valid: false, reason: 'Tour non trouvé' };
        }

        const matchCount = targetRound.matchCount;
        const endCol = col + matchCount - 1;

        // Check column bounds - need enough consecutive courts
        if (col < 0 || endCol >= settings.courtCount) {
          return { valid: false, reason: `Pas assez de terrains (besoin de ${matchCount} terrains consécutifs)` };
        }

        // Helper to get occupied columns for a scheduled round
        const getOccupiedCols = (sr: ScheduledRound): number[] => {
          // Find the round to get matchCount
          for (const s of series) {
            const r = s.rounds.find((r) => r.id === sr.roundId);
            if (r) {
              return Array.from({ length: r.matchCount }, (_, i) => sr.startCol + i);
            }
          }
          return [sr.startCol];
        };

        // Check if any of the required cells are already occupied
        for (let c = col; c <= endCol; c++) {
          const cellOccupied = schedule.some(
            (sr) => {
              if (sr.roundId === excludeRoundId || sr.roundId === roundId) return false;
              if (sr.row !== row) return false;
              const occupiedCols = getOccupiedCols(sr);
              return occupiedCols.includes(c);
            }
          );
          if (cellOccupied) {
            return { valid: false, reason: 'Un ou plusieurs terrains déjà occupés' };
          }
        }

        // Check if same series already has a round in this row
        const seriesRoundIds = targetSeries.rounds.map((r) => r.id);
        const sameSeriesInRow = schedule.some(
          (sr) =>
            sr.row === row &&
            seriesRoundIds.includes(sr.roundId) &&
            sr.roundId !== excludeRoundId &&
            sr.roundId !== roundId
        );
        if (sameSeriesInRow) {
          return {
            valid: false,
            reason: `La série ${targetSeries.shortName} a déjà un tour sur cette ligne`,
          };
        }

        // Check round ordering within series (earlier rounds must be in earlier or same rows)
        for (const sr of schedule) {
          if (sr.roundId === excludeRoundId || sr.roundId === roundId) continue;

          const scheduledRound = targetSeries.rounds.find((r) => r.id === sr.roundId);
          if (!scheduledRound) continue;

          // If this is an earlier round, it must be in an earlier row
          if (scheduledRound.roundNumber < targetRound.roundNumber && sr.row > row) {
            return {
              valid: false,
              reason: `Le tour ${scheduledRound.roundNumber} doit être avant le tour ${targetRound.roundNumber}`,
            };
          }
          // If this is a later round, it must be in a later row
          if (scheduledRound.roundNumber > targetRound.roundNumber && sr.row < row) {
            return {
              valid: false,
              reason: `Le tour ${targetRound.roundNumber} doit être avant le tour ${scheduledRound.roundNumber}`,
            };
          }
        }

        return { valid: true };
      },

      autoSchedule: () => {
        const state = get();
        const { series, settings } = state;

        // Collect all rounds with their info
        type RoundInfo = {
          round: Round;
          series: Series;
        };

        const allRounds: RoundInfo[] = [];
        for (const s of series) {
          for (const r of s.rounds) {
            allRounds.push({ round: r, series: s });
          }
        }

        // Sort by: series first (to keep series together), then by round number
        allRounds.sort((a, b) => {
          // Group by series
          const seriesCompare = a.series.name.localeCompare(b.series.name);
          if (seriesCompare !== 0) return seriesCompare;
          // Then by round number
          return a.round.roundNumber - b.round.roundNumber;
        });

        const newSchedule: ScheduledRound[] = [];
        const rowSeriesMap: Map<number, Set<string>> = new Map(); // row -> set of series IDs

        // Track the minimum row for each series based on round ordering
        const seriesMinRow: Map<string, number> = new Map();

        // Helper to check if positions are available (supports multi-row rounds)
        const arePositionsAvailable = (startRow: number, startCol: number, count: number): boolean => {
          const testPositions = getRoundCellPositions(startRow, startCol, count, settings.courtCount);

          // Check if any position is already occupied
          return !newSchedule.some((sr) => {
            // Find the match count for this scheduled round
            for (const s of series) {
              const r = s.rounds.find((r) => r.id === sr.roundId);
              if (r) {
                const occupiedPositions = getRoundCellPositions(sr.row, sr.startCol, r.matchCount, settings.courtCount);
                // Check for overlap
                return testPositions.some(tp =>
                  occupiedPositions.some(op => op.row === tp.row && op.col === tp.col)
                );
              }
            }
            return false;
          });
        };

        for (const { round, series: s } of allRounds) {
          const minRowForRound = seriesMinRow.get(s.id) || 0;
          const matchCount = round.matchCount;

          // Find first available position starting from minRowForRound
          let placed = false;
          let row = minRowForRound;
          let col = 0;

          while (!placed) {
            // Try all starting positions
            for (col = 0; col < settings.courtCount && !placed; col++) {
              if (arePositionsAvailable(row, col, matchCount)) {
                // Get all positions this round will occupy
                const positions = getRoundCellPositions(row, col, matchCount, settings.courtCount);
                const maxRowUsed = Math.max(...positions.map(p => p.row));

                // Check if series already has a round on any of these rows
                const seriesConflict = positions.some(p => {
                  const seriesInRow = rowSeriesMap.get(p.row) || new Set();
                  return seriesInRow.has(s.id);
                });

                if (!seriesConflict) {
                  // Place the round
                  newSchedule.push({ roundId: round.id, row, startCol: col });

                  // Mark all rows as having this series
                  positions.forEach(p => {
                    const seriesInRow = rowSeriesMap.get(p.row) || new Set();
                    seriesInRow.add(s.id);
                    rowSeriesMap.set(p.row, seriesInRow);
                  });

                  // Update minimum row for next round in this series
                  seriesMinRow.set(s.id, maxRowUsed + 1);
                  placed = true;
                }
              }
            }

            if (!placed) {
              row++;
            }
          }
        }

        // Save current state to history
        const newHistory = [...state.scheduleHistory, state.schedule].slice(-20);

        set({
          schedule: newSchedule,
          scheduleHistory: newHistory,
        });
      },

      resetAll: () => set(initialState),
    }),
    {
      name: 'badminton-tournament-storage',
    }
  )
);

// Helper hook to get all rounds flattened
export function useAllRounds() {
  const series = useTournamentStore((state) => state.series);
  return series.flatMap((s) =>
    s.rounds.map((r) => ({ ...r, series: s }))
  );
}

// Helper hook to get unscheduled rounds
export function useUnscheduledRounds() {
  const series = useTournamentStore((state) => state.series);
  const schedule = useTournamentStore((state) => state.schedule);
  const scheduledIds = new Set(schedule.map((sr) => sr.roundId));

  return series.flatMap((s) =>
    s.rounds
      .filter((r) => !scheduledIds.has(r.id))
      .map((r) => ({ ...r, series: s }))
  );
}

// Helper to get scheduled round info
export function useScheduledRoundInfo(roundId: string) {
  const series = useTournamentStore((state) => state.series);
  const schedule = useTournamentStore((state) => state.schedule);

  const scheduled = schedule.find((sr) => sr.roundId === roundId);
  if (!scheduled) return null;

  for (const s of series) {
    const round = s.rounds.find((r) => r.id === roundId);
    if (round) {
      return { round, series: s, ...scheduled };
    }
  }
  return null;
}
