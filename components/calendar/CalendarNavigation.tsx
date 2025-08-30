'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Tooltip,
  IconButton,
  Autocomplete,
  TextField,
  Chip,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { statusVisual, eventTypeColor } from '@/lib/utils/event-visual';
import { FrenchDateOnly } from '@/components/shared/FrenchDatePicker';

interface Event {
  id: number;
  title: string;
  discipline: string;
  ownerId: number;
  owner: { id: number; name: string; email: string };
  timeslots: any[];
  classIds?: number[] | any;
  salleIds?: number[] | any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarNavigationProps {
  currentDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateChange?: (d: Date) => void;
  previousLabel: string;
  nextLabel: string;
  todayLabel?: string;
  title: string;
  // New props for radical weekly/day view
  events?: Event[]; // full list (already filtered by discipline upstream if needed)
  displayMode?: 'week' | 'day';
  onEventClick?: (event: Event) => void;
  onRoomClick?: (salleId: number) => void; // callback pour clic salle en mode occupation
}

export default function CalendarNavigation({
  currentDate,
  onPrevious,
  onNext,
  onToday,
  onDateChange,
  previousLabel,
  nextLabel,
  todayLabel = "Aujourd'hui",
  title,
  events = [],
  displayMode = 'week',
  onEventClick,
  onRoomClick,
}: CalendarNavigationProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Global lightweight caches for salle & class names
  const [salleMap, setSalleMap] = useState<Record<number, string>>({});
  const [classMap, setClassMap] = useState<Record<number, string>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/salles');
        if (r.ok) {
          const d = await r.json();
          if (!cancelled) {
            const m: Record<number, string> = {};
            (d?.salles || []).forEach((s: any) => {
              if (s?.id) m[s.id] = s.name;
            });
            setSalleMap(m);
          }
        }
      } catch {}
      try {
        const r = await fetch('/api/classes');
        if (r.ok) {
          const d = await r.json();
          if (!cancelled) {
            const m: Record<number, string> = {};
            [...(d?.predefinedClasses || []), ...(d?.customClasses || [])].forEach((c: any) => {
              if (c?.id) m[c.id] = c.name;
            });
            setClassMap(m);
          }
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  // Toggle samedi uniquement en mode semaine
  const [showSaturday, setShowSaturday] = useState(false);
  // Mode d'affichage: événements (TP) ou occupation des salles
  const [scheduleMode, setScheduleMode] = useState<'events' | 'rooms'>('events');
  // Filtre multi-salles (persistant via localStorage)
  const [selectedSalleIds, setSelectedSalleIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('calendar_selected_salles');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.filter((n) => typeof n === 'number');
      }
    } catch {}
    return [];
  });
  useEffect(() => {
    try {
      localStorage.setItem('calendar_selected_salles', JSON.stringify(selectedSalleIds));
    } catch {}
  }, [selectedSalleIds]);
  // Compute days of range
  const days: Date[] = useMemo(() => {
    if (displayMode === 'day') return [currentDate];
    const start = new Date(currentDate);
    // align to Monday
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate, displayMode]);

  // Jours visibles selon le mode: masquer dimanche toujours, samedi optionnel
  const visibleDays = useMemo(() => {
    if (displayMode !== 'week') return days;
    return days.filter((d) => {
      const gd = d.getDay();
      if (gd === 0) return false; // dimanche
      if (gd === 6 && !showSaturday) return false; // samedi masqué sauf si demandé
      return true; // lundi-vendredi
    });
  }, [days, displayMode, showSaturday]);

  // Map events -> timeslots for each day (flatten; each timeslot becomes a visual block)
  const daySlots = useMemo(() => {
    const map: Record<string, Array<{ event: Event; slot: any }>> = {};
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    for (const d of days) map[keyOf(d)] = [];
    events.forEach((ev) => {
      (ev.timeslots || []).forEach((slot) => {
        const ref = slot.timeslotDate || slot.startDate;
        if (!ref) return;
        let k = String(ref);
        if (k.length > 10) k = k.substring(0, 10);
        if (!map[k]) return; // outside current visible range
        map[k].push({ event: ev, slot });
      });
    });
    // Sort each day's slots by start time
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => String(a.slot.startDate).localeCompare(String(b.slot.startDate)));
    });
    return map;
  }, [events, days]);

  // Helpers
  const formatHour = (slot: any) => {
    const parseHM = (val: any) => {
      if (!val) return null;
      const s = String(val).replace(' ', 'T');
      // Accept forms: YYYY-MM-DDTHH:mm[:ss]
      const m = s.match(/T(\d{2}):(\d{2})/);
      if (!m) return null;
      return `${m[1]}:${m[2]}`;
    };
    const start = parseHM(slot.startDate);
    const end = parseHM(slot.endDate);
    return `${start || '--:--'} → ${end || '--:--'}`;
  };

  const statusIcon = (slot: any) => statusVisual(slot.state).icon;

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        gap={2}
        mb={2}
        sx={{
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            flex: { xs: 'none', md: 1 },
            textAlign: { xs: 'center', md: 'left' },
            mb: { xs: 1, md: 0 },
          }}
        >
          {title}
        </Typography>
        <Box
          display="flex"
          gap={1}
          sx={{
            flexDirection: { xs: 'column', sm: 'row' },
            width: { xs: '100%', md: 'auto' },
            '& .MuiButton-root': {
              fontSize: { xs: '0.875rem', md: '0.875rem' },
              px: { xs: 2, md: 2 },
              py: { xs: 1, md: 0.75 },
            },
          }}
        >
          {/* <Button
            variant="outlined"
            size={isMobile ? 'medium' : 'small'}
            onClick={onPrevious}
            sx={{ borderRadius: 2, minWidth: { xs: 'auto', md: 'auto' } }}
          >
            ← {isMobile ? previousLabel.split(' ')[0] : previousLabel}
          </Button>
          <Button
            variant="contained"
            size={isMobile ? 'medium' : 'small'}
            onClick={onToday}
            sx={{ borderRadius: 2 }}
          >
            {todayLabel}
          </Button>
          <Button
            variant="outlined"
            size={isMobile ? 'medium' : 'small'}
            onClick={onNext}
            sx={{ borderRadius: 2, minWidth: { xs: 'auto', md: 'auto' } }}
          >
            {isMobile ? nextLabel.split(' ')[0] : nextLabel} →
          </Button> */}
          {/* Date picker to jump directly to a date */}
          <Box sx={{ minWidth: 180, ml: { xs: 0, sm: 1 } }}>
            <FrenchDateOnly
              selected={currentDate}
              onChange={(d: Date | null) => {
                if (!d) return;
                // Normalize time to noon to avoid TZ edge cases
                const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
                onDateChange?.(nd);
              }}
              customInput={<TextField size="small" placeholder="Aller à la date" />}
            />
          </Box>
        </Box>
      </Box>
      {/* Unified time grid with sticky time axis and synchronized scroll */}
      {(() => {
        // Dynamic hour range with extend controls
        const [hourRange, setHourRange] = useState<{ min: number; max: number }>({
          min: 7,
          max: 20,
        });
        const [nowMinutes, setNowMinutes] = useState(() => {
          const n = new Date();
          return n.getHours() * 60 + n.getMinutes();
        });
        const MIN_HOUR = hourRange.min;
        const MAX_HOUR = hourRange.max; // inclusive end hour marker
        const hourSpan = MAX_HOUR - MIN_HOUR; // number of displayed hours
        const HOUR_HEIGHT = 120;
        // NOTE: For performance with very large slot counts, consider windowing/virtualizing
        // vertical hours & horizontal day columns (e.g., react-virtualized or custom window logic).
        const SUBPIXEL_ADJUST = 0.5; // unify line alignment between axis & columns
        const minuteHeight = HOUR_HEIGHT / 60; // ~1.166
        const scrollRef = useRef<HTMLDivElement | null>(null);

        // selectedSalleIds vient du scope parent

        const scrollToNow = useCallback(
          (smooth: boolean = true) => {
            const currentMinutes = nowMinutes;
            if (currentMinutes < MIN_HOUR * 60 || currentMinutes > MAX_HOUR * 60) return;
            const offsetMinutes = currentMinutes - MIN_HOUR * 60;
            const targetY = offsetMinutes * minuteHeight - 120;
            const el = scrollRef.current;
            if (el)
              el.scrollTo({ top: Math.max(0, targetY), behavior: smooth ? 'smooth' : 'auto' });
          },
          [nowMinutes, MIN_HOUR, MAX_HOUR, minuteHeight],
        );

        // Auto scroll to current time (once after mount and hourRange changes)
        useEffect(() => {
          scrollToNow();
        }, [scrollToNow]);

        // Real-time update each minute
        useEffect(() => {
          const id = setInterval(() => {
            const n = new Date();
            setNowMinutes(n.getHours() * 60 + n.getMinutes());
          }, 60 * 1000);
          return () => clearInterval(id);
        }, []);

        // If minutes update and still inside range, adjust subtle position (no scroll jump)
        useEffect(() => {
          // optional: could keep line only; no auto scroll to avoid jumpiness after initial
        }, [nowMinutes]);

        const extendEarlier = () => setHourRange((r) => ({ ...r, min: Math.max(0, r.min - 1) }));
        const extendLater = () => setHourRange((r) => ({ ...r, max: Math.min(23, r.max + 1) }));
        const goToNow = () => {
          const h = Math.floor(nowMinutes / 60);
          if (h < MIN_HOUR)
            setHourRange((r) => ({ ...r, min: h, max: Math.max(r.max, h + (r.max - r.min)) }));
          else if (h >= MAX_HOUR)
            setHourRange((r) => ({
              ...r,
              max: h + 1,
              min: Math.min(r.min, h + 1 - (r.max - r.min)),
            }));
          setTimeout(() => scrollToNow(), 50);
        };
        // Precompute per-day enriched slots
        const perDay = visibleDays.map((d) => {
          const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
          const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          type Ext = {
            event: Event;
            slot: any;
            start: Date;
            end: Date;
            col?: number;
            cols?: number;
            salleId?: number;
          };
          const base = (daySlots[key] || []).map(({ event, slot }) => ({ event, slot }));
          if (scheduleMode === 'rooms') {
            // Expansion par salle pour occupation + filtrage multi-sélection
            const expanded: Ext[] = [];
            base.forEach(({ event, slot }) => {
              const ids =
                Array.isArray(slot.salleIds) && slot.salleIds.length
                  ? slot.salleIds
                  : Array.isArray(event.salleIds)
                    ? event.salleIds
                    : [];
              const start = new Date(slot.startDate);
              const end = new Date(slot.endDate);
              ids.forEach((sid: number) =>
                expanded.push({ event, slot, start, end, salleId: sid }),
              );
            });
            let valid = expanded.filter(
              (s) => s.salleId != null && !isNaN(s.start.getTime()) && !isNaN(s.end.getTime()),
            );
            // Filtrer par sélection si au moins une salle choisie
            if (selectedSalleIds.length) {
              valid = valid.filter((s) => selectedSalleIds.includes(s.salleId as number));
            }
            const uniqueSalleIds = Array.from(new Set(valid.map((v) => v.salleId as number)));
            uniqueSalleIds.sort(
              (a, b) => (salleMap[a] || '').localeCompare(salleMap[b] || '') || a - b,
            );
            const laneIndex: Record<number, number> = {};
            uniqueSalleIds.forEach((sid, i) => (laneIndex[sid] = i));
            const laneCount = uniqueSalleIds.length || 1;
            // Pour chaque salle, calculer des sous-colonnes selon chevauchement temporel
            const bySalle: Record<number, Ext[]> = {};
            valid.forEach((s) => {
              const sid = s.salleId as number;
              (bySalle[sid] ||= []).push(s);
            });
            const subColsBySalle: Record<number, number> = {};
            Object.entries(bySalle).forEach(([sidStr, arr]) => {
              const arrSorted = [...arr].sort((a, b) => a.start.getTime() - b.start.getTime());
              const clusters: Ext[][] = [];
              let cluster: Ext[] = [];
              arrSorted.forEach((s) => {
                if (!cluster.length) {
                  cluster = [s];
                  clusters.push(cluster);
                } else {
                  const lastMax = Math.max(...cluster.map((c) => c.end.getTime()));
                  if (s.start.getTime() < lastMax) cluster.push(s);
                  else {
                    cluster = [s];
                    clusters.push(cluster);
                  }
                }
              });
              clusters.forEach((cl) => {
                const active: { end: number; col: number }[] = [];
                cl.forEach((s) => {
                  for (const a of active) if (a.end <= s.start.getTime()) a.end = -1;
                  const free = active.find((a) => a.end === -1);
                  if (free) {
                    free.end = s.end.getTime();
                    s.col = free.col; // sub-col within this salle lane
                  } else {
                    const col = active.length;
                    active.push({ end: s.end.getTime(), col });
                    s.col = col;
                  }
                });
                const maxCols = Math.max(...cl.map((s) => s.col || 0)) + 1;
                cl.forEach((s) => (s.cols = maxCols));
                const sid = Number(sidStr);
                subColsBySalle[sid] = Math.max(subColsBySalle[sid] || 1, maxCols);
              });
            });
            // Convertir sous-colonnes par salle en colonnes globales avec décalage de lane
            const maxSubCols = Math.max(1, ...Object.values(subColsBySalle));
            const globalCols = laneCount * maxSubCols;
            valid.forEach((s) => {
              const sid = s.salleId as number;
              const subCol = s.col || 0;
              const laneOffset = (laneIndex[sid] || 0) * maxSubCols;
              s.col = laneOffset + subCol;
              s.cols = globalCols; // largeur cohérente entre les salles
            });
            return { date: d, key, slots: valid };
          }
          // Mode événements (clustering de chevauchement)
          const slots = base.map(({ event, slot }) => {
            const start = new Date(slot.startDate);
            const end = new Date(slot.endDate);
            return { event, slot, start, end } as Ext;
          });
          const valid: Ext[] = slots.filter(
            (s) => !isNaN(s.start.getTime()) && !isNaN(s.end.getTime()),
          );
          const sorted = [...valid].sort((a, b) => a.start.getTime() - b.start.getTime());
          const clusters: Ext[][] = [];
          let cluster: Ext[] = [];
          sorted.forEach((s) => {
            if (!cluster.length) {
              cluster = [s];
              clusters.push(cluster);
            } else {
              const lastMax = Math.max(...cluster.map((c) => c.end.getTime()));
              if (s.start.getTime() < lastMax) cluster.push(s);
              else {
                cluster = [s];
                clusters.push(cluster);
              }
            }
          });
          clusters.forEach((cl) => {
            const active: { end: number; col: number }[] = [];
            cl.forEach((s) => {
              for (const a of active) if (a.end <= s.start.getTime()) a.end = -1;
              const free = active.find((a) => a.end === -1);
              if (free) {
                free.end = s.end.getTime();
                s.col = free.col;
              } else {
                const col = active.length;
                active.push({ end: s.end.getTime(), col });
                s.col = col;
              }
            });
            const maxCols = Math.max(...cl.map((s) => s.col || 0)) + 1;
            cl.forEach((s) => (s.cols = maxCols));
          });
          return { date: d, key, slots: sorted };
        });
        const totalHeight = hourSpan * HOUR_HEIGHT;
        // We generate only the actual hour blocks (no +1) to avoid an extra empty space at the end.
        const hours = Array.from({ length: hourSpan }, (_, i) => MIN_HOUR + i);
        return (
          <Box>
            {/* Range controls */}
            <Box sx={{ display: 'flex', gap: 1.2, my: 3, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
                Plage: {MIN_HOUR.toString().padStart(2, '0')}h –{' '}
                {MAX_HOUR.toString().padStart(2, '0')}h
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={extendEarlier}
                  disabled={MIN_HOUR <= 0}
                  sx={{ textTransform: 'none', minWidth: { xs: 'auto', md: 'auto' } }}
                >
                  {isMobile ? '← tôt' : '← plus tôt'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={extendLater}
                  disabled={MAX_HOUR >= 23}
                  sx={{ textTransform: 'none', minWidth: { xs: 'auto', md: 'auto' } }}
                >
                  {isMobile ? 'tard →' : 'plus tard →'}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={goToNow}
                  sx={{ textTransform: 'none', minWidth: { xs: 'auto', md: 'auto' } }}
                >
                  {isMobile ? 'Maintenant' : 'Aller à maintenant'}
                </Button>
              </Box>
              {displayMode === 'week' && (
                <Button
                  size="small"
                  onClick={() => setShowSaturday((v) => !v)}
                  variant={showSaturday ? 'contained' : 'outlined'}
                  color={showSaturday ? 'success' : 'inherit'}
                  sx={{ textTransform: 'none', minWidth: { xs: 'auto', md: 'auto' } }}
                >
                  {isMobile
                    ? showSaturday
                      ? '✓ Sam'
                      : 'Sam'
                    : showSaturday
                      ? 'Masquer samedi'
                      : 'Afficher samedi'}
                </Button>
              )}
              <Button
                size="small"
                onClick={() => setScheduleMode('events')}
                variant={scheduleMode === 'events' ? 'contained' : 'outlined'}
                color={scheduleMode === 'events' ? 'primary' : 'inherit'}
                sx={{ textTransform: 'none', minWidth: { xs: 'auto', md: 'auto' } }}
              >
                {isMobile ? 'TP' : 'Mode TP'}
              </Button>
              <Button
                size="small"
                onClick={() => setScheduleMode('rooms')}
                variant={scheduleMode === 'rooms' ? 'contained' : 'outlined'}
                color={scheduleMode === 'rooms' ? 'primary' : 'inherit'}
                sx={{ textTransform: 'none', minWidth: { xs: 'auto', md: 'auto' } }}
              >
                {isMobile ? 'Salles' : 'Mode salle'}
              </Button>
            </Box>
            {/* Zone filtre salles (affichée sous la barre d'actions) */}
            {scheduleMode === 'rooms' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2, mt: -1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={Object.keys(salleMap)
                      .map((k) => ({ id: Number(k), label: salleMap[Number(k)] }))
                      .filter((o) => !selectedSalleIds.includes(o.id))}
                    value={[] /* on affiche les sélectionnés séparément */}
                    onChange={(_, val) => {
                      setSelectedSalleIds((prev) =>
                        Array.from(new Set([...prev, ...val.map((v) => v.id)])),
                      );
                    }}
                    getOptionLabel={(o) => o.label}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Ajouter salles"
                        placeholder="Choisir"
                        size="small"
                      />
                    )}
                    clearOnBlur={false}
                    sx={{ width: 320 }}
                    noOptionsText="Aucune salle"
                  />
                  <Badge color="primary" badgeContent={selectedSalleIds.length} max={999} showZero>
                    <Box
                      sx={{
                        fontSize: 12,
                        px: 1,
                        py: 0.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        background: 'background.default',
                      }}
                    >
                      Salles filtrées
                    </Box>
                  </Badge>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedSalleIds([])}
                    disabled={!selectedSalleIds.length}
                    sx={{ textTransform: 'none' }}
                  >
                    Réinitialiser
                  </Button>
                </Box>
                {selectedSalleIds.length > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      overflowX: 'auto',
                      pb: 0.5,
                      '&::-webkit-scrollbar': { height: 6 },
                      '&::-webkit-scrollbar-thumb': {
                        background: theme.palette.divider,
                        borderRadius: 3,
                      },
                    }}
                  >
                    {selectedSalleIds.map((id) => (
                      <Chip
                        key={id}
                        label={salleMap[id] || `Salle ${id}`}
                        size="small"
                        onDelete={() => setSelectedSalleIds((prev) => prev.filter((s) => s !== id))}
                        sx={{ background: 'action.selected' }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}
            <Box
              ref={scrollRef}
              sx={{
                position: 'relative',
                display: 'flex',
                overflow: 'auto',
                background: 'background.paper',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                width: '100%',
              }}
            >
              {/* Time axis */}
              <Box
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 40,
                  width: 64,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  background: `linear-gradient(180deg, ${theme.palette.background.default}, ${theme.palette.background.paper})`,
                  fontSize: 12,
                  color: 'text.primary',
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    height: 34,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                  }}
                ></Box>
                <Box sx={{ position: 'relative', height: totalHeight }}>
                  {hours.map((h, idx) => (
                    <Box
                      key={h}
                      sx={{
                        position: 'absolute',
                        top: idx * HOUR_HEIGHT,
                        left: 0,
                        right: 0,
                        height: HOUR_HEIGHT,
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: SUBPIXEL_ADJUST,
                          left: 0,
                          right: 0,
                          borderTop: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                      <Typography
                        variant="subtitle2"
                        sx={{
                          position: 'absolute',
                          top: -7,
                          left: 0,
                          right: 0,
                          background: theme.palette.background.paper,
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          px: 0.5,
                          fontWeight: 700,
                          lineHeight: 1,
                          textAlign: 'center',
                        }}
                      >
                        {h.toString().padStart(2, '0')}h
                      </Typography>
                      {/* Half-hour subtle line */}
                      {h < MAX_HOUR && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: HOUR_HEIGHT / 2,
                            left: 0,
                            right: 0,
                            borderTop: '1px dotted',
                            borderColor: 'divider',
                            opacity: 0.7,
                          }}
                        />
                      )}
                      {/* Quarter-hour ticks (subtle) */}
                      {h < MAX_HOUR && (
                        <>
                          <Box
                            sx={{
                              position: 'absolute',
                              top: (3 * HOUR_HEIGHT) / 4,
                              left: 8,
                              right: 8,
                              borderTop: '1px dashed',
                              borderColor: 'divider',
                              opacity: 0.35,
                            }}
                          />
                        </>
                      )}
                    </Box>
                  ))}
                  {/* Now indicator line (time axis) */}
                  {nowMinutes >= MIN_HOUR * 60 && nowMinutes <= MAX_HOUR * 60 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: (nowMinutes - MIN_HOUR * 60) * minuteHeight + SUBPIXEL_ADJUST,
                        left: 0,
                        right: 0,
                        height: 0,
                        borderTop: '2px solid',
                        borderColor: 'error.main',
                        zIndex: 5,
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                </Box>
              </Box>
              {/* Day columns */}
              <Box sx={{ display: 'flex', height: totalHeight, minWidth: 0, flex: 1 }}>
                {perDay.map(({ date, key, slots }) => {
                  const label = date.toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  });
                  return (
                    <Box
                      key={key}
                      sx={{
                        width: displayMode === 'day' ? '100%' : `${100 / visibleDays.length}%`,
                        flex: displayMode === 'day' ? 1 : 'initial',
                        minWidth: displayMode === 'day' ? 0 : 180,
                        borderLeft: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Box
                        sx={{
                          height: 34,
                          lineHeight: '34px',
                          flex: '0 0 34px',
                          boxSizing: 'border-box',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          background: `linear-gradient(180deg, ${theme.palette.background.default}, ${theme.palette.background.paper})`,
                        }}
                      >
                        {label}
                      </Box>
                      <Box sx={{ position: 'relative', height: totalHeight }}>
                        {/* Hour background stripes & lines for alignment */}
                        {hours.map((h, idx) => (
                          <React.Fragment key={h}>
                            <Box
                              sx={{
                                position: 'absolute',
                                top: idx * HOUR_HEIGHT,
                                left: 0,
                                right: 0,
                                height: HOUR_HEIGHT,
                                background:
                                  idx % 2 === 0 ? theme.palette.action.hover : 'transparent',
                              }}
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: idx * HOUR_HEIGHT + SUBPIXEL_ADJUST,
                                left: 0,
                                right: 0,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                              }}
                            />
                            {/* Half / quarter subtle lines (mirroring time axis) */}
                            {h < MAX_HOUR && (
                              <>
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: idx * HOUR_HEIGHT + HOUR_HEIGHT / 4 + SUBPIXEL_ADJUST,
                                    left: 8,
                                    right: 8,
                                    borderTop: '1px dashed',
                                    borderColor: 'divider',
                                    opacity: 0.35,
                                  }}
                                />
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top:
                                      idx * HOUR_HEIGHT + (3 * HOUR_HEIGHT) / 4 + SUBPIXEL_ADJUST,
                                    left: 8,
                                    right: 8,
                                    borderTop: '1px dashed',
                                    borderColor: 'divider',
                                    opacity: 0.35,
                                  }}
                                />
                              </>
                            )}
                          </React.Fragment>
                        ))}
                        {/* Slots */}
                        {slots.length === 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              color: 'text.secondary',
                              fontStyle: 'italic',
                            }}
                          >
                            Aucun créneau
                          </Typography>
                        )}
                        {/* Now indicator line (per day column) */}
                        {nowMinutes >= MIN_HOUR * 60 && nowMinutes <= MAX_HOUR * 60 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: (nowMinutes - MIN_HOUR * 60) * minuteHeight + SUBPIXEL_ADJUST,
                              left: 0,
                              right: 0,
                              borderTop: `2px solid ${theme.palette.error.main}`,
                              zIndex: 55,
                              pointerEvents: 'none',
                            }}
                          />
                        )}
                        {slots.map((s) => {
                          // Naive local parse (avoid timezone drift)
                          const rawStart =
                            typeof s.slot.startDate === 'string' ? s.slot.startDate : '';
                          const rawEnd = typeof s.slot.endDate === 'string' ? s.slot.endDate : '';
                          const parseMinutes = (str: string) => {
                            const cleaned = str.replace(' ', 'T');
                            const m = cleaned.match(/T(\d{2}):(\d{2})/);
                            if (!m) return 0;
                            return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
                          };
                          const startMinutes = parseMinutes(rawStart);
                          const endMinutes = parseMinutes(rawEnd);
                          const clampedStart = Math.max(startMinutes, MIN_HOUR * 60);
                          const top = (clampedStart - MIN_HOUR * 60) * minuteHeight;
                          const duration = Math.max(5, endMinutes - startMinutes);
                          const clampedEnd = Math.min(endMinutes, MAX_HOUR * 60);
                          const visibleDuration = Math.max(10, clampedEnd - clampedStart);
                          let height = visibleDuration * minuteHeight;
                          // const MIN_EVENT_PX = 40;
                          // if (height < MIN_EVENT_PX) height = MIN_EVENT_PX;
                          const col = s.col || 0;
                          const cols = s.cols || 1;
                          const widthPct = 100 / cols;
                          const leftPct = col * widthPct;
                          const salleNames =
                            Array.isArray(s.slot.salleIds) && s.slot.salleIds.length
                              ? s.slot.salleIds.map((id: number) => salleMap[id] || `Salle ${id}`)
                              : Array.isArray(s.event.salleIds)
                                ? (s.event.salleIds as any[]).map(
                                    (id: number) => salleMap[id] || `Salle ${id}`,
                                  )
                                : [];
                          const classNames =
                            Array.isArray(s.slot.classIds) && s.slot.classIds.length
                              ? s.slot.classIds.map((id: number) => classMap[id] || `Classe ${id}`)
                              : Array.isArray(s.event.classIds)
                                ? (s.event.classIds as any[]).map(
                                    (id: number) => classMap[id] || `Classe ${id}`,
                                  )
                                : [];
                          const salleColorPalette = [
                            '#fde68a',
                            '#bfdbfe',
                            '#c4b5fd',
                            '#bbf7d0',
                            '#fecdd3',
                            '#ddd6fe',
                            '#a5f3fc',
                            '#fbcfe8',
                            '#fee2e2',
                            '#e9d5ff',
                            '#ccfbf1',
                            '#e0e7ff',
                            '#fef9c3',
                            '#d9f99d',
                            '#fecaca',
                            '#fbcfe8',
                            '#bae6fd',
                            '#ddd6fe',
                            '#bbf7d0',
                            '#fde68a',
                            '#f5d0fe',
                            '#99f6e4',
                            '#fed7aa',
                            '#e2e8f0',
                          ];
                          const bg =
                            scheduleMode === 'events'
                              ? eventTypeColor(s.event)
                              : (() => {
                                  const sid = s.salleId ?? salleNames[0];
                                  const key =
                                    typeof sid === 'number'
                                      ? sid
                                      : String(sid || '').charCodeAt(0) % salleColorPalette.length;
                                  return salleColorPalette[Number(key) % salleColorPalette.length];
                                })();
                          return (
                            <Box
                              key={`${s.event.id}-${s.slot.id}${scheduleMode === 'rooms' ? '-' + (s.salleId ?? '') : ''}`}
                              onClick={() => {
                                if (scheduleMode === 'rooms' && s.salleId != null) {
                                  onRoomClick?.(s.salleId as number);
                                } else {
                                  onEventClick?.(s.event);
                                }
                              }}
                              sx={{
                                position: 'absolute',
                                top,
                                left: `${leftPct}%`,
                                width: `calc(${widthPct}% - 4px)`,
                                height,
                                // minHeight: MIN_EVENT_PX,
                                borderRadius: 1.3,
                                background: bg,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                                p: 0.6,
                                pr: 3.5,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.25,
                                fontSize: 11,
                                transition: 'box-shadow .2s, transform .2s',
                                '&:hover': {
                                  boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
                                  transform: 'translateY(-2px)',
                                  zIndex: 60,
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  flex: 1,
                                  overflow: 'hidden',
                                }}
                              >
                                {scheduleMode === 'rooms' ? (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: 13,
                                      lineHeight: 1.1,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: 'block',
                                    }}
                                    noWrap
                                    title={salleMap[s.salleId as number] || 'Salle'}
                                  >
                                    {salleMap[s.salleId as number] || 'Salle'}
                                  </Typography>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: 13,
                                      lineHeight: 1.1,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: 'block',
                                    }}
                                    noWrap
                                    title={s.event.owner?.name || 'Utilisateur'}
                                  >
                                    {s.event.owner?.name || 'Utilisateur'}
                                  </Typography>
                                )}
                                {/* <Typography
                                  variant="caption"
                                  sx={{ fontSize: 10, lineHeight: 1.1 }}
                                  noWrap
                                  title={salleNames.join(', ') || 'Aucune salle'}
                                >
                                  {salleNames.length ? salleNames.join(', ') : 'Aucune salle'}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontSize: 10, lineHeight: 1.1 }}
                                  noWrap
                                  title={classNames.join(', ') || 'Aucune classe'}
                                >
                                  {classNames.length ? classNames.join(', ') : 'Aucune classe'}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontSize: 10, fontWeight: 500, lineHeight: 1.1 }}
                                >
                                  {formatHour(s.slot)}
                                </Typography> */}
                              </Box>
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  background: 'background.paper',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  pointerEvents: 'none',
                                  '& > *': { fontSize: '15px !important' },
                                }}
                              >
                                {statusIcon(s.slot)}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        );
      })()}
    </Box>
  );
}
