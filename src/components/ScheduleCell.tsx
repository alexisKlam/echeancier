import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useTournamentStore } from '../store';
import { DraggableRoundInGrid } from './RoundItem';
import { getRoundCellPositions } from '../types';

interface ScheduleCellProps {
  row: number;
  col: number;
}

export const ScheduleCell: React.FC<ScheduleCellProps> = ({ row, col }) => {
  const series = useTournamentStore((state) => state.series);
  const schedule = useTournamentStore((state) => state.schedule);
  const settings = useTournamentStore((state) => state.settings);
  const unscheduleRound = useTournamentStore((state) => state.unscheduleRound);
  const removeEmptyCell = useTournamentStore((state) => state.removeEmptyCell);
  const scheduleNextRoundOfSeries = useTournamentStore((state) => state.scheduleNextRoundOfSeries);

  // Find round scheduled in this cell (checking if this cell is within the round's positions)
  let roundInfo: { round: any; series: any; isFirstCell: boolean } | null = null;

  for (const sr of schedule) {
    // Find the round to get matchCount
    for (const s of series) {
      const r = s.rounds.find((round) => round.id === sr.roundId);
      if (r) {
        // Get all positions this round occupies
        const positions = getRoundCellPositions(
          sr.row,
          sr.startCol,
          r.matchCount,
          settings.courtCount
        );

        // Check if current cell is in this round's positions
        const cellIndex = positions.findIndex(p => p.row === row && p.col === col);
        if (cellIndex !== -1) {
          roundInfo = {
            round: r,
            series: s,
            isFirstCell: cellIndex === 0
          };
          break;
        }
      }
    }
    if (roundInfo) break;
  }

  const { setNodeRef, isOver, active } = useDroppable({
    id: `cell-${row}-${col}`,
    data: {
      type: 'cell',
      row,
      col,
      isFirstCellOfRound: roundInfo?.isFirstCell || false,
      roundAtThisCell: roundInfo ? roundInfo.round.id : null,
    },
  });

  // Check if we can drop here - now always allow drops, push will handle conflicts
  let canDrop = false;
  let dropReason = '';

  if (active && active.data.current?.type === 'round') {
    // Always allow drop, the scheduleRoundWithPush will handle pushing others
    canDrop = true;
    if (roundInfo?.isFirstCell) {
      dropReason = 'Insérer ici et décaler ce tour et tous les suivants';
    } else if (roundInfo) {
      dropReason = 'Les tours existants seront poussés';
    } else {
      dropReason = 'Placer le tour ici';
    }
  }

  const isEmpty = !roundInfo;
  const showDropIndicator = isOver && active;

  const handleRightClick = (e: React.MouseEvent) => {
    if (isEmpty) {
      e.preventDefault();
      removeEmptyCell(row, col);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onContextMenu={handleRightClick}
      className={`schedule-cell p-1 relative group ${showDropIndicator
        ? canDrop
          ? roundInfo?.isFirstCell
            ? 'bg-blue-100 border-blue-500 border-2 border-dashed' // Indicateur spécial pour insertion avant un round
            : 'bg-green-100 border-green-400 border-2 border-dashed'
          : 'bg-red-100 border-red-400 border-2 border-dashed'
        : ''
        } ${isEmpty ? 'bg-gray-50 hover:bg-gray-100 cursor-context-menu' : ''}`}
      title={showDropIndicator && canDrop ? dropReason : isEmpty ? 'Clic droit pour supprimer cet espace' : ''}
    >
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-xs text-gray-400">🗑️</span>
        </div>
      )}
      {roundInfo && roundInfo.isFirstCell && (
        <DraggableRoundInGrid
          round={roundInfo.round}
          series={roundInfo.series}
          onRemove={() => unscheduleRound(roundInfo!.round.id)}
          onDoubleClick={() => scheduleNextRoundOfSeries(roundInfo!.round.id)}
        />
      )}
      {roundInfo && !roundInfo.isFirstCell && (
        <div className="h-full w-full" style={{
          backgroundColor: roundInfo.series.color,
          opacity: 0.3
        }} />
      )}
    </div>
  );
};
