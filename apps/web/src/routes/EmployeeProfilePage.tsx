import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useEmployee, useEmployeeHistory } from '../api/queries.js';
import { EmptyState, Loading } from '../components/common.js';
import { initials } from '../ui/format.js';

export function EmployeeProfilePage() {
  const { id } = useParams();
  const employee = useEmployee(id!);
  const history = useEmployeeHistory(id!);

  if (employee.isLoading) return <Loading />;
  if (employee.error || !employee.data) return <EmptyState message="Employee not found." />;

  const e = employee.data;
  const runs = [...(history.data ?? [])].sort((a, b) => b.year - a.year);

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/employees"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
        color="inherit"
      >
        Back to employees
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 26 }}>
              {initials(e.fullName)}
            </Avatar>
            <Box>
              <Typography variant="h4">{e.fullName}</Typography>
              <Typography color="text.secondary">
                {[e.title, e.department].filter(Boolean).join(' · ') || '—'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} useFlexGap flexWrap="wrap">
                {e.email && <Chip size="small" variant="outlined" label={e.email} />}
                <Chip
                  size="small"
                  color={e.status === 'working' ? 'success' : 'default'}
                  label={e.status}
                  sx={{ textTransform: 'capitalize' }}
                />
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Training history
      </Typography>
      {history.isLoading ? (
        <Loading />
      ) : runs.length === 0 ? (
        <EmptyState message="No training history recorded." />
      ) : (
        <Card>
          <CardContent>
            <Stack spacing={1.5} divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
              {runs.map((r) => (
                <Stack
                  key={`${r.courseId}`}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip label={r.year} size="small" color="primary" variant="outlined" />
                    <Typography sx={{ fontWeight: 600 }}>{r.title}</Typography>
                  </Stack>
                  {r.attended ? (
                    <Chip
                      size="small"
                      color="success"
                      icon={<CheckCircleIcon />}
                      label="Attended"
                    />
                  ) : (
                    <Chip size="small" variant="outlined" label="Registered" />
                  )}
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
