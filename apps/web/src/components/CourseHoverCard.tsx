import EventSeatIcon from '@mui/icons-material/EventSeatOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import VideocamIcon from '@mui/icons-material/VideocamOutlined';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Course } from '@toma/shared';
import type { ReactNode } from 'react';
import { useCourseAvailability, useCourseRoster } from '../api/queries.js';
import { dateRangeLabel } from '../ui/format.js';

const ORG_ROLES = ['hr', 'admin', 'developer'];

const MY_STATUS_LABEL: Record<string, string> = {
  registered: "You're registered",
  pending_approval: 'Your request is pending',
  waitlisted: "You're waitlisted",
  declined: 'Your request was declined',
  cancelled: 'Your registration was cancelled',
};

/** The role-aware popover shown when hovering a training in the calendar (requirement #5). */
export function CourseHoverCard({ course, role }: { course: Course; role: string }) {
  const isOrg = ORG_ROLES.includes(role);
  const isManager = role === 'manager';
  const availability = useCourseAvailability(course.id);
  const roster = useCourseRoster(course.id, isManager);

  const a = availability.data;
  const range = dateRangeLabel(course.sessions);

  return (
    <Box sx={{ p: 0.5, minWidth: 220, maxWidth: 280 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {course.title}
      </Typography>
      {range && (
        <Typography variant="caption" color="inherit" sx={{ opacity: 0.85 }}>
          {range}
        </Typography>
      )}

      <Stack spacing={0.75} sx={{ mt: 1 }}>
        <Line
          icon={course.deliveryType === 'online' ? <VideocamIcon fontSize="inherit" /> : <PlaceIcon fontSize="inherit" />}
          text={course.deliveryType === 'online' ? 'Online' : (course.location ?? 'In person')}
        />

        {!a ? (
          <CircularProgress size={14} sx={{ my: 0.5 }} />
        ) : (
          <>
            {/* Role-aware registration status. */}
            {isOrg && (
              <Line icon={<GroupsIcon fontSize="inherit" />} text={`${a.registered} registered${a.pending ? ` · ${a.pending} pending` : ''}`} />
            )}
            {isManager && roster.data && (
              <Line
                icon={<GroupsIcon fontSize="inherit" />}
                text={`${roster.data.managerSeatsUsed} of your team registered`}
              />
            )}
            {!isOrg && !isManager && (
              <Line
                icon={<PersonIcon fontSize="inherit" />}
                text={a.myStatus ? (MY_STATUS_LABEL[a.myStatus] ?? a.myStatus) : 'Not registered'}
              />
            )}
            <Line
              icon={<EventSeatIcon fontSize="inherit" />}
              text={a.unlimited ? 'Unlimited seats' : `${a.seatsLeft} of ${a.capacity} seats left`}
            />
          </>
        )}
      </Stack>
    </Box>
  );
}

function Line({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ fontSize: 15 }}>
      <Box sx={{ display: 'flex', opacity: 0.8 }}>{icon}</Box>
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}
