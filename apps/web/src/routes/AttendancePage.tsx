import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventAvailableIcon from '@mui/icons-material/EventAvailableOutlined';
import PercentIcon from '@mui/icons-material/PercentOutlined';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useAttendance, useMe } from '../api/queries.js';
import { EmptyState, Loading, PageHeader, StatCard } from '../components/common.js';
import { JustificationsPanel } from '../components/JustificationsPanel.js';
import { DisciplineChip } from '../ui/chips.js';

export function AttendancePage() {
  const me = useMe();
  const role = me.data?.role ?? '';
  const canOrg = ['hr', 'admin', 'developer'].includes(role);
  const hasTeam = me.data?.hasTeam ?? false;

  const [scope, setScope] = useState<'team' | 'organization'>(canOrg ? 'organization' : 'team');
  const report = useAttendance(scope);

  const rate =
    report.data && report.data.totalRegistrations > 0
      ? Math.round((report.data.attendedCount / report.data.totalRegistrations) * 100)
      : 0;

  return (
    <Box>
      <PageHeader
        title="Attendance"
        subtitle="Did registered people actually attend their training?"
      />

      {canOrg && hasTeam && (
        <Tabs
          value={scope}
          onChange={(_, v) => setScope(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="team" label="My team" />
          <Tab value="organization" label="Organization" />
        </Tabs>
      )}

      {report.isLoading ? (
        <Loading />
      ) : !report.data ? (
        <EmptyState message="No attendance data." />
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
              mb: 3,
            }}
          >
            <StatCard
              label="Registrations"
              value={report.data.totalRegistrations}
              icon={<PlaylistAddCheckIcon />}
            />
            <StatCard
              label="Attended"
              value={report.data.attendedCount}
              icon={<EventAvailableIcon />}
              accent="success.main"
            />
            <StatCard
              label="Attendance rate"
              value={`${rate}%`}
              icon={<PercentIcon />}
              accent="primary.main"
            />
          </Box>

          <Card>
            <CardContent sx={{ p: 0 }}>
              {report.data.entries.length === 0 ? (
                <EmptyState message="No registrations in this scope yet." />
              ) : (
                <TableContainer sx={{ maxHeight: 640 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell>Discipline</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Attended</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.data.entries.map((e) => (
                        <TableRow key={`${e.courseId}-${e.employeeId}`} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {e.employeeName}
                            </Typography>
                            {e.department && (
                              <Typography variant="caption" color="text.secondary">
                                {e.department}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{e.courseTitle}</TableCell>
                          <TableCell>
                            <DisciplineChip discipline={e.discipline} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              variant="outlined"
                              color={e.registrationStatus === 'registered' ? 'success' : 'warning'}
                              label={e.registrationStatus.replace('_', ' ')}
                            />
                          </TableCell>
                          <TableCell align="center">
                            {e.attended ? (
                              <CheckCircleIcon color="success" fontSize="small" />
                            ) : (
                              <RemoveCircleOutlineIcon color="disabled" fontSize="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Box sx={{ mt: 3 }}>
        <JustificationsPanel />
      </Box>
    </Box>
  );
}
