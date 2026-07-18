import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups2Outlined';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  KNOWN_DISCIPLINES,
  type MemberTraining,
  type TeamDevelopmentReport,
  type TrainingGoal,
} from '@toma/shared';
import { Fragment, useMemo, useState } from 'react';
import { useSetGoals } from '../api/queries.js';
import { DisciplineChip } from '../ui/chips.js';
import { SubjectBreakdown } from './dashboard.js';
import { StatCard } from './common.js';

/**
 * Team/organization development view: non-mandatory ("elective") attendance alongside
 * per-discipline goal attainment — complements the mandatory-only compliance panel.
 */
export function TeamDevelopmentPanel({ report }: { report: TeamDevelopmentReport }) {
  const scopeLabel = report.scope === 'team' ? 'Your team' : 'Organization';
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6">Development & electives</Typography>
        <Typography variant="caption" color="text.secondary">
          {scopeLabel} · {report.year} · beyond mandatory compliance
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
            mt: 2,
            mb: 1,
          }}
        >
          <StatCard label="People" value={report.totalPeople} icon={<GroupsIcon />} />
          <StatCard
            label="Took electives"
            value={`${report.peopleWithElectives}/${report.totalPeople}`}
            icon={<EmojiEventsIcon />}
            accent="secondary.main"
          />
          <StatCard
            label="Elective attendances"
            value={report.electiveAttendances}
            icon={<EmojiEventsIcon />}
          />
        </Box>

        {report.disciplines.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Goal attainment by discipline
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {report.disciplines.map((d) => {
                const pct = d.totalPeople > 0 ? Math.round((d.peopleMet / d.totalPeople) * 100) : 0;
                return (
                  <Stack key={d.discipline} direction="row" spacing={2} alignItems="center">
                    <Box sx={{ width: 180, flexShrink: 0 }}>
                      <DisciplineChip discipline={d.discipline} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        color={pct >= 90 ? 'success' : pct >= 50 ? 'warning' : 'error'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ width: 150, textAlign: 'right' }}
                    >
                      {d.peopleMet}/{d.totalPeople} met · avg {d.avgHours}h/{d.goalHours}h
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

type SortKey = 'name' | 'totalHours' | 'mandatory' | 'electives';

/**
 * Comfortable per-person roster across the whole scope (a manager's full org subtree, or the
 * organization for HR): searchable, sortable, and expandable to per-discipline goal progress.
 */
export function PeopleTrainingTable({ members }: { members: MemberTraining[] }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [asc, setAsc] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? members.filter(
          (m) =>
            m.employeeName.toLowerCase().includes(q) ||
            (m.department ?? '').toLowerCase().includes(q),
        )
      : members;
    const dir = asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'totalHours':
          return (a.totalHours - b.totalHours) * dir;
        case 'mandatory':
          return (a.mandatoryDone - b.mandatoryDone) * dir;
        case 'electives':
          return (a.electiveCount - b.electiveCount) * dir;
        default:
          return a.employeeName.localeCompare(b.employeeName) * dir;
      }
    });
  }, [members, query, sortKey, asc]);

  const sortHandler = (key: SortKey) => () => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === 'name');
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6">People</Typography>
            <Typography variant="caption" color="text.secondary">
              {members.length} in your organization · click a row for detail
            </Typography>
          </Box>
          <TextField
            placeholder="Search name or department…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            sx={{ width: { xs: '100%', sm: 300 } }}
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
        </Stack>

        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }} />
                <TableCell sortDirection={sortKey === 'name' ? (asc ? 'asc' : 'desc') : false}>
                  <TableSortLabel
                    active={sortKey === 'name'}
                    direction={asc ? 'asc' : 'desc'}
                    onClick={sortHandler('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Discipline</TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortKey === 'totalHours'}
                    direction={asc ? 'asc' : 'desc'}
                    onClick={sortHandler('totalHours')}
                  >
                    Hours vs goal
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortKey === 'mandatory'}
                    direction={asc ? 'asc' : 'desc'}
                    onClick={sortHandler('mandatory')}
                  >
                    Mandatory
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortKey === 'electives'}
                    direction={asc ? 'asc' : 'desc'}
                    onClick={sortHandler('electives')}
                  >
                    Electives
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((m) => {
                const open = !!expanded[m.employeeId];
                const mandatoryComplete =
                  m.mandatoryTotal > 0 && m.mandatoryDone >= m.mandatoryTotal;
                return (
                  <Fragment key={m.employeeId}>
                    <TableRow
                      hover
                      sx={{
                        cursor: 'pointer',
                        '& > *': { borderBottom: open ? 'unset' : undefined },
                      }}
                      onClick={() =>
                        setExpanded((e) => ({ ...e, [m.employeeId]: !e[m.employeeId] }))
                      }
                    >
                      <TableCell>
                        <IconButton size="small" aria-label={open ? 'Collapse' : 'Expand'}>
                          <ExpandMoreIcon
                            sx={{
                              transform: open ? 'rotate(180deg)' : 'none',
                              transition: 'transform 150ms',
                            }}
                          />
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{m.employeeName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{m.department ?? '—'}</TableCell>
                      <TableCell>
                        <DisciplineChip discipline={m.discipline} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          component="span"
                          color={m.metGoal ? 'success.main' : 'text.primary'}
                          sx={{ fontWeight: m.metGoal ? 600 : 400 }}
                        >
                          {m.totalHours}h
                          {m.disciplineGoalHours > 0 ? ` / ${m.disciplineGoalHours}h` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          variant="outlined"
                          color={mandatoryComplete ? 'success' : 'warning'}
                          label={`${m.mandatoryDone}/${m.mandatoryTotal}`}
                        />
                      </TableCell>
                      <TableCell align="right">{m.electiveCount}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ py: 0, border: 0 }} colSpan={7}>
                        <Collapse in={open} unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Hours by subject
                            </Typography>
                            <SubjectBreakdown items={m.byDiscipline} />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ color: 'text.secondary' }}>
                    No people match “{query}”.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  );
}

