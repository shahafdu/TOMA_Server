import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { Course } from '@toma/shared';
import { useMemo, useState } from 'react';
import { useCourses } from '../api/queries.js';
import { CourseCard } from '../components/CourseCard.js';
import { EmptyState, Loading, PageHeader } from '../components/common.js';

type TypeFilter = 'all' | Course['type'];

export function CatalogPage() {
  const courses = useCourses();
  const [q, setQ] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [discipline, setDiscipline] = useState('all');

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
        (needle === '' || c.title.toLowerCase().includes(needle)),
    );
  }, [courses.data, q, type, discipline]);

  return (
    <Box>
      <PageHeader
        title="Course catalog"
        subtitle={courses.data ? `${courses.data.length} courses this year` : undefined}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
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
