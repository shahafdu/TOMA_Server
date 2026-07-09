import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventNoteIcon from '@mui/icons-material/EventNote';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Course } from '@toma/shared';
import { Link as RouterLink } from 'react-router-dom';
import {
  DeliveryChip,
  DisciplineChip,
  MandatoryChip,
  QuarterChip,
  StatusChip,
  TypeChip,
} from '../ui/chips.js';
import { dateRangeLabel, hours, money, quartersOf, sessionLines } from '../ui/format.js';

/** Rich tooltip body: every session's date + time, plus the total hours. */
function ScheduleTooltip({ course }: { course: Course }) {
  const lines = sessionLines(course.sessions);
  return (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Schedule · {hours(course.totalHours)} total
      </Typography>
      {lines.length === 0 ? (
        <Typography variant="body2">Dates not yet scheduled.</Typography>
      ) : (
        <Stack spacing={0.25}>
          {lines.map((line) => (
            <Typography key={line} variant="body2">
              {line}
            </Typography>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export function CourseCard({ course }: { course: Course }) {
  const price = money(course.price);
  const quarters = quartersOf(course.sessions);
  const range = dateRangeLabel(course.sessions);
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform .15s ease, box-shadow .15s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
          <TypeChip type={course.type} />
          <StatusChip status={course.status} />
          <DeliveryChip deliveryType={course.deliveryType} />
          {course.isMandatory && <MandatoryChip />}
        </Stack>
        <Typography variant="h6" gutterBottom sx={{ lineHeight: 1.25 }}>
          {course.title}
        </Typography>
        {course.discipline && (
          <Box sx={{ mb: 1 }}>
            <DisciplineChip discipline={course.discipline} />
          </Box>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
          {course.descriptionHtml?.replace(/<[^>]*>/g, '') || 'No description provided.'}
        </Typography>

        {(quarters.length > 0 || range) && (
          <Tooltip arrow placement="top" title={<ScheduleTooltip course={course} />}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              alignItems="center"
              sx={{ mt: 1.5, cursor: 'default', width: 'fit-content' }}
            >
              {quarters.map((q) => (
                <QuarterChip key={q} quarter={q} />
              ))}
              {range && (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
                >
                  <CalendarMonthIcon fontSize="small" />
                  <Typography variant="body2">{range}</Typography>
                </Box>
              )}
            </Stack>
          </Tooltip>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <EventNoteIcon fontSize="small" />
            <Typography variant="body2">{course.year}</Typography>
          </Box>
          {course.totalHours > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTimeIcon fontSize="small" />
              <Typography variant="body2">{hours(course.totalHours)}</Typography>
            </Box>
          )}
          {price && (
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {price}
            </Typography>
          )}
        </Box>
        <Button
          component={RouterLink}
          to={`/catalog/${course.id}`}
          size="small"
          variant="contained"
        >
          View
        </Button>
      </CardActions>
    </Card>
  );
}
