import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { useLogin, useMe } from '../api/queries.js';

const DEMO_USERS = ['alice (HR)', 'bob (manager)', 'carol (employee)', 'admin', 'devuser'];

export function LoginPage() {
  const me = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  if (me.data) return <Navigate to="/" replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(username.trim(), { onSuccess: () => navigate('/', { replace: true }) });
  };

  const error =
    login.error instanceof ApiError ? login.error.message : login.error ? 'Login failed' : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background:
          'radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.25), transparent 60%),' +
          'radial-gradient(1000px 500px at 110% 110%, rgba(13,148,136,0.25), transparent 55%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg,#6366f1,#0d9488)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            T
          </Box>
          <Box>
            <Typography variant="h5">TOMA</Typography>
            <Typography variant="body2" color="text.secondary">
              Training management system
            </Typography>
          </Box>
        </Stack>

        <Typography variant="h6" gutterBottom>
          Sign in
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <TextField
            id="username"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            fullWidth
            margin="normal"
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={!username.trim() || login.isPending}
            sx={{ mt: 1 }}
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} role="alert">
            {error}
          </Alert>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
          Demo accounts (dev auth, no password): {DEMO_USERS.join(' · ')}
        </Typography>
      </Card>
    </Box>
  );
}
