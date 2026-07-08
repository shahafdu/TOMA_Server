import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h4">{title}</Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = 'primary.main',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            color: accent,
            bgcolor: (t) =>
              t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(79,70,229,0.08)',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

export function Loading() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Card sx={{ p: 6, textAlign: 'center' }}>
      <Typography color="text.secondary">{message}</Typography>
    </Card>
  );
}
