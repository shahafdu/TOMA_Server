import EventNoteIcon from '@mui/icons-material/EventNote';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Course } from '@toma/shared';
import { Link as RouterLink } from 'react-router-dom';
import { DeliveryChip, MandatoryChip, StatusChip, TypeChip } from '../ui/chips.js';
import { money } from '../ui/format.js';

export function CourseCard({ course }: { course: Course }) {
  const price = money(course.price);
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
        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
          {course.descriptionHtml?.replace(/<[^>]*>/g, '') || 'No description provided.'}
        </Typography>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
          <EventNoteIcon fontSize="small" />
          <Typography variant="body2">{course.year}</Typography>
          {price && (
            <Typography variant="body2" sx={{ ml: 1, fontWeight: 700, color: 'text.primary' }}>
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
