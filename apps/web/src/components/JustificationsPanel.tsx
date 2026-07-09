import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { AttendanceJustification } from '@toma/shared';
import { useState } from 'react';
import { useJustificationActions, useJustifications, useMe } from '../api/queries.js';
import { EmptyState, Loading } from './common.js';

const STATUS: Record<
  string,
  { label: string; color: 'default' | 'warning' | 'info' | 'success' | 'error' }
> = {
  requested: { label: 'Reason needed', color: 'warning' },
  submitted: { label: 'Awaiting HR review', color: 'info' },
  accepted: { label: 'Accepted', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
};

export function JustificationsPanel({ hideWhenEmpty = false }: { hideWhenEmpty?: boolean } = {}) {
  const me = useMe();
  const isHr = ['hr', 'admin', 'developer'].includes(me.data?.role ?? '');
  const list = useJustifications();

  if (hideWhenEmpty && (list.data ?? []).length === 0) return null;

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Absence justifications
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isHr
            ? 'No-shows awaiting a reason or your review.'
            : 'Provide a reason for any recorded absence, for HR to review.'}
        </Typography>
        {list.isLoading ? (
          <Loading />
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState message="No absence justifications." />
        ) : (
          <Stack spacing={1.5}>
            {list.data!.map((j) => (
              <JustificationRow key={j.id} j={j} isHr={isHr} myId={me.data?.id ?? ''} />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function JustificationRow({
  j,
  isHr,
  myId,
}: {
  j: AttendanceJustification;
  isHr: boolean;
  myId: string;
}) {
  const { submit, review } = useJustificationActions();
  const [reason, setReason] = useState('');
  const s = STATUS[j.status] ?? { label: j.status, color: 'default' as const };
  const canSubmit = !isHr && (j.status === 'requested' || j.status === 'submitted');

  return (
    <Box sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {j.courseTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {j.employeeName}
            {j.sessionDate ? ` · ${j.sessionDate}` : ''}
          </Typography>
        </Box>
        <Chip size="small" variant="outlined" color={s.color} label={s.label} />
      </Stack>

      {j.reason && (
        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
          “{j.reason}”
        </Typography>
      )}

      {canSubmit && (j.employeeId === myId || j.status === 'requested') && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Reason for the absence…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            variant="contained"
            disabled={!reason.trim() || submit.isPending}
            onClick={() => submit.mutate({ id: j.id, reason: reason.trim() })}
          >
            Submit
          </Button>
        </Stack>
      )}

      {isHr && j.status === 'submitted' && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button
            size="small"
            color="success"
            variant="outlined"
            onClick={() => review.mutate({ id: j.id, decision: 'accept' })}
          >
            Accept
          </Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={() => review.mutate({ id: j.id, decision: 'reject' })}
          >
            Reject
          </Button>
        </Stack>
      )}
    </Box>
  );
}
