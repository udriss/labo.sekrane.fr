"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
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
  Avatar,
  Stack,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Paper,
  Divider,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import {
  Person,
  Edit,
  Delete,
  Add,
  AdminPanelSettings,
  School,
  Email,
  Save,
  Cancel,
  Class,
} from "@mui/icons-material";
import { Role } from "@prisma/client";
import { useSession } from "next-auth/react";

// Classes prédéfinies
const PREDEFINED_CLASSES = [
  "1ère ES",
  "Terminale ES",
  "1ère STI2D",
  "Terminale STI2D",
  "201",
  "202",
  "203",
  "204",
  "205",
  "206",
  "207",
];

interface UserClass {
  id: string;
  className: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  class?: string;
  isActive: boolean;
  createdAt: string;
  customClasses?: UserClass[];
}

interface UserFormData {
  name: string;
  email: string;
  role: Role;
  class?: string;
  selectedClasses: string[];
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<UserFormData>({
    name: "",
    email: "",
    role: Role.STUDENT,
    selectedClasses: []
  });
  const [userClasses, setUserClasses] = useState<string[]>([]);
  const [newClassName, setNewClassName] = useState("");

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

  const fetchUserProfile = async () => {
    if (!session?.user?.id) return;

    try {
      setProfileLoading(true);
      const response = await fetch(`/api/users/${session.user.id}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement du profil");
      }
      
      const userData = await response.json();
      
      // Extraire les classes personnalisées
      const customClasses = userData.customClasses?.map((uc: any) => uc.className) || [];
      setUserClasses(customClasses);
      
      setProfileData({
        name: userData.name || "",
        email: userData.email || "",
        role: userData.role as Role,
        selectedClasses: customClasses
      });
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
      setError("Erreur lors du chargement du profil utilisateur");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile();
    }
  }, [session?.user?.id]);

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return "error";
      case Role.TEACHER:
        return "primary";
      case Role.STUDENT:
        return "success";
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

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return;

    try {
      setProfileLoading(true);
      setError(null);

      const response = await fetch(`/api/users/${session.user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la mise à jour du profil");
      }

      const result = await response.json();
      
      // Mettre à jour les classes locales
      if (result.user?.customClasses) {
        const updatedClasses = result.user.customClasses.map((uc: any) => uc.className);
        setUserClasses(updatedClasses);
        setProfileData(prev => ({
          ...prev,
          selectedClasses: updatedClasses
        }));
      }

      setEditingProfile(false);
      
      // Afficher un message de succès (optionnel)
      console.log("Profil mis à jour avec succès");

    } catch (error) {
      console.error("Erreur:", error);
      setError(error instanceof Error ? error.message : "Erreur lors de la mise à jour du profil");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddCustomClass = async () => {
    if (newClassName.trim() && !profileData.selectedClasses.includes(newClassName.trim())) {
      setProfileData({
        ...profileData,
        selectedClasses: [...profileData.selectedClasses, newClassName.trim()]
      });
      setNewClassName("");
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
            <Person sx={{ mr: 2, verticalAlign: "middle", fontSize: "inherit" }} />
            Gestion des Utilisateurs
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Profil utilisateur et administration
          </Typography>
        </Box>
        {session?.user?.role === "ADMIN" && (
          <Button
            variant="contained"
            startIcon={<Add />}
            size="large"
            onClick={() => setOpenDialog(true)}
          >
            Nouvel utilisateur
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {session?.user?.role === "ADMIN" ? (
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          aria-label="Admin Tabs"
          sx={{ mb: 4 }}
        >
          <Tab label="Mon Profil" />
          <Tab label="Utilisateurs" />
        </Tabs>
      ) : null}

      {/* Onglet Mon Profil */}
      {(tabIndex === 0 || session?.user?.role !== "ADMIN") && (
        <Paper elevation={2} sx={{ p: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h2">
              Mon Profil
            </Typography>
            {!editingProfile ? (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setEditingProfile(true)}
              >
                Modifier
              </Button>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => setEditingProfile(false)}
                >
                  Annuler
                </Button>
                <Button
                  variant="contained"
                  startIcon={profileLoading ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                >
                  {profileLoading ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </Stack>
            )}
          </Stack>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Card>
                <CardContent>
                  {profileLoading ? (
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Skeleton variant="circular" width={60} height={60} />
                        <Box>
                          <Skeleton variant="text" width={150} height={30} />
                          <Skeleton variant="text" width={100} height={20} />
                        </Box>
                      </Box>
                      <Divider />
                      <Skeleton variant="text" width="100%" height={40} />
                      <Skeleton variant="text" width="100%" height={40} />
                      <Skeleton variant="text" width="100%" height={40} />
                    </Stack>
                  ) : (
                    <Stack spacing={3}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}>
                          <Person sx={{ fontSize: 30 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">{session?.user?.name}</Typography>
                          <Chip
                            label={getRoleLabel(session?.user?.role as Role)}
                            color={getRoleColor(session?.user?.role as Role) as any}
                            size="small"
                          />
                        </Box>
                      </Box>

                      <Divider />

                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Nom complet
                        </Typography>
                        {editingProfile ? (
                          <TextField
                            fullWidth
                            value={profileData.name}
                            onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                            size="small"
                          />
                        ) : (
                          <Typography variant="body1">{profileData.name}</Typography>
                        )}
                      </Box>

                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          <Email sx={{ fontSize: 16, mr: 1, verticalAlign: "text-top" }} />
                          Email
                        </Typography>
                        {editingProfile ? (
                          <TextField
                            fullWidth
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                            size="small"
                          />
                        ) : (
                          <Typography variant="body1">{profileData.email}</Typography>
                        )}
                      </Box>

                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Rôle
                        </Typography>
                        <Typography variant="body1">{getRoleLabel(session?.user?.role as Role)}</Typography>
                      </Box>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Card>
                <CardContent>
                  {profileLoading ? (
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Skeleton variant="circular" width={24} height={24} />
                        <Skeleton variant="text" width={120} height={30} />
                      </Box>
                      <Skeleton variant="rectangular" width="100%" height={60} />
                    </Stack>
                  ) : (
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Class />
                        <Typography variant="h6">Mes Classes</Typography>
                      </Box>

                      {editingProfile ? (
                        <Stack spacing={2}>
                          <FormControl fullWidth>
                            <InputLabel>Classes</InputLabel>
                            <Select
                              multiple
                              value={profileData.selectedClasses}
                              onChange={(e) => setProfileData({
                                ...profileData,
                                selectedClasses: typeof e.target.value === 'string' 
                                  ? e.target.value.split(',')
                                  : e.target.value
                              })}
                              input={<OutlinedInput label="Classes" />}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {selected.map((value) => (
                                    <Chip key={value} label={value} size="small" />
                                  ))}
                                </Box>
                              )}
                            >
                              {PREDEFINED_CLASSES.map((className) => (
                                <MenuItem key={className} value={className}>
                                  {className}
                                </MenuItem>
                              ))}
                              {profileData.selectedClasses
                                .filter(className => !PREDEFINED_CLASSES.includes(className))
                                .map((className) => (
                                  <MenuItem key={className} value={className}>
                                    {className} (personnalisé)
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>

                          <Box display="flex" gap={1}>
                            <TextField
                              size="small"
                              placeholder="Nouvelle classe..."
                              value={newClassName}
                              onChange={(e) => setNewClassName(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomClass()}
                              sx={{ flexGrow: 1 }}
                            />
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={handleAddCustomClass}
                              disabled={!newClassName.trim()}
                            >
                              Ajouter
                            </Button>
                          </Box>
                        </Stack>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {userClasses.length > 0 ? (
                            userClasses.map((className) => (
                              <Chip
                                key={className}
                                label={className}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Aucune classe assignée
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Onglet Utilisateurs (Admin seulement) */}
      {session?.user?.role === "ADMIN" && tabIndex === 1 && (
        <Paper elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Liste des Utilisateurs
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: 2 
            }}>
              {users.map((user) => (
                <Card 
                  key={user.id}
                  variant="outlined"
                  sx={{ 
                    height: '100%',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 2,
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: getRoleColor(user.role) + '.main' }}>
                          {user.role === Role.ADMIN ? <AdminPanelSettings /> : <Person />}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {user.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setOpenDialog(true);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error">
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={getRoleLabel(user.role)}
                          color={getRoleColor(user.role) as any}
                          size="small"
                        />
                        <Chip
                          label={user.isActive ? "Actif" : "Inactif"}
                          color={user.isActive ? "success" : "default"}
                          size="small"
                        />
                      </Stack>

                      {user.class && (
                        <Typography variant="body2">
                          📚 Classe: {user.class}
                        </Typography>
                      )}

                      {user.customClasses && user.customClasses.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Classes personnalisées:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {user.customClasses.map((userClass) => (
                              <Chip
                                key={userClass.id}
                                label={userClass.className}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      <Typography variant="caption" color="text.secondary">
                        Créé le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Paper>
      )}

      {/* Dialog pour créer/modifier un utilisateur (Admin seulement) */}
      {session?.user?.role === "ADMIN" && (
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
      )}
    </Container>
  );
}
