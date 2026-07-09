import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Course } from '@toma/shared';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useCourses, useMe } from '../api/queries.js';
import { Loading, PageHeader } from '../components/common.js';
import { CourseHoverCard } from '../components/CourseHoverCard.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DISCIPLINE_COLOR: Record<string, string> = {
  Engineering: '#4f46e5',
  'Data & AI': '#7c3aed',
  'Cloud & Infra': '#0ea5e9',
  'Security & Compliance': '#dc2626',
  Leadership: '#d97706',
  'Product & Design': '#0d9488',
  'Soft Skills': '#db2777',
};

function colorFor(discipline: string | null): string {
  if (!discipline) return '#64748b';
  return DISCIPLINE_COLOR[discipline] ?? '#64748b';
}

interface DayEntry {
  course: Course;
  key: string;
}

export function CalendarPage() {
  const me = useMe();
  const role = me.data?.role ?? '';
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const courses = useCourses(cursor.year);

  // Map each in-month session day (1..N) to the courses that meet that day.
  const byDay = useMemo(() => {
    const map = new Map<number, DayEntry[]>();
    for (const course of courses.data ?? []) {
      for (const [i, s] of course.sessions.entries()) {
        const d = new Date(s.startsAt);
        if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
          const day = d.getDate();
          const arr = map.get(day) ?? [];
          arr.push({ course, key: `${course.id}-${i}` });
          map.set(day, arr);
        }
      }
    }
    return map;
  }, [courses.data, cursor]);

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const step = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const isToday = (day: number) =>
    cursor.year === today.getFullYear() &&
    cursor.month === today.getMonth() &&
    day === today.getDate();

  return (
    <Box>
      <PageHeader title="Training calendar" subtitle="All scheduled training. Hover for details." />

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <IconButton onClick={() => step(-1)} aria-label="Previous month">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" sx={{ minWidth: 180, textAlign: 'center' }}>
          {monthLabel}
        </Typography>
        <IconButton onClick={() => step(1)} aria-label="Next month">
          <ChevronRightIcon />
        </IconButton>
        <Button
          size="small"
          onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
        >
          Today
        </Button>
      </Stack>

      {courses.isLoading ? (
        <Loading />
      ) : (
        <Card sx={{ p: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
            {WEEKDAYS.map((w) => (
              <Typography
                key={w}
                variant="caption"
                sx={{ textAlign: 'center', fontWeight: 700, color: 'text.secondary', py: 0.5 }}
              >
                {w}
              </Typography>
            ))}
            {cells.map((day, idx) => (
              <Box
                key={idx}
                sx={{
                  minHeight: { xs: 76, sm: 104 },
                  borderRadius: 1.5,
                  p: 0.5,
                  bgcolor: day ? 'background.default' : 'transparent',
                  border: 1,
                  borderColor: day ? 'divider' : 'transparent',
                }}
              >
                {day && (
                  <>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isToday(day) ? 800 : 500,
                        color: isToday(day) ? 'primary.main' : 'text.secondary',
                        display: 'inline-flex',
                        px: 0.5,
                      }}
                    >
                      {day}
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {(byDay.get(day) ?? []).map((entry) => {
                        const color = colorFor(entry.course.discipline);
                        return (
                          <Tooltip
                            key={entry.key}
                            arrow
                            placement="top"
                            title={<CourseHoverCard course={entry.course} role={role} />}
                          >
                            <Box
                              component={RouterLink}
                              to={`/catalog/${entry.course.id}`}
                              sx={{
                                display: 'block',
                                textDecoration: 'none',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#fff',
                                bgcolor: color,
                                borderRadius: 1,
                                px: 0.75,
                                py: 0.25,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                '&:hover': { filter: 'brightness(1.1)' },
                              }}
                            >
                              {entry.course.title}
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  </>
                )}
              </Box>
            ))}
          </Box>
        </Card>
      )}
    </Box>
  );
}
