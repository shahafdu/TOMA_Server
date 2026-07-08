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
