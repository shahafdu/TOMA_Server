import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { BudgetReport, ComplianceReport, DisciplineProgress, MyTraining } from '@toma/shared';
import { DisciplineChip } from '../ui/chips.js';
import { money } from '../ui/format.js';

export function HoursRing({ hours, target }: { hours: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((hours / target) * 100)) : 0;
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={132}
        thickness={4}
        sx={{ color: 'divider' }}
      />
      <CircularProgress
        variant="determinate"
        value={pct}
        size={132}
        thickness={4}
        sx={{ position: 'absolute', left: 0, color: pct >= 100 ? 'success.main' : 'primary.main' }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ lineHeight: 1 }}>
            {hours}h
          </Typography>
          <Typography variant="caption" color="text.secondary">
            of {target}h target
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function MyTrainingCard({ data }: { data: MyTraining }) {
  const done = data.required.filter((r) => r.completed).length;
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
          flexWrap="wrap"
        >
          <Typography variant="h6">Your training · {data.year}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Discipline
            </Typography>
            <DisciplineChip discipline={data.discipline} />
          </Stack>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
          <HoursRing hours={data.hours} target={data.disciplineGoalHours} />
          <Box sx={{ flexGrow: 1, width: '100%' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Required training — {done}/{data.required.length} complete
            </Typography>
            <Stack spacing={1}>
              {data.required.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No mandatory training assigned.
                </Typography>
              )}
              {data.required.map((r) => (
                <Stack key={r.courseId} direction="row" spacing={1} alignItems="center">
                  {r.completed ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                  )}
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {r.title}
                  </Typography>
                  {!r.completed && (
                    <Chip size="small" color="warning" variant="outlined" label="Due" />
                  )}
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function CompliancePanel({ report }: { report: ComplianceReport }) {
  const overall = Math.round(report.overallRate * 100);
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6">Mandatory compliance</Typography>
            <Typography variant="caption" color="text.secondary">
              {report.scope === 'team' ? 'Your team' : 'Organization'} · {report.totalPeople} people
            </Typography>
          </Box>
          <Typography
            variant="h4"
            color={overall >= 90 ? 'success.main' : overall >= 60 ? 'warning.main' : 'error.main'}
          >
            {overall}%
          </Typography>
        </Stack>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {report.courses.map((c) => {
            const rate = Math.round(c.rate * 100);
            return (
              <Box key={c.courseId}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2">{c.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.completed}/{c.total}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={rate}
                  color={rate >= 90 ? 'success' : rate >= 60 ? 'warning' : 'error'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            );
          })}
          {report.courses.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No mandatory courses this year.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function BudgetPanel({ report }: { report: BudgetReport }) {
  const remaining = report.budget - report.committed;
  const pct =
    report.budget > 0 ? Math.min(100, Math.round((report.committed / report.budget) * 100)) : 0;
  const over = remaining < 0;
  const maxDiscipline = Math.max(1, ...report.byDiscipline.map((d) => d.amount));
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6">Training budget</Typography>
            <Typography variant="caption" color="text.secondary">
              {report.year} · committed vs. allocated
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" sx={{ lineHeight: 1.1 }}>
              {money(report.budget)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              allocated
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Committed {money(report.committed)}
            </Typography>
            <Typography
              variant="body2"
              color={over ? 'error.main' : 'success.main'}
              sx={{ fontWeight: 600 }}
            >
              {over ? `${money(Math.abs(remaining))} over` : `${money(remaining)} left`}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            color={over ? 'error' : pct >= 85 ? 'warning' : 'success'}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>

        {report.byDiscipline.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Committed by discipline
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {report.byDiscipline.map((d) => (
                <Stack key={d.discipline} direction="row" spacing={2} alignItems="center">
                  <Box sx={{ width: 170 }}>
                    <DisciplineChip discipline={d.discipline} />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(d.amount / maxDiscipline) * 100}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" sx={{ width: 84, textAlign: 'right' }}>
                    {money(d.amount)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

/** One row of the informational "hours by subject" breakdown (a proportional bar + hours). */
export function SubjectHoursRow({ p, max }: { p: DisciplineProgress; max: number }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Box sx={{ width: 170, flexShrink: 0 }}>
        <DisciplineChip discipline={p.discipline} />
      </Box>
      <LinearProgress
        variant="determinate"
        value={max > 0 ? (p.actualHours / max) * 100 : 0}
        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
      />
      <Typography variant="body2" sx={{ width: 48, textAlign: 'right' }}>
        {p.actualHours}h
      </Typography>
    </Stack>
  );
}

/** The year's completed hours broken down by the subject (discipline) of each course. */
export function SubjectBreakdown({ items }: { items: DisciplineProgress[] }) {
  const max = Math.max(1, ...items.map((d) => d.actualHours));
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No completed training hours yet.
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5}>
      {items.map((d) => (
        <SubjectHoursRow key={d.discipline} p={d} max={max} />
      ))}
    </Stack>
  );
}

/** Personal "hours by subject" card — where the year's training hours came from. */
export function GoalsPanel({
  byDiscipline,
  year,
}: {
  byDiscipline: DisciplineProgress[];
  year: number;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6">Training by subject</Typography>
        <Typography variant="caption" color="text.secondary">
          {year} · completed hours by course discipline
        </Typography>
        <Box sx={{ mt: 2 }}>
          <SubjectBreakdown items={byDiscipline} />
        </Box>
      </CardContent>
    </Card>
  );
}

export function DisciplineBreakdown({
  counts,
}: {
  counts: { discipline: string; count: number }[];
}) {
  const max = Math.max(1, ...counts.map((c) => c.count));
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Courses by discipline
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {counts.map((c) => (
            <Stack key={c.discipline} direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 180 }}>
                <DisciplineChip discipline={c.discipline} />
              </Box>
              <LinearProgress
                variant="determinate"
                value={(c.count / max) * 100}
                sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
              />
              <Typography variant="body2" sx={{ width: 24, textAlign: 'right' }}>
                {c.count}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
