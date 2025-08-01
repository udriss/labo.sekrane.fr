// app/classes/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Stack,
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  School,
  Person,
  AdminPanelSettings,
  Public,
  PersonOutline
} from "@mui/icons-material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ClassData {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  created_at: string;
  created_by: string;
  user_id?: string;
  user_email?: string;
}

interface ClassesData {
  predefinedClasses: ClassData[];
  customClasses: ClassData[];
}

export default function ClassesManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [classesData, setClassesData] = useState<ClassesData>({
    predefinedClasses: [],
    customClasses: []
  });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingClass, setPendingClass] = useState<{ name: string; type: 'predefined' | 'custom' } | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [className, setClassName] = useState("");
  const [classType, setClassType] = useState<'predefined' | 'custom'>('predefined');

  // Vérifier l'autorisation - permettre tous les utilisateurs connectés
  useEffect(() => {
    if (session && !session.user) {
      router.push("/");
    }
  }, [session, router]);

  // Charger les données
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/classes");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des classes");
      }
      const data = await response.json();
      setClassesData(data);
    } catch (error) {
      console.error("Erreur:", error);
      setError(error instanceof Error ? error.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchClasses();
    }
  }, [session]);

  const handleAddClass = async () => {
    setError(null);
    // Vérifier si la classe existe déjà
    const existingClass = [...(classType === 'predefined' ? classesData.predefinedClasses : classesData.customClasses)]
      .find(c => c.name.toLowerCase() === className.toLowerCase());
    if (existingClass) {
      setPendingClass({ name: className, type: classType });
      setConfirmDialogOpen(true);
      return;
    }
    await actuallyAddClass(className, classType);
  };

  const actuallyAddClass = async (name: string, type: 'predefined' | 'custom') => {
    try {
      setError(null);
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, type }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'ajout");
      }
      setSuccessMessage(`Classe ${type === 'predefined' ? 'système' : 'personnalisée'} ajoutée avec succès`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setClassName("");
      setClassType('predefined');
      setOpenDialog(false);
      await fetchClasses();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de l'ajout");
    }
  };

  const handleEditClass = async () => {
    if (!editingClass) return;

    try {
      setError(null);
      const response = await fetch("/api/classes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          id: editingClass.id, 
          name: className 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la modification");
      }

      setSuccessMessage("Classe modifiée avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
      setClassName("");
      setEditingClass(null);
      setOpenDialog(false);
      await fetchClasses();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de la modification");
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette classe ? Cette action est irréversible.")) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/classes?id=${classId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la suppression");
      }

      setSuccessMessage("Classe supprimée avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchClasses();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de la suppression");
    }
  };

  const handleOpenDialog = (classData?: ClassData) => {
    if (classData) {
      setEditingClass(classData);
      setClassName(classData.name);
      setClassType(classData.type);
    } else {
      setEditingClass(null);
      setClassName("");
      setClassType('predefined');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingClass(null);
    setClassName("");
    setClassType('predefined');
  };

  if (!session) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h4" gutterBottom>
          Accès restreint
        </Typography>
        <Typography variant="body1">
          Veuillez vous connecter pour accéder à cette page.
        </Typography>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            <School sx={{ mr: 2, verticalAlign: "middle", fontSize: "inherit" }} />
            Gestion des Classes
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Gérez les classes système et personnalisées
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="large"
          onClick={() => handleOpenDialog()}
        >
          Nouvelle classe
        </Button>
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

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <Public fontSize="small" />
              Classes système ({classesData.predefinedClasses.length})
            </Box>
          } 
          disabled={false}
        />
        <Tab 
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <PersonOutline fontSize="small" />
              Classes personnalisées ({classesData.customClasses.length})
            </Box>
          } 
          disabled={false}
        />
      </Tabs>

      {/* Onglet Classes système */}
      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom de la classe</TableCell>
                <TableCell>Date de création</TableCell>
                <TableCell>Créé par</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classesData.predefinedClasses.map((classItem) => (
                <TableRow key={classItem.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Public fontSize="small" color="primary" />
                      <Typography variant="body1" fontWeight="medium">
                        {classItem.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {classItem.created_at ? new Date(classItem.created_at).toLocaleDateString("fr-FR") : "Date inconnue"}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      icon={<AdminPanelSettings fontSize="small" />}
                      label={classItem.created_by === "SYSTEM" ? "Système initial" : `Admin ${classItem.created_by}`}
                      size="small"
                      variant="outlined"
                      color={classItem.created_by === "SYSTEM" ? "default" : "primary"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(classItem)}
                      color="primary"
                      disabled={!(session?.user?.role === "ADMIN" || session?.user?.role === "ADMINLABO")}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClass(classItem.id)}
                      disabled={!(session?.user?.role === "ADMIN" || session?.user?.role === "ADMINLABO")}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {classesData.predefinedClasses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      Aucune classe système
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Dialogue de confirmation pour ajout de classe avec nom existant */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Nom de classe déjà existant</DialogTitle>
        <DialogContent>
          <Typography>
            Une classe avec le nom "{pendingClass?.name}" existe déjà. Voulez-vous quand même l'ajouter ? (L'identifiant sera unique)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmDialogOpen(false); setPendingClass(null); }}>Annuler</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (pendingClass) {
                await actuallyAddClass(pendingClass.name, pendingClass.type);
                setConfirmDialogOpen(false);
                setPendingClass(null);
              }
            }}
          >
            Ajouter quand même
          </Button>
        </DialogActions>
      </Dialog>

      {/* Onglet Classes personnalisées */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom de la classe</TableCell>
                <TableCell>Propriétaire</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Date de création</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classesData.customClasses.map((classItem) => (
                <TableRow key={classItem.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonOutline fontSize="small" color="secondary" />
                      <Typography variant="body1">
                        {classItem.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<Person fontSize="small" />}
                      label={classItem.created_by || "Inconnu"}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {classItem.user_email || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {classItem.created_at ? new Date(classItem.created_at).toLocaleDateString("fr-FR") : "Date inconnue"}
                  </TableCell>
                </TableRow>
              ))}
              {classesData.customClasses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      Aucune classe personnalisée créée par les utilisateurs
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Statistiques */}
      <Box mt={4}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total des classes
                    </Typography>
                    <Typography variant="h4">
                      {classesData.predefinedClasses.length + classesData.customClasses.length}
                    </Typography>
                  </Box>
                  <School fontSize="large" color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Classes système
                    </Typography>
                    <Typography variant="h4">
                      {classesData.predefinedClasses.length}
                    </Typography>
                  </Box>
                  <Public fontSize="large" color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Classes personnalisées
                    </Typography>
                    <Typography variant="h4">
                      {classesData.customClasses.length}
                    </Typography>
                  </Box>
                  <PersonOutline fontSize="large" color="secondary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Dialog pour ajouter/modifier une classe */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingClass ? "Modifier la classe" : "Nouvelle classe"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {!editingClass && (
              <FormControl component="fieldset">
                <FormLabel component="legend">Type de classe</FormLabel>
                <RadioGroup
                  value={classType}
                  onChange={(e) => setClassType(e.target.value as 'predefined' | 'custom')}
                >
                  <FormControlLabel
                    value="predefined"
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Public fontSize="small" />
                        <Box>
                          <Typography variant="body1">Classe système</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Visible et utilisable par tous les utilisateurs
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="custom"
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonOutline fontSize="small" />
                        <Box>
                          <Typography variant="body1">Classe personnalisée</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Classe personnelle pour votre usage
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            )}

            <TextField
              autoFocus
              fullWidth
              label="Nom de la classe"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder={classType === 'predefined' ? "Ex: 1ère ES, 208, BTS..." : "Ex: Groupe A, Projet X..."}
              helperText={
                editingClass 
                  ? "Modifiez le nom de la classe"
                  : classType === 'predefined' 
                    ? "Cette classe sera disponible pour tous les utilisateurs"
                    : "Cette classe sera uniquement disponible pour vous"
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button
            onClick={editingClass ? handleEditClass : handleAddClass}
            variant="contained"
            disabled={!className.trim()}
            startIcon={editingClass ? <Edit /> : <Add />}
          >
            {editingClass ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}