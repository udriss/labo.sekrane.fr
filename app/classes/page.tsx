'use client';
import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Tab,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Alert,
  Tooltip,
} from '@mui/material';
import DataExportTab from '@/components/export/DataExportTab';
import type { Column } from '@/types/export';
import { Add, Edit, Delete, School } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useTabWithURL } from '@/lib/hooks/useTabWithURL';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';

interface Classe {
  id: number;
  name: string;
  system?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
interface ClassesResponse {
  predefinedClasses: Classe[];
  customClasses: Classe[];
  mine: Classe[];
}

// Module-level draft cache for class creation form
const classDraftCache: { name?: string } = {} as any;

export default function ClassesPage() {
  const theme = useTheme();
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === 'ADMIN' || role === 'ADMINLABO';

  // Hook pour la gestion des tabs avec URL
  const { tabValue: tab, handleTabChange } = useTabWithURL({
    defaultTab: 0,
    maxTabs: 4, // 0: system, 1: custom, 2: mine, 3: export
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClassesResponse>({
    predefinedClasses: [],
    customClasses: [],
    mine: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Classe | null>(null);
  const [name, setName] = useState('');
  const [isSystem, setIsSystem] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/classes?mode=extended');
      if (!res.ok) throw new Error('Chargement impossible');
      const j = await res.json();
      if (j && typeof j === 'object') {
        setData({
          predefinedClasses: j.predefinedClasses || [],
          customClasses: j.customClasses || [],
          mine: j.mine || [],
        });
      } else {
        throw new Error('Réponse inattendue');
      }
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setName(classDraftCache.name || '');
    setIsSystem(false);
    setDialogOpen(true);
  };
  const openEdit = (c: Classe) => {
    setEditing(c);
    setName(c.name);
    setIsSystem(!!c.system);
    setDialogOpen(true);
  };
  const closeDialog = () => {
    if (!editing) classDraftCache.name = name; // persist draft only for new
    setDialogOpen(false);
  };

  const save = async () => {
    try {
      if (!name.trim()) return;
      const body = { name, system: isSystem };
      const url = editing ? `/api/classes?id=${editing.id}` : '/api/classes';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Echec sauvegarde');
      closeDialog();
      await load();
      if (!editing) classDraftCache.name = undefined; // clear draft after create
    } catch (e: any) {
      setError(e.message);
    }
  };

  const del = async (c: Classe) => {
    if (c.system && !isAdmin) return; // only admin may delete system
    if (!confirm(`Supprimer la classe "${c.name}" ?`)) return;
    await fetch(`/api/classes?id=${c.id}`, { method: 'DELETE' });
    await load();
  };

  const list = tab === 0 ? data.predefinedClasses : tab === 1 ? data.customClasses : data.mine;
  const columns: Column<Classe>[] = [
    { id: 'name', header: 'Nom', cell: (r) => r.name, exportValue: (r) => r.name },
    {
      id: 'system',
      header: 'Type',
      cell: (r) => (r.system ? 'SYSTEM' : 'CUSTOM'),
      exportValue: (r) => (r.system ? 'SYSTEM' : 'CUSTOM'),
    },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onError = (e: any) => {
      if (e?.message && /originalFactory\.call/.test(e.message)) {
        console.error('[Diagnostic] originalFactory.call error', e.error || e.message);
      }
    };
    window.addEventListener('error', onError);
    return () => window.removeEventListener('error', onError);
  }, []);

  return (
    <Box
      sx={{
        p: 0,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        gap={1}
        mb={2}
      >
        <Typography
          variant="h4"
          component="div"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            <School fontSize="medium" />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            Gestion des classes
          </Box>
        </Typography>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          sx={{ width: isMobileSmall ? '100%' : 'auto' }}
        >
          <Button
            onClick={openNew}
            startIcon={<Add />}
            variant="contained"
            fullWidth={isMobileSmall}
          >
            Nouvelle classe
          </Button>
        </Stack>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Tabs
        value={tab}
        onChange={(_, v) => handleTabChange(v)}
        sx={{ mb: 2 }}
        variant={isMobileSmall ? 'scrollable' : 'standard'}
        scrollButtons={isMobileSmall ? 'auto' : false}
        allowScrollButtonsMobile
      >
        <Tab label={`Système (${data.predefinedClasses.length})`} />
        <Tab label={`Personnalisées (${data.customClasses.length})`} />
        <Tab label={`Mes classes (${data.mine.length})`} />
        <Tab label="Export" />
      </Tabs>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={34} />
        </Box>
      ) : tab === 3 ? (
        <Box sx={{ mt: 1 }}>
          <DataExportTab
            title="Export classes"
            rows={list}
            columns={columns}
            filename="classes"
            defaultOrientation="portrait"
          />
        </Box>
      ) : (
        <Stack spacing={1}>
          {list.map((c) => (
            <Card key={c.id} variant="outlined" component={motion.div} whileHover={{ scale: 1.01 }}>
              <CardContent>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'stretch', md: 'center' }}
                  gap={1}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={600}>{c.name}</Typography>
                    {c.system && <Chip size="small" label="SYSTEM" />}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Modifier">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => openEdit(c)}
                          disabled={c.system && !isAdmin}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {(!c.system || isAdmin) && (
                      <Tooltip title="Supprimer">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => del(c)}
                            disabled={c.system && !isAdmin}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {!list.length && <Typography>Aucune classe.</Typography>}
        </Stack>
      )}
      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>{editing ? 'Modifier la classe' : 'Nouvelle classe'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            margin="dense"
          />
          {isAdmin && (
            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
              <Chip
                label={isSystem ? 'Classe système' : 'Classe perso'}
                color={isSystem ? 'primary' : 'default'}
                size="small"
              />
              <Button size="small" variant="outlined" onClick={() => setIsSystem((v) => !v)}>
                {isSystem ? 'Basculer perso' : 'Basculer système'}
              </Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annuler</Button>
          <Button onClick={save} disabled={!name.trim()} variant="contained">
            {editing ? 'Sauvegarder' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
