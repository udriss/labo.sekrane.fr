"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Person,
  Edit,
  Delete,
  Add,
  AdminPanelSettings,
} from "@mui/icons-material";
import { Role } from "@prisma/client";
import { useSession } from "next-auth/react";

// Type pour User basé sur notre API
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  class?: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tabIndex, setTabIndex] = useState(0);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/utilisateurs");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des utilisateurs");
      }
      const usersData = await response.json();
      setUsers(usersData);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
      setError(
        error instanceof Error ? error.message : "Erreur de chargement"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return "error";
      case Role.TEACHER:
        return "primary";
      case Role.STUDENT:
        return "default";
      default:
        return "default";
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return "Administrateur";
      case Role.TEACHER:
        return "Enseignant";
      case Role.STUDENT:
        return "Étudiant";
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>Chargement des utilisateurs...</Typography>
      </Container>
    );
  }

  if (!session || !session.user) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h4" gutterBottom>
          Accès restreint
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Veuillez vous connecter pour accéder à cette page.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => (window.location.href = "/auth/signin")}
        >
          Aller à la page de connexion
        </Button>
      </Container>
    );
  }

  // Filter users and add role-based options
  const filteredUsers =
    session?.user?.role === "ADMIN"
      ? users
      : users.filter((user) => user.email === session?.user?.email);

  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: number
  ) => {
    setTabIndex(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            <Person sx={{ mr: 2, verticalAlign: "middle" }} />
            Gestion des Utilisateurs
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Administration des comptes utilisateurs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="large"
          onClick={() => setOpenDialog(true)}
        >
          Nouvel utilisateur
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {session?.user?.role === "ADMIN" && (
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          aria-label="Admin Tabs"
          sx={{ mb: 4 }}
        >
          <Tab label="Mes Données" />
          <Tab label="Utilisateurs" />
        </Tabs>
      )}

      {tabIndex === 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6">Mes Données</Typography>
            <Typography>Nom: {session.user.name}</Typography>
            <Typography>Email: {session.user.email}</Typography>
            <Typography>Rôle: {session.user.role}</Typography>
          </CardContent>
        </Card>
      )}

      {tabIndex === 1 && (
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell>Classe</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Date de création</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {user.role === Role.ADMIN && (
                            <AdminPanelSettings color="error" />
                          )}
                          {user.name}
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={getRoleLabel(user.role)}
                          color={getRoleColor(user.role) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{user.class || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? "Actif" : "Inactif"}
                          color={user.isActive ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {session?.user?.role === "ADMIN" && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedUser(user);
                                setOpenDialog(true);
                              }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton size="small" color="error">
                              <Delete />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Dialog pour créer/modifier un utilisateur */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nom complet"
              margin="normal"
              defaultValue={selectedUser?.name || ""}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              defaultValue={selectedUser?.email || ""}
            />
            <TextField
              fullWidth
              label="Rôle"
              select
              margin="normal"
              defaultValue={selectedUser?.role || Role.STUDENT}
            >
              <MenuItem value={Role.ADMIN}>Administrateur</MenuItem>
              <MenuItem value={Role.TEACHER}>Enseignant</MenuItem>
              <MenuItem value={Role.STUDENT}>Étudiant</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Classe"
              margin="normal"
              defaultValue={selectedUser?.class || ""}
              helperText="Optionnel"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button variant="contained">
            {selectedUser ? "Modifier" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
