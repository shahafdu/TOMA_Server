import AccessTimeIcon from '@mui/icons-material/AccessTimeOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailableOutlined';
import PeopleIcon from '@mui/icons-material/PeopleAltOutlined';
import PriorityHighIcon from '@mui/icons-material/PriorityHighOutlined';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useCompliance, useCourses, useEmployees, useMe, useMyTraining } from '../api/queries.js';
import { CourseCard } from '../components/CourseCard.js';
import { CompliancePanel, DisciplineBreakdown, MyTrainingCard } from '../components/dashboard.js';
import { EmptyState, Loading, PageHeader, StatCard } from '../components/common.js';
import { greeting } from '../ui/format.js';

const CARD_GRID = {
  display: 'grid',
  gap: 2.5,
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
};
const KPI_GRID = {
  display: 'grid',
  gap: 2.5,
  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
  mb: 4,
};

type View = 'personal' | 'team' | 'company';

export function DashboardPage() {
  const me = useMe();
  const role = me.data?.role ?? '';
  const hasTeam = me.data?.hasTeam ?? false;
  const canCompany = ['hr', 'admin', 'developer'].includes(role);

  const views = useMemo<View[]>(() => {
    const v: View[] = ['personal'];
    if (hasTeam) v.push('team');
    if (canCompany) v.push('company');
    return v;
  }, [hasTeam, canCompany]);

  const [view, setView] = useState<View>('personal');
  const active = views.includes(view) ? view : 'personal';

  const courses = useCourses();
  const myTraining = useMyTraining();
  const employees = useEmployees(undefined);
  const teamCompliance = useCompliance('team', undefined, hasTeam && active === 'team');
  const companyCompliance = useCompliance(
    'organization',
    undefined,
    canCompany && active === 'company',
  );

  const firstName = me.data?.fullName.split(' ')[0] ?? '';
  const list = courses.data ?? [];

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
        subtitle="Training at a glance."
        action={
          <Button component={RouterLink} to="/catalog" variant="outlined">
            Browse catalog
          </Button>
        }
      />

      {views.length > 1 && (
        <Tabs
          value={active}
          onChange={(_, v) => setView(v)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="personal" label="Personal" />
          {hasTeam && <Tab value="team" label="My team" />}
          {canCompany && <Tab value="company" label="Company" />}
        </Tabs>
      )}

      {active === 'personal' && (
        <Box>
          {myTraining.data && (
            <Box sx={KPI_GRID}>
              <StatCard
                label="Training hours"
                value={`${myTraining.data.hours}h`}
                icon={<AccessTimeIcon />}
              />
              <StatCard
                label="Required done"
                value={`${myTraining.data.required.filter((r) => r.completed).length}/${myTraining.data.required.length}`}
                icon={<VerifiedIcon />}
                accent="success.main"
              />
              <StatCard
                label="Registered courses"
                value={myTraining.data.registeredCount}
                icon={<EventAvailableIcon />}
                accent="secondary.main"
              />
              <StatCard label="Courses offered" value={list.length} icon={<SchoolIcon />} />
            </Box>
          )}
          {myTraining.isLoading ? (
            <Loading />
          ) : (
            myTraining.data && <MyTrainingCard data={myTraining.data} />
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
      )}

      {active === 'team' && (
        <Box>
          {teamCompliance.isLoading ? (
            <Loading />
          ) : teamCompliance.data ? (
            teamCompliance.data.totalPeople === 0 ? (
              <EmptyState message="No one reports to you in the system." />
            ) : (
              <CompliancePanel report={teamCompliance.data} />
            )
          ) : null}
        </Box>
      )}

      {active === 'company' && (
        <Box>
          <Box sx={KPI_GRID}>
            <StatCard label="Courses this year" value={list.length} icon={<SchoolIcon />} />
            <StatCard
              label="Mandatory"
              value={list.filter((c) => c.isMandatory).length}
              icon={<PriorityHighIcon />}
              accent="error.main"
            />
            <StatCard
              label="Compliance"
              value={
                companyCompliance.data
                  ? `${Math.round(companyCompliance.data.overallRate * 100)}%`
                  : '—'
              }
              icon={<VerifiedIcon />}
              accent="success.main"
            />
            <StatCard
              label="Employees"
              value={employees.data?.total ?? '—'}
              icon={<PeopleIcon />}
              accent="secondary.main"
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              mb: 4,
            }}
          >
            {companyCompliance.isLoading ? (
              <Loading />
            ) : (
              companyCompliance.data && <CompliancePanel report={companyCompliance.data} />
            )}
            {disciplineCounts.length > 0 && <DisciplineBreakdown counts={disciplineCounts} />}
          </Box>
        </Box>
      )}
    </Box>
  );
}
