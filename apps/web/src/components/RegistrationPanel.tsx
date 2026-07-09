import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EventSeatIcon from '@mui/icons-material/EventSeatOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Course, RegistrationStatus } from '@toma/shared';
import { useState } from 'react';
import {
  useCourseAvailability,
  useCourseRoster,
  useManageRegistration,
  useMe,
  useRegister,
} from '../api/queries.js';
import { Loading } from './common.js';
import { initials } from '../ui/format.js';

const REGISTRAR_ROLES = ['hr', 'admin', 'developer', 'manager'];

function StatusPill({ status }: { status: RegistrationStatus }) {
  const map: Record<string, { label: string; color: 'success' | 'warning' | 'default' }> = {
    registered: { label: 'Registered', color: 'success' },
    pending_approval: { label: 'Pending', color: 'warning' },
    waitlisted: { label: 'Waitlisted', color: 'warning' },
    declined: { label: 'Declined', color: 'default' },
    cancelled: { label: 'Cancelled', color: 'default' },
    invited: { label: 'Invited', color: 'default' },
  };
  const s = map[status] ?? { label: status, color: 'default' as const };
  return <Chip size="small" color={s.color} variant="outlined" label={s.label} />;
}

/** Seat accounting line: "10 of 12 seats left" / "Online · unlimited seats". */
function SeatSummary({ course }: { course: Course }) {
  const availability = useCourseAvailability(course.id);
  const a = availability.data;
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
      <EventSeatIcon fontSize="small" />
      <Typography variant="body2">
        {!a
          ? '…'
          : a.unlimited
            ? 'Unlimited seats'
            : `${a.seatsLeft} of ${a.capacity} seats left`}
        {a && a.pending > 0 ? ` · ${a.pending} pending` : ''}
        {a && a.waitlisted > 0 ? ` · ${a.waitlisted} waitlisted` : ''}
      </Typography>
    </Stack>
  );
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RegistrationPanel({ course }: { course: Course }) {
  const me = useMe();
  const role = me.data?.role ?? '';
  const isHr = ['hr', 'admin', 'developer'].includes(role);
  const isRegistrar = REGISTRAR_ROLES.includes(role);
  const availability = useCourseAvailability(course.id);
  const a = availability.data;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">Registration</Typography>
        </Stack>
        <SeatSummary course={course} />
        {a?.locked ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Registration is locked{isHr ? ' — as HR you can still make changes.' : ' — contact HR for changes.'}
          </Alert>
        ) : (
          a?.registrationClosesAt && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Registration closes {formatDeadline(a.registrationClosesAt)}.
            </Alert>
          )
        )}
        <Divider sx={{ my: 2 }} />
        {isRegistrar ? (
          <RosterList course={course} orgScope={isHr} />
        ) : (
          <SelfRegister course={course} employeeId={me.data?.id ?? ''} />
        )}
      </CardContent>
    </Card>
  );
}

function RosterList({ course, orgScope }: { course: Course; orgScope: boolean }) {
  const roster = useCourseRoster(course.id, true);
  const register = useRegister(course.id);
  const manage = useManageRegistration(course.id);
  const [busy, setBusy] = useState<string | null>(null);

  if (roster.isLoading) return <Loading />;
  if (!roster.data) return null;
  const { entries, managerSeatsLeft } = roster.data;

  const act = async (fn: Promise<unknown>, id: string) => {
    setBusy(id);
    try {
      await fn;
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box>
      {managerSeatsLeft != null && (
        <Alert severity={managerSeatsLeft > 0 ? 'info' : 'warning'} sx={{ mb: 2 }}>
          You can register {managerSeatsLeft} more {managerSeatsLeft === 1 ? 'person' : 'people'} for
          this course.
        </Alert>
      )}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {orgScope ? 'All employees' : 'Your team'} ({entries.length})
      </Typography>
      <Stack spacing={0.5} sx={{ maxHeight: 460, overflowY: 'auto' }}>
        {entries.map((e) => (
          <Stack
            key={e.employee.id}
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ py: 1, px: 1, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 13 }}>
              {initials(e.employee.fullName)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {e.employee.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {[e.employee.title, e.employee.department].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
            {e.status === 'pending_approval' ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <StatusPill status={e.status} />
                <Tooltip title="Approve">
                  <span>
                    <IconButton
                      size="small"
                      color="success"
                      disabled={busy === e.employee.id}
                      onClick={() =>
                        act(
                          manage.mutateAsync({ employeeId: e.employee.id, action: 'approve' }),
                          e.employee.id,
                        )
                      }
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Decline">
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={busy === e.employee.id}
                      onClick={() =>
                        act(
                          manage.mutateAsync({ employeeId: e.employee.id, action: 'decline' }),
                          e.employee.id,
                        )
                      }
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ) : e.status === 'registered' || e.status === 'waitlisted' ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <StatusPill status={e.status} />
                <Tooltip title="Unregister">
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={busy === e.employee.id}
                      onClick={() =>
                        act(
                          manage.mutateAsync({ employeeId: e.employee.id, action: 'cancel' }),
                          e.employee.id,
                        )
                      }
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ) : e.eligible ? (
              <Tooltip title={e.reason ?? ''}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy === e.employee.id}
                  onClick={() =>
                    act(
                      register.mutateAsync({ employeeId: e.employee.id, source: 'manager' }),
                      e.employee.id,
                    )
                  }
                >
                  {e.reason?.includes('waitlist') ? 'Waitlist' : 'Register'}
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title={e.reason ?? 'Not eligible'}>
                <span>
                  <Button size="small" variant="outlined" disabled>
                    Register
                  </Button>
                </span>
              </Tooltip>
            )}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

function SelfRegister({ course, employeeId }: { course: Course; employeeId: string }) {
  const register = useRegister(course.id);
  const [done, setDone] = useState<RegistrationStatus | null>(null);

  if (course.selfRegistration === 'none') {
    return (
      <Alert severity="info">
        Registration for this course is managed by your manager or HR.
      </Alert>
    );
  }

  const approval = course.selfRegistration === 'approval_required';
  if (done) {
    return (
      <Alert severity="success">
        {done === 'pending_approval'
          ? 'Your request was sent and is awaiting approval.'
          : "You're registered for this course."}
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {approval
          ? 'This course needs manager approval. Send a request to join.'
          : 'This course is open for registration.'}
      </Typography>
      <Button
        variant="contained"
        disabled={register.isPending}
        onClick={async () => {
          const res = await register.mutateAsync({ employeeId, source: 'self' });
          setDone(res.registration?.status ?? 'registered');
        }}
      >
        {approval ? 'Request to join' : 'Register'}
      </Button>
      {register.isError && (
        <Alert severity="error">{(register.error as Error).message}</Alert>
      )}
    </Stack>
  );
}