/** HR editor for the per-discipline yearly goals (requirement: set goals per discipline/year). */
export function GoalEditor({ year, goals }: { year: number; goals: TrainingGoal[] }) {
  const [rows, setRows] = useState<{ discipline: string; targetHours: string }[]>(() =>
    goals.length > 0
      ? goals.map((g) => ({ discipline: g.discipline, targetHours: String(g.targetHours) }))
      : [{ discipline: '', targetHours: '' }],
  );
  const setGoals = useSetGoals(year);

  const update = (i: number, patch: Partial<{ discipline: string; targetHours: string }>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addRow = () => setRows((r) => [...r, { discipline: '', targetHours: '' }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const save = () => {
    const payload = rows
      .map((r) => ({ discipline: r.discipline.trim(), targetHours: Number(r.targetHours) }))
      .filter(
        (r) => r.discipline.length > 0 && Number.isFinite(r.targetHours) && r.targetHours >= 0,
      );
    setGoals.mutate(payload);
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Box>
            <Typography variant="h6">Discipline goals · {year}</Typography>
            <Typography variant="caption" color="text.secondary">
              Yearly training hours each employee should complete per discipline. Management levels
              count as disciplines here too.
            </Typography>
          </Box>
        </Stack>

        <datalist id="discipline-options">
          {KNOWN_DISCIPLINES.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>

        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {rows.map((row, i) => (
            <Stack key={i} direction="row" spacing={1.5} alignItems="center">
              <TextField
                label="Discipline"
                value={row.discipline}
                onChange={(e) => update(i, { discipline: e.target.value })}
                size="small"
                sx={{ flexGrow: 1 }}
                slotProps={{ htmlInput: { list: 'discipline-options', maxLength: 64 } }}
              />
              <TextField
                label="Hours / year"
                type="number"
                value={row.targetHours}
                onChange={(e) => update(i, { targetHours: e.target.value })}
                size="small"
                sx={{ width: 130 }}
                slotProps={{ htmlInput: { min: 0, max: 9999 } }}
              />
              <IconButton
                aria-label="Remove"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Stack>
          ))}
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} alignItems="center">
          <Button startIcon={<AddIcon />} onClick={addRow} size="small">
            Add discipline
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          {setGoals.isSuccess && (
            <Typography variant="caption" color="success.main">
              Saved
            </Typography>
          )}
          {setGoals.isError && (
            <Typography variant="caption" color="error.main">
              Save failed
            </Typography>
          )}
          <Button variant="contained" onClick={save} disabled={setGoals.isPending}>
            Save goals
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
