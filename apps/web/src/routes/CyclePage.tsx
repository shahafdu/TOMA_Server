import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/CancelOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/LockOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { CycleCourse } from '@toma/shared';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useCourseBids, useCycleActions, useCycleBoard, useMe } from '../api/queries.js';
import { DisciplineChip } from '../ui/chips.js';
import { EmptyState, Loading, PageHeader } from '../components/common.js';

const STATUS_COLOR: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  draft: 'default',
  bidding: 'warning',
  registration: 'info',
  locked: 'default',
  completed: 'success',
};

function formatDeadline(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CyclePage() {
  const me = useMe();
  const isHr = ['hr', 'admin', 'developer'].includes(me.data?.role ?? '');
  const board = useCycleBoard();
  const actions = useCycleActions();

  const [bids, setBids] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [regDeadline, setRegDeadline] = useState('');

  const cycle = board.data?.cycle;
  const courses = board.data?.courses ?? [];
  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => Number(k)),
    [selected],
  );

  if (board.isLoading) return <Loading />;
  if (!board.data || !cycle) return <EmptyState message="No training cycle has been set up yet." />;

  const phase = cycle.status;

  return (
    <Box>
      <PageHeader
        title={`Training cycle · Q${cycle.quarter} ${cycle.year}`}
        subtitle={
          phase === 'bidding'
            ? `Bidding closes ${formatDeadline(cycle.biddingClosesAt)}`
            : phase === 'registration'
              ? `Registration closes ${formatDeadline(cycle.registrationClosesAt)}`
              : phase === 'locked'
                ? 'Registration is locked — HR-only changes'
                : undefined
        }
        action={
          <Chip
            label={phase}
            color={STATUS_COLOR[phase] ?? 'default'}
            sx={{ textTransform: 'capitalize' }}
          />
        }
      />

      {phase === 'bidding' && !isHr && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Enter how many of your team you want on each course. You can change these until{' '}
          {formatDeadline(cycle.biddingClosesAt)}.
        </Alert>
      )}
      {phase === 'registration' && !isHr && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Registration is open. Register your team before{' '}
          {formatDeadline(cycle.registrationClosesAt)}; after that it locks and only HR can make
          changes.
        </Alert>
      )}

      <Stack spacing={1.5}>
        {courses.map((c) => (
          <Card key={c.courseId} variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ md: 'center' }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ fontWeight: 700 }}>{c.title}</Typography>
                    <DisciplineChip discipline={c.discipline} />
                    <StateChip state={c.lifecycleState} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {c.capacity == null ? 'Unlimited seats' : `${c.capacity} seats`} · demand{' '}
                    {c.totalBidSeats} · registered {c.registeredCount}
                    {c.waitlistedCount > 0 ? ` · ${c.waitlistedCount} waitlisted` : ''}
                  </Typography>
                </Box>

                <CourseControls
                  course={c}
                  phase={phase}
                  isHr={isHr}
                  bidValue={bids[c.courseId] ?? String(c.myBidSeats ?? 0)}
                  onBidChange={(v) => setBids((b) => ({ ...b, [c.courseId]: v }))}
                  onSaveBid={() =>
                    actions.setBid.mutate({
                      courseId: c.courseId,
                      seats: Math.max(0, Number(bids[c.courseId] ?? c.myBidSeats ?? 0)),
                    })
                  }
                  selected={!!selected[c.courseId]}
                  onSelect={(v) => setSelected((s) => ({ ...s, [c.courseId]: v }))}
                  onDecide={(decision) => actions.decide.mutate({ courseId: c.courseId, decision })}
                  expanded={!!expanded[c.courseId]}
                  onToggleExpand={() =>
                    setExpanded((e) => ({ ...e, [c.courseId]: !e[c.courseId] }))
                  }
                />
              </Stack>

              {isHr && phase === 'bidding' && (
                <Collapse in={!!expanded[c.courseId]} unmountOnExit>
                  <BidBreakdown courseId={c.courseId} enabled={!!expanded[c.courseId]} />
                </Collapse>
              )}
            </CardContent>
          </Card>
        ))}
        {courses.length === 0 && <EmptyState message="No candidate courses in this cycle." />}
      </Stack>

      {isHr && phase === 'bidding' && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Open registration
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Tick the courses to run next quarter and set the registration lock deadline. Unticked
              candidates are dropped.
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mt: 1 }}
              alignItems={{ sm: 'center' }}
            >
              <TextField
                type="datetime-local"
                label="Registration closes"
                size="small"
                value={regDeadline}
                onChange={(e) => setRegDeadline(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Button
                variant="contained"
                disabled={
                  selectedIds.length === 0 || !regDeadline || actions.openRegistration.isPending
                }
                onClick={() =>
                  actions.openRegistration.mutate({
                    cycleId: cycle.id,
                    registrationClosesAt: new Date(regDeadline).toISOString(),
                    courseIds: selectedIds,
                  })
                }
              >
                Open registration for {selectedIds.length} course
                {selectedIds.length === 1 ? '' : 's'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {isHr && phase === 'registration' && (
        <>
          <Divider sx={{ my: 3 }} />
          <Button
            variant="outlined"
            color="warning"
            startIcon={<LockIcon />}
            onClick={() => actions.lock.mutate(cycle.id)}
            disabled={actions.lock.isPending}
          >
            Lock registration now
          </Button>
        </>
      )}
    </Box>
  );
}

function StateChip({ state }: { state: string }) {
  const map: Record<string, { label: string; color: 'default' | 'info' | 'success' | 'error' }> = {
    candidate: { label: 'Candidate', color: 'default' },
    bidding: { label: 'Bidding', color: 'info' },
    open: { label: 'Open', color: 'info' },
    locked: { label: 'Locked', color: 'default' },
    confirmed: { label: 'Confirmed', color: 'success' },
    rejected: { label: 'Rejected', color: 'error' },
  };
  const s = map[state];
  if (!s) return null;
  return <Chip size="small" variant="outlined" color={s.color} label={s.label} />;
}

/** HR-only: per-manager breakdown of who bid on a course and how many seats each requested. */
function BidBreakdown({ courseId, enabled }: { courseId: number; enabled: boolean }) {
  const bids = useCourseBids(courseId, enabled);

  if (bids.isLoading) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Loading bids…
      </Typography>
    );
  }
  const rows = bids.data ?? [];
  if (rows.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        No manager has bid on this course yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      <Divider sx={{ mb: 1 }} />
      <Typography variant="overline" color="text.secondary">
        Bids by manager
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Manager</TableCell>
            <TableCell align="right">Seats</TableCell>
            <TableCell align="right">Last updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((b) => (
            <TableRow key={b.managerId}>
              <TableCell>{b.managerName}</TableCell>
              <TableCell align="right">{b.seats}</TableCell>
              <TableCell align="right">{formatDeadline(b.updatedAt)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell sx={{ fontWeight: 700, borderBottom: 'none' }}>Total</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, borderBottom: 'none' }}>
              {rows.reduce((sum, b) => sum + b.seats, 0)}
            </TableCell>
            <TableCell sx={{ borderBottom: 'none' }} />
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
}

function CourseControls({
  course,
  phase,
  isHr,
  bidValue,
  onBidChange,
  onSaveBid,
  selected,
  onSelect,
  onDecide,
  expanded,
  onToggleExpand,
}: {
  course: CycleCourse;
  phase: string;
  isHr: boolean;
  bidValue: string;
  onBidChange: (v: string) => void;
  onSaveBid: () => void;
  selected: boolean;
  onSelect: (v: boolean) => void;
  onDecide: (d: 'confirm' | 'cancel') => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  // Bidding phase — managers bid seats; HR ticks courses to open.
  if (phase === 'bidding') {
    if (isHr) {
      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={`${course.totalBidSeats} bid`}
            onClick={onToggleExpand}
            clickable
          />
          <IconButton
            size="small"
            onClick={onToggleExpand}
            aria-label={expanded ? 'Hide bids by manager' : 'Show bids by manager'}
            aria-expanded={expanded}
          >
            <ExpandMoreIcon
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms',
              }}
            />
          </IconButton>
          <Checkbox checked={selected} onChange={(e) => onSelect(e.target.checked)} />
        </Stack>
      );
    }
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          type="number"
          size="small"
          label="My bid"
          value={bidValue}
          onChange={(e) => onBidChange(e.target.value)}
          sx={{ width: 100 }}
          slotProps={{ htmlInput: { min: 0 } }}
        />
        <Button variant="outlined" size="small" onClick={onSaveBid}>
          Save
        </Button>
      </Stack>
    );
  }

  // Registration / locked — register team; HR can confirm/cancel the course.
  const canRegister = course.lifecycleState === 'open';
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {canRegister && (
        <Button
          component={RouterLink}
          to={`/catalog/${course.courseId}`}
          size="small"
          variant="outlined"
        >
          Register team
        </Button>
      )}
      {isHr && (course.lifecycleState === 'open' || course.lifecycleState === 'locked') && (
        <>
          <Button
            size="small"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => onDecide('confirm')}
          >
            Confirm
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => onDecide('cancel')}
          >
            Cancel
          </Button>
        </>
      )}
    </Stack>
  );
}
