// Types for the badminton tournament scheduler

export interface Round {
  id: string;
  seriesId: string;
  roundNumber: number; // 1-indexed
  matchCount: number;
  label: string; // e.g., "Tour 1", "Demi", "Finale"
}

export interface Series {
  id: string;
  name: string; // e.g., "DH1", "DD2", "Simple Dame 1"
  shortName: string; // Short display name
  color: string; // Auto-generated color
  rounds: Round[];
}

export interface ScheduledRound {
  roundId: string;
  row: number; // Starting time slot row
  startCol: number; // Starting court column (0 to courtCount-1)
  // The round wraps to next rows if it reaches the end of a row
  // Matches are placed continuously, wrapping to col 0 of next row when needed
}

export interface TournamentSettings {
  courtCount: number;
  timeSlotDuration: number; // in minutes
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "18:00"
}

export interface TournamentState {
  settings: TournamentSettings;
  series: Series[];
  schedule: ScheduledRound[];
  scheduleHistory: ScheduledRound[][]; // History of schedule states for undo
  currentPhase: 'config' | 'schedule';
}

export interface GridCell {
  row: number;
  col: number;
}

// Color palette generator
export function generateSeriesColor(index: number, total: number): string {
  // Use HSL to generate distinct colors
  const hue = (index * 360 / Math.max(total, 1)) % 360;
  const saturation = 70 + (index % 3) * 10; // 70-90%
  const lightness = 45 + (index % 2) * 10; // 45-55%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Get contrasting text color
export function getContrastColor(bgColor: string): string {
  // For HSL colors, check lightness
  const match = bgColor.match(/hsl\(\s*(\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (match) {
    const lightness = parseInt(match[3]);
    return lightness > 50 ? '#000000' : '#ffffff';
  }
  return '#ffffff';
}

// Format time from row number
export function formatTime(row: number, startTime: string, slotDuration: number): string {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const totalMinutes = startHour * 60 + startMin + row * slotDuration;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Calculate which cells a round occupies (may span multiple rows)
export function getRoundCellPositions(
  startRow: number,
  startCol: number,
  matchCount: number,
  courtCount: number
): Array<{ row: number; col: number }> {
  const positions: Array<{ row: number; col: number }> = [];
  let currentRow = startRow;
  let currentCol = startCol;

  for (let i = 0; i < matchCount; i++) {
    positions.push({ row: currentRow, col: currentCol });
    currentCol++;

    // Wrap to next row when reaching the end
    if (currentCol >= courtCount) {
      currentCol = 0;
      currentRow++;
    }
  }

  return positions;
}
