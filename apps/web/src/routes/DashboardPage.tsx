import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import PriorityHighIcon from '@mui/icons-material/PriorityHighOutlined';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { useCourses, useEmployees, useMe } from '../api/queries.js';
import { CourseCard } from '../components/CourseCard.js';
import { Loading, PageHeader, StatCard } from '../components/common.js';
import { greeting } from '../ui/format.js';

const CARD_GRID = {
  display: 'grid',
  gap: 2.5,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
};

export function DashboardPage() {
  const me = useMe();
  const courses = useCourses();
  const canSeeTeam = ['hr', 'admin', 'developer', 'manager'].includes(me.data?.role ?? '');
  const employees = useEmployees(undefined);

  const firstName = me.data?.fullName.split(' ')[0] ?? '';
  const list = courses.data ?? [];
  const mandatory = list.filter((c) => c.isMandatory).length;
  const conferences = list.filter((c) => c.type === 'conference').length;

  return (
    <Box>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle="Here's what's happening with training this year."
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          mb: 4,
        }}
      >
        <StatCard label="Courses this year" value={list.length} icon={<SchoolIcon />} />
        <StatCard
          label="Mandatory"
          value={mandatory}
          icon={<PriorityHighIcon />}
          accent="error.main"
        />
        <StatCard
          label="Conferences"
          value={conferences}
          icon={<EmojiEventsIcon />}
          accent="info.main"
        />
        {canSeeTeam && (
          <StatCard
            label="Employees"
            value={employees.data?.total ?? '—'}
            icon={<PeopleIcon />}
            accent="secondary.main"
          />
        )}
      </Box>

      <PageHeader
        title="Course catalog"
        action={
          <Button component={RouterLink} to="/catalog" variant="outlined">
            View all
          </Button>
        }
      />
      {courses.isLoading ? (
        <Loading />
      ) : (
        <Box sx={CARD_GRID}>
          {list.slice(0, 6).map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </Box>
      )}
      {!courses.isLoading && list.length === 0 && (
        <Typography color="text.secondary">No courses scheduled yet.</Typography>
      )}
    </Box>
  );
}
