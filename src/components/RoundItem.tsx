import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Round, Series, getContrastColor } from '../types';

interface RoundItemProps {
  round: Round;
  series: Series;
  isDragging?: boolean;
  onDoubleClick?: () => void;
}

export const RoundItem: React.FC<RoundItemProps> = ({
  round,
  series,
  isDragging,
  onDoubleClick,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: round.id,
    data: {
      type: 'round',
      round,
      series,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    backgroundColor: series.color,
    color: getContrastColor(series.color),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={onDoubleClick}
      className="round-item px-3 py-2 rounded-md shadow-md text-sm font-medium flex flex-col items-center justify-center min-w-[80px] cursor-pointer"
      title="Double-cliquer pour placer automatiquement"
    >
      <span className="font-bold">{series.shortName}</span>
      <span className="text-xs opacity-90">{round.label}</span>
      <span className="text-xs opacity-75">{round.matchCount}m</span>
    </div>
  );
};

// Static version for display in grid (not draggable from pool)
export const RoundItemStatic: React.FC<{
  round: Round;
  series: Series;
  onRemove?: () => void;
}> = ({ round, series, onRemove }) => {
  return (
    <div
      className="px-2 py-1 rounded text-xs font-medium flex items-center justify-between gap-1 w-full h-full"
      style={{
        backgroundColor: series.color,
        color: getContrastColor(series.color),
      }}
    >
      <div className="flex flex-col items-start leading-tight">
        <span className="font-bold">{series.shortName}</span>
        <span className="opacity-90">{round.label}</span>
      </div>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 hover:bg-white/20 rounded opacity-70 hover:opacity-100"
          title="Retirer du planning"
        >
          ✕
        </button>
      )}
    </div>
  );
};

// Draggable version in grid
export const DraggableRoundInGrid: React.FC<{
  round: Round;
  series: Series;
  onRemove: () => void;
  onDoubleClick?: () => void;
}> = ({ round, series, onRemove, onDoubleClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: round.id,
      data: {
        type: 'round',
        round,
        series,
      },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    backgroundColor: series.color,
    color: getContrastColor(series.color),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={onDoubleClick}
      className="round-item px-2 py-1 rounded text-xs font-medium flex items-center justify-between gap-1 w-full h-full cursor-grab active:cursor-grabbing"
      title={onDoubleClick ? "Double-cliquer pour placer le tour suivant de cette série" : undefined}
    >
      <div className="flex flex-col items-start leading-tight">
        <span className="font-bold">{series.shortName}</span>
        <span className="opacity-90">{round.label}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-0.5 hover:bg-white/20 rounded opacity-70 hover:opacity-100"
        title="Retirer du planning"
        onPointerDown={(e) => e.stopPropagation()}
      >
        ✕
      </button>
    </div>
  );
};
