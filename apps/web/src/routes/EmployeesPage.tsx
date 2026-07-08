import SearchIcon from '@mui/icons-material/Search';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '../api/queries.js';
import { EmptyState, Loading, PageHeader } from '../components/common.js';
import { initials } from '../ui/format.js';

export function EmployeesPage() {
  const [q, setQ] = useState('');
  const employees = useEmployees(q.trim() || undefined);
  const navigate = useNavigate();
  const rows = employees.data?.items ?? [];

  return (
    <Box>
      <PageHeader
        title="Employees"
        subtitle={employees.data ? `${employees.data.total} people` : undefined}
      />

      <TextField
        placeholder="Search by name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        size="small"
        sx={{ mb: 3, width: { xs: '100%', sm: 360 } }}
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

      {employees.isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState message="No employees found." />
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((e) => (
                <TableRow
                  key={e.id}
                  hover
                  onClick={() => navigate(`/employees/${e.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
                        {initials(e.fullName)}
                      </Avatar>
                      <Typography sx={{ fontWeight: 600 }}>{e.fullName}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{e.department ?? '—'}</TableCell>
                  <TableCell>{e.title ?? '—'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{e.email ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </Box>
  );
}
