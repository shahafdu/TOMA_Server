import Chip, { type ChipProps } from '@mui/material/Chip';
import type { Course } from '@toma/shared';

type Color = ChipProps['color'];

const STATUS: Record<Course['status'], { label: string; color: Color }> = {
  requested: { label: 'Requested', color: 'warning' },
  tentative: { label: 'Tentative', color: 'warning' },
  scheduled: { label: 'Scheduled', color: 'info' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'default' },
  archived: { label: 'Archived', color: 'default' },
};

const TYPE: Record<Course['type'], { label: string; color: Color }> = {
  technical: { label: 'Technical', color: 'primary' },
  enrichment: { label: 'Enrichment', color: 'secondary' },
  conference: { label: 'Conference', color: 'info' },
};

export function StatusChip({ status }: { status: Course['status'] }) {
  const s = STATUS[status];
  return <Chip size="small" variant="outlined" color={s.color} label={s.label} />;
}

export function TypeChip({ type }: { type: Course['type'] }) {
  const t = TYPE[type];
  return <Chip size="small" color={t.color} label={t.label} />;
}

export function DeliveryChip({ deliveryType }: { deliveryType: Course['deliveryType'] }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={deliveryType === 'online' ? 'Online' : 'In person'}
    />
  );
}

export function MandatoryChip() {
  return <Chip size="small" color="error" variant="outlined" label="Mandatory" />;
}

const QUARTER_COLOR: Record<number, string> = {
  1: '#0ea5e9',
  2: '#10b981',
  3: '#f59e0b',
  4: '#8b5cf6',
};

/** A small calendar-quarter badge (`Q2`) for training cards. */
export function QuarterChip({ quarter }: { quarter: number }) {
  const color = QUARTER_COLOR[quarter] ?? '#64748b';
  return (
    <Chip
      size="small"
      label={`Q${quarter}`}
      sx={{
        bgcolor: `${color}1f`,
        color,
        fontWeight: 700,
        border: `1px solid ${color}55`,
      }}
    />
  );
}

// Deterministic, calm background per high-level discipline so the app reads as one system.
const DISCIPLINE_COLORS: Record<string, string> = {
  SW: '#4f46e5',
  HW: '#0891b2',
  FW: '#0d9488',
  DevOps: '#0ea5e9',
  IT: '#7c3aed',
  HR: '#db2777',
  Finance: '#16a34a',
  Management: '#d97706',
  'Senior Management': '#b45309',
  'Project Management': '#dc2626',
  General: '#64748b',
};

function colorFor(discipline: string): string {
  if (DISCIPLINE_COLORS[discipline]) return DISCIPLINE_COLORS[discipline];
  let hash = 0;
  for (let i = 0; i < discipline.length; i++)
    hash = discipline.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360} 55% 45%)`;
}

export function DisciplineChip({
  discipline,
  subDiscipline,
}: {
  discipline: string | null;
  subDiscipline?: string | null;
}) {
  if (!discipline) return null;
  const color = colorFor(discipline);
  return (
    <Chip
      size="small"
      label={subDiscipline ? `${discipline} · ${subDiscipline}` : discipline}
      sx={{
        bgcolor: `${color}1f`,
        color,
        fontWeight: 600,
        border: `1px solid ${color}55`,
      }}
    />
  );
}
