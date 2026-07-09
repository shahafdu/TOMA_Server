import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { Course } from '@toma/shared';
import { useMemo, useState } from 'react';
import { useCourses } from '../api/queries.js';
import { CourseCard } from '../components/CourseCard.js';
import { EmptyState, Loading, PageHeader } from '../components/common.js';
import { quarterOf } from '../ui/format.js';

type TypeFilter = 'all' | Course['type'];
/** `all` = any quarter; a number narrows to sessions in that calendar quarter. */
type QuarterFilter = 'all' | 1 | 2 | 3 | 4;

const CURRENT_QUARTER = Math.floor(new Date().getMonth() / 3) + 1;
const NEXT_QUARTER = ((CURRENT_QUARTER % 4) + 1) as 1 | 2 | 3 | 4;

/** A course "belongs to" a quarter if any of its sessions start in that quarter. */
function inQuarter(course: Course, quarter: number): boolean {
  return course.sessions.some((s) => quarterOf(s.startsAt) === quarter);
}

/** A course matches a date range if any session overlaps [from, to] (inclusive, date-only). */
function inRange(course: Course, from: string, to: string): boolean {
  const lo = from || '0000';
  const hi = to ? `${to}T23:59:59` : '9999';
  return course.sessions.some((s) => s.startsAt <= hi && s.endsAt >= lo);
}

export function CatalogPage() {
  const courses = useCourses();
  const [q, setQ] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [discipline, setDiscipline] = useState('all');
  const [quarter, setQuarter] = useState<QuarterFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const hasRange = from !== '' || to !== '';

  const disciplines = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses.data ?? []) if (c.discipline) set.add(c.discipline);
    return [...set].sort();
  }, [courses.data]);

  const filtered = useMemo(() => {
    const list = courses.data ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter(
      (c) =>
        (type === 'all' || c.type === type) &&
        (discipline === 'all' || c.discipline === discipline) &&
        (needle === '' || c.title.toLowerCase().includes(needle)) &&
        // A custom date range takes precedence over the quarter selector.
        (hasRange ? inRange(c, from, to) : quarter === 'all' || inQuarter(c, quarter)),
    );
  }, [courses.data, q, type, discipline, quarter, from, to, hasRange]);

  const pickQuarter = (target: 1 | 2 | 3 | 4) => {
    setFrom('');
    setTo('');
    setQuarter(target);
  };

  return (
    <Box>
      <PageHeader
        title="Course catalog"
        subtitle={courses.data ? `${courses.data.length} courses this year` : undefined}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          placeholder="Search courses…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, maxWidth: 420 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          label="Discipline"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">All disciplines</MenuItem>
          {disciplines.map((d) => (
            <MenuItem key={d} value={d}>
              {d}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as TypeFilter)}
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All types</MenuItem>
          <MenuItem value="technical">Technical</MenuItem>
          <MenuItem value="enrichment">Enrichment</MenuItem>
          <MenuItem value="conference">Conference</MenuItem>
        </TextField>
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        useFlexGap
        flexWrap="wrap"
        alignItems={{ md: 'center' }}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant={!hasRange && quarter === CURRENT_QUARTER ? 'contained' : 'outlined'}
            onClick={() => pickQuarter(CURRENT_QUARTER as 1 | 2 | 3 | 4)}
          >
            This quarter
          </Button>
          <Button
            size="small"
            variant={!hasRange && quarter === NEXT_QUARTER ? 'contained' : 'outlined'}
            onClick={() => pickQuarter(NEXT_QUARTER)}
          >
            Next quarter
          </Button>
        </Stack>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={hasRange ? null : quarter}
          onChange={(_, v: QuarterFilter | null) => {
            if (v === null) return;
            setFrom('');
            setTo('');
            setQuarter(v);
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value={1}>Q1</ToggleButton>
          <ToggleButton value={2}>Q2</ToggleButton>
          <ToggleButton value={3}>Q3</ToggleButton>
          <ToggleButton value={4}>Q4</ToggleButton>
        </ToggleButtonGroup>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="From"
            type="date"
            size="small"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 150 }}
          />
          {hasRange && (
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
            >
              Clear
            </Button>
          )}
        </Stack>
      </Stack>

      {courses.isLoading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState message="No courses match your filters." />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
          }}
        >
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </Box>
      )}
    </Box>
  );
}
