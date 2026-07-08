import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import PriorityHighIcon from '@mui/icons-material/PriorityHighOutlined';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useCompliance, useCourses, useEmployees, useMe, useMyTraining } from '../api/queries.js';
import { CourseCard } from '../components/CourseCard.js';
import { CompliancePanel, DisciplineBreakdown, MyTrainingCard } from '../components/dashboard.js';
import { Loading, PageHeader, StatCard } from '../components/common.js';
import { greeting } from '../ui/format.js';

const CARD_GRID = {
  display: 'grid',
  gap: 2.5,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
};

export function DashboardPage() {
  const me = useMe();
  const role = me.data?.role ?? '';
  const canSeeTeam = ['hr', 'admin', 'developer', 'manager'].includes(role);

  const courses = useCourses();
  const employees = useEmployees(undefined);
  const myTraining = useMyTraining();
  const compliance = useCompliance(undefined, canSeeTeam);

  const firstName = me.data?.fullName.split(' ')[0] ?? '';
  const list = courses.data ?? [];
  const mandatory = list.filter((c) => c.isMandatory).length;

  const disciplineCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of list) if (c.discipline) map.set(c.discipline, (map.get(c.discipline) ?? 0) + 1);
    return [...map.entries()]
      .map(([discipline, count]) => ({ discipline, count }))
      .sort((a, b) => b.count - a.count);
  }, [list]);

  return (
    <Box>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={
          canSeeTeam
            ? "Your training and the organization's big picture."
            : 'Your training at a glance.'
        }
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
          label={canSeeTeam ? 'Compliance' : 'Required done'}
          value={
            canSeeTeam
              ? compliance.data
                ? `${Math.round(compliance.data.overallRate * 100)}%`
                : '—'
              : myTraining.data
                ? `${myTraining.data.required.filter((r) => r.completed).length}/${myTraining.data.required.length}`
                : '—'
          }
          icon={<VerifiedIcon />}
          accent="success.main"
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

      {/* Personal view (everyone) + big picture (HR/manager) */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', lg: canSeeTeam ? '1fr 1fr' : '1fr' },
          mb: 4,
        }}
      >
        {myTraining.isLoading ? (
          <Loading />
        ) : (
          myTraining.data && <MyTrainingCard data={myTraining.data} />
        )}
        {canSeeTeam &&
          (compliance.isLoading ? (
            <Loading />
          ) : (
            compliance.data && <CompliancePanel report={compliance.data} />
          ))}
      </Box>

      {canSeeTeam && disciplineCounts.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <DisciplineBreakdown counts={disciplineCounts} />
        </Box>
      )}

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
    </Box>
  );
}
