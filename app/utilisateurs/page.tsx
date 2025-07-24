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
import { useSession } from "next-auth/react";
import { useClasses } from "@/lib/hooks/useClasses";
import { ca } from "date-fns/locale";

// Enum Role défini localement
enum Role {
  ADMIN = "ADMIN",
  ADMINLABO = "ADMINLABO",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT",
  LABORANTIN = "LABORANTIN"
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  associatedClasses?: string[];  // Classes prédéfinies
  customClasses?: string[];      // Classes personnalisées
}

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: Role;
  selectedClasses: string[];
}

export default function UsersPage() {
  const { data: session } = useSession();
  const { predefinedClasses, loading: classesLoading } = useClasses();
  
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
  const [newClassName, setNewClassName] = useState("");
  
  // État pour le formulaire de création/modification
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    email: "",
    password: "",
    role: Role.STUDENT,
    selectedClasses: []
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      const response = await fetch(`/api/user/${session.user.id}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement du profil");
      }
      
      const userData = await response.json();
      
      // Combiner les classes associées et personnalisées
      const allClasses = [
        ...(userData.associatedClasses || []),
        ...(userData.customClasses || [])
      ];
      
      setProfileData({
        name: userData.name || "",
        email: userData.email || "",
        role: userData.role as Role,
        selectedClasses: allClasses
      });
    } catch (error) {
      console.error("Erreur lors du chargement du profil:", error);
      setError("Erreur lors du chargement du profil utilisateur");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchUsers();
    }
  }, [session?.user?.role]);

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
      case Role.LABORANTIN:
        return "secondary";
      case Role.STUDENT:
        return "success";
      case Role.ADMINLABO:
        return "warning";
      default:
        return "default";
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return "Administrateur";
      case Role.ADMINLABO:
        return "Administrateur de Laboratoire";
      case Role.TEACHER:
        return "Enseignant";
      case Role.LABORANTIN:
        return "Laborantin";
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

      const dataToSend: any = {
        name: profileData.name,
        email: profileData.email,
        selectedClasses: profileData.selectedClasses
      };

      if (profileData.password && profileData.password.trim() !== '') {
        dataToSend.password = profileData.password;
      }

      const response = await fetch(`/api/user/${session.user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la mise à jour du profil");
      }

      const result = await response.json();
      
      // Mettre à jour avec les nouvelles données
      if (result.user) {
        const allClasses = [
          ...(result.user.associatedClasses || []),
          ...(result.user.customClasses || [])
        ];
        setProfileData(prev => ({
          ...prev,
          selectedClasses: allClasses,
          password: ''
        }));
      }

      setEditingProfile(false);
      await fetchUserProfile();
      setSuccessMessage("Profil mis à jour avec succès");
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (error) {
      console.error("Erreur:", error);
      setError(error instanceof Error ? error.message : "Erreur lors de la mise à jour du profil");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/user/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la suppression");
      }

      await fetchUsers();
      setError(null);
    } catch (error) {
      console.error("Erreur:", error);
      setError(error instanceof Error ? error.message : "Erreur lors de la suppression de l'utilisateur");
    }
  };

  const handleCreateOrUpdateUser = async () => {
    try {
      const url = selectedUser 
        ? `/api/user/${selectedUser.id}` 
        : "/api/utilisateurs";
      
      const method = selectedUser ? "PUT" : "POST";
      
      // Séparer les classes prédéfinies et personnalisées
      const associatedClasses = formData.selectedClasses.filter(c => predefinedClasses.includes(c));
      const customClasses = formData.selectedClasses.filter(c => !predefinedClasses.includes(c));
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          associatedClasses,
          customClasses,
          password: formData.password || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur lors de ${selectedUser ? 'la modification' : 'la création'}`);
      }

      setOpenDialog(false);
      setSelectedUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: Role.STUDENT,
        selectedClasses: []
      });
      await fetchUsers();
      setError(null);
    } catch (error) {
      console.error("Erreur:", error);
      setError(error instanceof Error ? error.message : `Erreur lors de ${selectedUser ? 'la modification' : 'la création'} de l'utilisateur`);
    }
  };

  const handleAddCustomClass = () => {
    if (newClassName.trim() && !profileData.selectedClasses.includes(newClassName.trim())) {
      setProfileData({
        ...profileData,
        selectedClasses: [...profileData.selectedClasses, newClassName.trim()]
      });
      setNewClassName("");
    }
  };

  const handleRemoveClass = (className: string) => {
    setProfileData({
      ...profileData,
      selectedClasses: profileData.selectedClasses.filter(c => c !== className)
    });
  };

  if (loading && session?.user?.role === "ADMIN") {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement des utilisateurs...</Typography>
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  // Fonction pour afficher les classes avec distinction
  const renderClassChips = (associatedClasses: string[] = [], customClasses: string[] = []) => {
    if (associatedClasses.length === 0 && customClasses.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Aucune classe assignée
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {associatedClasses.map((className) => (
          <Chip
            key={className}
            label={className}
            size="small"
            color="primary"
            variant="filled"
          />
        ))}
        {customClasses.map((className) => (
          <Chip
            key={className}
            label={`${className} (personnalisé)`}
            size="small"
            color="secondary"
            variant="outlined"
          />
        ))}
      </Box>
    );
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
            onClick={() => {
              setSelectedUser(null);
              setFormData({
                name: "",
                email: "",
                password: "",
                role: Role.STUDENT,
                selectedClasses: []
              });
              setOpenDialog(true);
            }}
          >
            Nouvel utilisateur
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
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
                  onClick={() => {
                    setEditingProfile(false);
                    fetchUserProfile();
                    setProfileData(prev => ({
                      ...prev,
                      password: ''
                    }));
                  }}
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

                      {editingProfile && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Nouveau mot de passe (laisser vide pour ne pas changer)
                          </Typography>
                          <TextField
                            fullWidth
                            type="password"
                            value={profileData.password || ""}
                            onChange={(e) => setProfileData({...profileData, password: e.target.value})}
                            size="small"
                            placeholder="••••••••"
                          />
                        </Box>
                      )}
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
                          <Typography variant="body2" color="text.secondary">
                            Sélectionnez vos classes ou ajoutez-en de nouvelles
                          </Typography>
                          
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
                                    <Chip 
                                      key={value} 
                                      label={value} 
                                      size="small"
                                      color={predefinedClasses.includes(value) ? "primary" : "secondary"}
                                      onDelete={() => handleRemoveClass(value)}
                                      onMouseDown={(e) => e.stopPropagation()}
                                    />
                                  ))}
                                </Box>
                              )}
                            >
                              <MenuItem disabled>
                                <Typography variant="caption" color="text.secondary">
                                  Classes prédéfinies
                                </Typography>
                              </MenuItem>
                              {predefinedClasses.map((className: string) => (
                                <MenuItem key={className} value={className}>
                                  {className}
                                </MenuItem>
                              ))}
                              {profileData.selectedClasses
                                .filter(className => !predefinedClasses.includes(className))
                                .length > 0 && (
                                <>
                                  <MenuItem disabled>
                                    <Typography variant="caption" color="text.secondary">
                                      Classes personnalisées
                                    </Typography>
                                  </MenuItem>
                                  {profileData.selectedClasses
                                    .filter(className => !predefinedClasses.includes(className))
                                    .map((className) => (
                                      <MenuItem key={className} value={className}>
                                        {className}
                                      </MenuItem>
                                    ))}
                                </>
                              )}
                            </Select>
                          </FormControl>

                          <Box display="flex" gap={1}>
                            <TextField
                              size="small"
                              placeholder="Nouvelle classe personnalisée..."
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
                        <Box>
                          {(() => {
                            const associatedClasses = profileData.selectedClasses.filter(c => predefinedClasses.includes(c));
                            const customClasses = profileData.selectedClasses.filter(c => !predefinedClasses.includes(c));
                            return renderClassChips(associatedClasses, customClasses);
                          })()}
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
              Liste des Utilisateurs ({users.length})
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
                              const allClasses = [
                                ...(user.associatedClasses || []),
                                ...(user.customClasses || [])
                              ];
                              setFormData({
                                name: user.name,
                                email: user.email,
                                password: "",
                                role: user.role,
                                selectedClasses: allClasses
                              });
                              setOpenDialog(true);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === session.user.id}
                          >
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

                                            <Box>
                        <Typography variant="caption" color="text.secondary">
                          Classes:
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {renderClassChips(user.associatedClasses || [], user.customClasses || [])}
                        </Box>
                      </Box>

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
          onClose={() => {
            setOpenDialog(false);
            setSelectedUser(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {selectedUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Nom complet"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <TextField
                fullWidth
                label="Mot de passe"
                type="password"
                value={formData.password || ""}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                helperText={selectedUser ? "Laisser vide pour conserver l'actuel" : "Obligatoire"}
                required={!selectedUser}
              />
              <TextField
                fullWidth
                label="Rôle"
                select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
              >
                <MenuItem value={Role.ADMIN}>Administrateur</MenuItem>
                <MenuItem value={Role.ADMINLABO}>Administrateur de Laboratoire</MenuItem>
                <MenuItem value={Role.TEACHER}>Enseignant</MenuItem>
                <MenuItem value={Role.LABORANTIN}>Laborantin</MenuItem>
                <MenuItem value={Role.STUDENT}>Étudiant</MenuItem>
              </TextField>
              
              <FormControl fullWidth>
                <InputLabel>Classes assignées</InputLabel>
                <Select
                  multiple
                  value={formData.selectedClasses}
                  onChange={(e) => setFormData({
                    ...formData,
                    selectedClasses: typeof e.target.value === 'string' 
                      ? e.target.value.split(',')
                      : e.target.value
                  })}
                  input={<OutlinedInput label="Classes assignées" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={value} 
                          size="small"
                          color={predefinedClasses.includes(value) ? "primary" : "secondary"}
                        />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem disabled>
                    <Typography variant="caption" color="text.secondary">
                      Classes prédéfinies
                    </Typography>
                  </MenuItem>
                  {predefinedClasses.map((className) => (
                    <MenuItem key={className} value={className}>
                      {className}
                    </MenuItem>
                  ))}
                  
                  {/* Ajouter les classes personnalisées existantes de l'utilisateur */}
                  {selectedUser?.customClasses && selectedUser.customClasses.length > 0 && (
                    <>
                      <MenuItem disabled>
                        <Typography variant="caption" color="text.secondary">
                          Classes personnalisées existantes
                        </Typography>
                      </MenuItem>
                      {selectedUser.customClasses.map((className) => (
                        <MenuItem key={className} value={className}>
                          {className}
                        </MenuItem>
                      ))}
                    </>
                  )}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Ajouter une classe personnalisée"
                placeholder="Entrez le nom d'une nouvelle classe..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = (e.target as HTMLInputElement).value.trim();
                    if (value && !formData.selectedClasses.includes(value)) {
                      setFormData({
                        ...formData,
                        selectedClasses: [...formData.selectedClasses, value]
                      });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
                helperText="Appuyez sur Entrée pour ajouter"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenDialog(false);
              setSelectedUser(null);
              setFormData({
                name: "",
                email: "",
                password: "",
                role: Role.STUDENT,
                selectedClasses: []
              });
            }}>
              Annuler
            </Button>
            <Button 
              variant="contained"
              onClick={handleCreateOrUpdateUser}
              disabled={!formData.name || !formData.email || (!selectedUser && !formData.password)}
            >
              {selectedUser ? "Modifier" : "Créer"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
}
                