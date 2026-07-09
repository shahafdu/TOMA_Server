import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useAttendanceGrid, useMarkAttendance } from '../api/queries.js';
import { EmptyState, Loading, PageHeader } from '../components/common.js';
import { formatDate } from '../ui/format.js';

export function CourseAttendancePage() {
  const { id } = useParams();
  const courseId = Number(id);
  const grid = useAttendanceGrid(courseId);
  const mark = useMarkAttendance(courseId);

  if (grid.isLoading) return <Loading />;
  if (grid.error || !grid.data) return <EmptyState message="Attendance is not available." />;
  const g = grid.data;

  return (
    <Box>
      <Button
        component={RouterLink}
        to={`/catalog/${courseId}`}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
        color="inherit"
      >
        Back to course
      </Button>
      <PageHeader
        title={`Attendance · ${g.courseTitle}`}
        subtitle="Tick each person who attended. Mark absences at the end of each day — a no-show triggers a justification request."
      />

      {g.rows.length === 0 ? (
        <EmptyState message="No one is registered on this course yet." />
      ) : (
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  {g.sessions.map((s) => (
                    <TableCell key={s.startsAt} align="center">
                      {formatDate(s.startsAt)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {g.rows.map((row) => (
                  <TableRow key={row.employeeId} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.employeeName}
                      </Typography>
                    </TableCell>
                    {g.sessions.map((s, i) => (
                      <TableCell key={s.startsAt} align="center">
                        <Checkbox
                          checked={row.present[i] ?? false}
                          disabled={mark.isPending}
                          onChange={(e) =>
                            mark.mutate({
                              employeeId: row.employeeId,
                              sessionStart: s.startsAt,
                              present: e.target.checked,
                            })
                          }
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
}
