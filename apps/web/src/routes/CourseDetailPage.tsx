import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Link from '@mui/material/Link';
import { useCourse, useCourseParticipants, useCourseSessions, useMe } from '../api/queries.js';
import { EmptyState, Loading, PageHeader } from '../components/common.js';
import { RegistrationPanel } from '../components/RegistrationPanel.js';
import { DeliveryChip, DisciplineChip, MandatoryChip, StatusChip, TypeChip } from '../ui/chips.js';
import { formatDate, formatTime, hours, initials, money } from '../ui/format.js';

export function CourseDetailPage() {
  const { id } = useParams();
  const courseId = Number(id);
  const me = useMe();
  const course = useCourse(courseId);
  const sessions = useCourseSessions(courseId);
  const canSeeParticipants = ['hr', 'admin', 'developer', 'manager'].includes(me.data?.role ?? '');
  const participants = useCourseParticipants(courseId, canSeeParticipants);
  const [tab, setTab] = useState(0);

  if (course.isLoading) return <Loading />;
  if (course.error || !course.data) return <EmptyState message="Course not found." />;

  const c = course.data;
  const price = money(c.price);

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/catalog"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
        color="inherit"
      >
        Back to catalog
      </Button>

      <PageHeader
        title={c.title}
        action={price ? <Typography variant="h5">{price}</Typography> : undefined}
      />
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
        <TypeChip type={c.type} />
        <StatusChip status={c.status} />
        <DeliveryChip deliveryType={c.deliveryType} />
        {c.isMandatory && <MandatoryChip />}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 380px' },
          alignItems: 'start',
        }}
      >
        <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" />
          <Tab label={`Sessions${sessions.data ? ` (${sessions.data.length})` : ''}`} />
          {canSeeParticipants && (
            <Tab
              label={`Participants${participants.data ? ` (${participants.data.length})` : ''}`}
            />
          )}
        </Tabs>
        <CardContent sx={{ p: 3 }}>
          {tab === 0 && (
            <Stack spacing={2}>
              <Typography color="text.secondary">
                {c.descriptionHtml?.replace(/<[^>]*>/g, '') || 'No description provided.'}
              </Typography>
              <Divider />
              <Meta label="Year" value={String(c.year)} />
              {c.discipline && (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography color="text.secondary">Discipline</Typography>
                  <DisciplineChip discipline={c.discipline} />
                </Stack>
              )}
              {c.totalHours > 0 && <Meta label="Total hours" value={hours(c.totalHours)} />}
              <Meta label="Delivery" value={c.deliveryType === 'online' ? 'Online' : 'In person'} />
              {c.deliveryType === 'online' && c.platformUrl ? (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography color="text.secondary">Connection link</Typography>
                  <Link href={c.platformUrl} target="_blank" rel="noopener" sx={{ fontWeight: 600 }}>
                    Join online
                  </Link>
                </Stack>
              ) : (
                c.location && <Meta label="Location" value={c.location} />
              )}
              <Meta label="Provider" value={c.isInternal ? 'Internal' : 'External provider'} />
              <Meta
                label="Self-registration"
                value={
                  c.selfRegistration === 'none'
                    ? 'Manager / HR only'
                    : c.selfRegistration === 'open'
                      ? 'Open'
                      : 'Approval required'
                }
              />
              <Meta
                label="Seats"
                value={c.capacity == null ? 'Unlimited' : String(c.capacity)}
              />
              {c.restrictedTeams.length > 0 && (
                <Meta label="Open to teams" value={c.restrictedTeams.join(', ')} />
              )}
              {(c.excludeSubcontractors || c.excludeStudents) && (
                <Meta
                  label="Excluded"
                  value={[
                    c.excludeSubcontractors ? 'Subcontractors' : null,
                    c.excludeStudents ? 'Students' : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                />
              )}
            </Stack>
          )}

          {tab === 1 &&
            (sessions.isLoading ? (
              <Loading />
            ) : (sessions.data ?? []).length === 0 ? (
              <EmptyState message="No sessions scheduled." />
            ) : (
              <List disablePadding>
                {sessions.data!.map((s) => (
                  <ListItem key={s.id} disableGutters sx={{ py: 1 }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ScheduleIcon fontSize="small" color="action" />
                          <span>
                            {formatDate(s.startsAt)} · {formatTime(s.startsAt)}–
                            {formatTime(s.endsAt)}
                          </span>
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                          {s.venue && <PlaceIcon fontSize="inherit" />}
                          <span>{[s.venue, s.lecturer].filter(Boolean).join(' · ') || 'TBD'}</span>
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ))}

          {tab === 2 &&
            canSeeParticipants &&
            (participants.isLoading ? (
              <Loading />
            ) : (participants.data ?? []).length === 0 ? (
              <EmptyState message="No participants registered yet." />
            ) : (
              <List disablePadding>
                {participants.data!.map((p) => (
                  <ListItem
                    key={p.id}
                    disableGutters
                    component={RouterLink}
                    to={`/employees/${p.id}`}
                    sx={{
                      color: 'inherit',
                      textDecoration: 'none',
                      borderRadius: 2,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{initials(p.fullName)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={p.fullName}
                      secondary={[p.title, p.department].filter(Boolean).join(' · ')}
                    />
                  </ListItem>
                ))}
              </List>
            ))}
        </CardContent>
      </Card>

        <RegistrationPanel course={c} />
      </Box>
    </Box>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{value}</Typography>
    </Stack>
  );
}
