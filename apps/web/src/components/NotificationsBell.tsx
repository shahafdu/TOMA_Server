import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsIcon from '@mui/icons-material/NotificationsNoneOutlined';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import {
  useNotificationActions,
  useNotifications,
  useNotificationsUnread,
} from '../api/queries.js';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function NotificationsBell() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const unread = useNotificationsUnread();
  const list = useNotifications();
  const { markRead, markAllRead } = useNotificationActions();
  const open = Boolean(anchor);
  const count = unread.data?.count ?? 0;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Notifications">
          <Badge badgeContent={count} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, maxWidth: '92vw' } } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 700 }}>Notifications</Typography>
          {count > 0 && (
            <Button size="small" startIcon={<DoneAllIcon />} onClick={() => markAllRead.mutate()}>
              Mark all read
            </Button>
          )}
        </Stack>
        <Divider />
        <Box sx={{ maxHeight: 440, overflowY: 'auto' }}>
          {(list.data ?? []).length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              No notifications yet.
            </Typography>
          ) : (
            (list.data ?? []).map((n) => {
              const unreadItem = n.sentAt != null && n.readAt == null;
              return (
                <Box
                  key={n.id}
                  onClick={() => unreadItem && markRead.mutate(n.id)}
                  sx={{
                    px: 2,
                    py: 1.25,
                    cursor: unreadItem ? 'pointer' : 'default',
                    borderLeft: 3,
                    borderColor: unreadItem ? 'primary.main' : 'transparent',
                    bgcolor: unreadItem ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {n.subject}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {timeAgo(n.sentAt ?? n.scheduledFor)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                    {n.body.length > 140 ? `${n.body.slice(0, 140)}…` : n.body}
                  </Typography>
                  {n.sentAt == null && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                      Scheduled
                    </Typography>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Popover>
    </>
  );
}
