'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Box,
  Alert,
  Chip,
  TextField,
  MenuItem,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';

interface TokenRow {
  id: number;
  email: string;
  token: string;
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
}

export default function ActivationTokensAdminPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [rows, setRows] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [state, setState] = useState<'all' | 'valid' | 'expired' | 'used'>('all');

  useEffect(() => {
    const run = async () => {
      if (status !== 'authenticated' || !isAdmin) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/admin/activation-tokens');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erreur chargement');
        setRows(json.tokens || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [status, isAdmin]);

  if (status === 'loading' || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">Accès refusé. Administrateurs uniquement.</Alert>
      </Container>
    );
  }

  const filtered = rows.filter((t) => {
    const emailOk = !q || t.email.toLowerCase().includes(q.toLowerCase());
    const expired = new Date(t.expiresAt) < new Date();
    const s = t.usedAt ? 'used' : expired ? 'expired' : 'valid';
    const stateOk = state === 'all' || state === s;
    return emailOk && stateOk;
  });

  return (
    <Box
      sx={{
        p: 0,
      }}
    >
      <Box component={motion.div} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Jetons d'activation
        </Typography>
        <Box
          display="flex"
          gap={2}
          mb={2}
          flexDirection={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <TextField
            label="Rechercher email"
            size="small"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            fullWidth={isMobile}
          />
          <TextField
            label="État"
            size="small"
            select
            value={state}
            onChange={(e) => setState(e.target.value as any)}
            fullWidth={isMobileSmall}
          >
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="valid">Valide</MenuItem>
            <MenuItem value="expired">Expiré</MenuItem>
            <MenuItem value="used">Utilisé</MenuItem>
          </TextField>
        </Box>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Créé le</TableCell>
            <TableCell>Expire le</TableCell>
            <TableCell>État</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((t) => {
            const expired = new Date(t.expiresAt) < new Date();
            const state = t.usedAt ? 'Utilisé' : expired ? 'Expiré' : 'Valide';
            const color = t.usedAt ? 'default' : expired ? 'error' : 'success';
            return (
              <TableRow key={t.id}>
                <TableCell>{t.id}</TableCell>
                <TableCell>{t.email}</TableCell>
                <TableCell>{new Date(t.createdAt).toLocaleString()}</TableCell>
                <TableCell>{new Date(t.expiresAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip size="small" color={color as any} label={state} />
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Typography variant="body2" color="text.secondary">
                  Aucun jeton
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
