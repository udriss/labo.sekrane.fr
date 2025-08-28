'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormGroup,
  FormControlLabel,
  Switch,
  Button,
  Divider,
  Collapse,
  IconButton,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

export type OwnerNotifSettings = {
  enabled: boolean;
  includeTimeslots: boolean;
  includeDocuments: boolean;
  blockedUserIds?: number[]; // utilisateurs exclus des notifications owner
};

export type AccountNotifSettings = {
  loginSuccess: boolean;
  loginFailed: boolean;
  passwordChanged: boolean;
  passwordResetRequested: boolean;
  passwordResetCompleted: boolean;
  emailChangeRequested: boolean;
  emailChanged: boolean;
};

type Props = {
  value: OwnerNotifSettings;
  onChange: (next: OwnerNotifSettings) => void;
  onSave: () => void;
  saving?: boolean;
  account?: AccountNotifSettings;
  onAccountChange?: (next: AccountNotifSettings) => void;
};

export default function NotificationOwnerSettings({
  value,
  onChange,
  onSave,
  saving,
  account,
  onAccountChange,
}: Props) {
  // Chargement paresseux de la liste des utilisateurs pour sélection fine
  const [users, setUsers] = useState<
    { id: number; name: string | null; email: string; role: string }[]
  >([]);
  const [usersOpen, setUsersOpen] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // On charge seulement si l'accordéon est ouvert et que la liste est vide
    if (!usersOpen || users.length) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/notification-users');
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data.users || []);
      } catch {}
    })();
  }, [usersOpen, users.length]);

  const blocked = useMemo(() => value.blockedUserIds || [], [value.blockedUserIds]);
  const selectedUsers = useMemo(
    () => users.filter((u) => blocked.includes(u.id)),
    [users, blocked],
  );
  const visibleUsers = useMemo(() => {
    if (!filter) return users;
    const f = filter.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || u.email).toLowerCase().includes(f) || (u.email || '').toLowerCase().includes(f),
    );
  }, [users, filter]);

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          Notifications ciblées pour le propriétaire d'un événement
        </Typography>
        <Button variant="contained" onClick={onSave} disabled={saving}>
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </Button>
      </Box>
      <Typography color="text.secondary" mb={2}>
        Envoi d'une notification au créateur d'un événement lorsqu'il est modifié par un autre
        utilisateur. Si le propriétaire effectue lui‑même la modification, aucune notification n'est
        envoyée.
      </Typography>
      <Divider sx={{ my: 2 }} />
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={!!value.enabled}
              onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
            />
          }
          label="Activer les notifications au propriétaire lors des modifications d'événements"
        />
        <FormControlLabel
          control={
            <Switch
              checked={!!value.includeTimeslots}
              onChange={(e) => onChange({ ...value, includeTimeslots: e.target.checked })}
              disabled={!value.enabled}
            />
          }
          label="Inclure les changements de créneaux (timeslots)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={!!value.includeDocuments}
              onChange={(e) => onChange({ ...value, includeDocuments: e.target.checked })}
              disabled={!value.enabled}
            />
          }
          label="Inclure l'ajout ou la suppression de documents"
        />
      </FormGroup>

      {/* Sélection fine des utilisateurs (exclusion par utilisateur) */}
      <Box mt={2}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" fontWeight={600}>
            Sélection fine par utilisateur
          </Typography>
          <IconButton
            size="small"
            onClick={() => setUsersOpen((v) => !v)}
            aria-label="toggle-users"
          >
            {usersOpen ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Vous pouvez exclure certains utilisateurs des notifications propriétaire. Les utilisateurs
          listés ci‑dessous seront ignorés.
        </Typography>
        {/* Résumé sélectionné */}
        {selectedUsers.length > 0 && (
          <Box mt={1} display="flex" gap={1} flexWrap="wrap">
            {selectedUsers.map((u) => (
              <Chip
                key={u.id}
                label={u.name || u.email}
                onDelete={() =>
                  onChange({ ...value, blockedUserIds: blocked.filter((id) => id !== u.id) })
                }
                variant="outlined"
              />
            ))}
          </Box>
        )}
        <Collapse in={usersOpen} timeout="auto" unmountOnExit>
          <Box mt={2}>
            <TextField
              size="small"
              fullWidth
              placeholder="Rechercher un utilisateur (nom ou email)"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <List dense>
              {visibleUsers.map((u) => {
                const isBlocked = blocked.includes(u.id);
                return (
                  <ListItem
                    key={u.id}
                    divider
                    secondaryAction={
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={isBlocked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...(value.blockedUserIds || []), u.id]))
                                : (value.blockedUserIds || []).filter((id) => id !== u.id);
                              onChange({ ...value, blockedUserIds: next });
                            }}
                          />
                        }
                        label={isBlocked ? 'Exclu' : 'Actif'}
                      />
                    }
                  >
                    <ListItemText
                      primary={u.name || u.email}
                      secondary={`${u.email}${u.role ? ` · ${u.role}` : ''}`}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        </Collapse>
      </Box>

      {/* Compte: notifications ciblées (opt-in/out) */}
      {account && onAccountChange ? (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            Notifications liées au compte
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={!!account.loginFailed}
                  onChange={(e) => onAccountChange({ ...account, loginFailed: e.target.checked })}
                />
              }
              label="Alerter en cas d'échec de connexion"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!account.loginSuccess}
                  onChange={(e) => onAccountChange({ ...account, loginSuccess: e.target.checked })}
                />
              }
              label="Informer en cas de connexion réussie"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!account.passwordChanged}
                  onChange={(e) =>
                    onAccountChange({ ...account, passwordChanged: e.target.checked })
                  }
                />
              }
              label="Mot de passe changé"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!account.passwordResetRequested}
                  onChange={(e) =>
                    onAccountChange({ ...account, passwordResetRequested: e.target.checked })
                  }
                />
              }
              label="Demande de réinitialisation du mot de passe"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!account.passwordResetCompleted}
                  onChange={(e) =>
                    onAccountChange({ ...account, passwordResetCompleted: e.target.checked })
                  }
                />
              }
              label="Réinitialisation du mot de passe effectuée"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!account.emailChangeRequested}
                  onChange={(e) =>
                    onAccountChange({ ...account, emailChangeRequested: e.target.checked })
                  }
                />
              }
              label="Demande de changement d'email"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={!!account.emailChanged}
                  onChange={(e) => onAccountChange({ ...account, emailChanged: e.target.checked })}
                />
              }
              label="Email changé"
            />
          </FormGroup>
        </>
      ) : null}
    </Paper>
  );
}
