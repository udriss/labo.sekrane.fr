// app/consommables/page.tsx

/* eslint react/no-unescaped-entities: off */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import {
  Box,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  Build as ToolIcon,
  ViewModule as CardViewIcon,
  ViewList as ListViewIcon,
} from '@mui/icons-material';

interface Consumable {
  id: number;
  name: string;
  type?: string;
  brand?: string;
  model?: string;
  supplier?: string;
  quantity: number;
  unit: string;
  dimensions?: string;
  material?: string;
  specifications?: string;
  location?: string;
  notes?: string;
  customFields?: { [key: string]: any };
  createdAt: string;
  updatedAt: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`consommables-tabpanel-${index}`}
      aria-labelledby={`consommables-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ConsommablesPage() {
  const router = useRouter();

  const [tabValue, setTabValue] = useState(0);
  const [consommables, setConsommables] = useState<Consumable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [editingItem, setEditingItem] = useState<Consumable | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [customConsumableDialogOpen, setCustomConsumableDialogOpen] = useState(false);

  // État pour le formulaire d'ajout/édition
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    brand: '',
    model: '',
    supplier: '',
    quantity: 0,
    unit: 'pièce',
    dimensions: '',
    material: '',
    specifications: '',
    location: '',
    notes: '',
    customFields: {} as { [key: string]: any },
  });

  // Types de consommables courants en physique
  const consumableTypes = [
    'Câbles et connecteurs',
    'Résistances',
    'Condensateurs',
    'Diodes et LEDs',
    'Transistors',
    'Circuits intégrés',
    'Fusibles',
    'Piles et batteries',
    'Fils électriques',
    'Breadboards',
    'Capteurs',
    'Actuateurs',
    'Optique (lentilles, miroirs)',
    'Supports et fixations',
    'Matériel de mesure',
    'Consommables mécaniques',
    'Autre',
  ];

  // Unités courantes
  const commonUnits = ['pièce', 'mètre', 'cm', 'mm', 'kg', 'g', 'lot', 'boîte', 'rouleau'];

  // Gestion sécurisée du stockage de l'onglet
  const getStoredTabValue = (): number => {
    try {
      const stored = localStorage.getItem('consommables-tab');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  };

  const saveTabValue = (value: number): void => {
    try {
      localStorage.setItem('consommables-tab', value.toString());
    } catch {
      // Ignore si localStorage non disponible
    }
  };

  // Gestion des onglets
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    saveTabValue(newValue);
  };

  // Vérifie si un consommable est en stock faible (moins de 5 unités)
  const isLowStock = (quantity: number): boolean => {
    return quantity < 5;
  };

  // Gestion des spécifications personnalisées pour consommable en édition
  const handleAddCustomSpecToEditingItem = (spec: string, value: any) => {
    if (editingItem && spec) {
      const updatedItem = {
        ...editingItem,
        customFields: { ...(editingItem.customFields || {}), [spec]: value },
      };
      setEditingItem(updatedItem);
    }
  };

  const handleRemoveCustomSpecFromEditingItem = (spec: string) => {
    if (editingItem) {
      const customFields = { ...(editingItem.customFields || {}) };
      delete customFields[spec];
      const updatedItem = { ...editingItem, customFields };
      setEditingItem(updatedItem);
    }
  };

  // Change le mode d'affichage (cartes/liste)
  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('consommables-view', mode);
    } catch {
      // Ignore si localStorage non disponible
    }
  };

  // Réinitialise le formulaire pour ajout rapide
  const handleQuickAdd = () => {
    setFormData({
      name: '',
      type: '',
      brand: '',
      model: '',
      supplier: '',
      quantity: 0,
      unit: 'pièce',
      dimensions: '',
      material: '',
      specifications: '',
      location: '',
      notes: '',
      customFields: {},
    });
    setAddDialogOpen(true);
  };

  // Soumission du formulaire d'ajout, bascule vers l'inventaire si succès
  const handleSubmitWithTabSwitch = async () => {
    try {
      const response = await fetch('/api/physique/consommables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Erreur lors de l'ajout");

      setAddDialogOpen(false);
      await fetchConsommables();

      // Basculer vers l'onglet inventaire (index 1)
      setTabValue(1);
      saveTabValue(1);
    } catch (error) {
      console.error('Erreur ajout consommable:', error);
    }
  };

  // Gestion des spécifications personnalisées pour consommable personnalisé
  const handleAddCustomSpecToCustomConsumable = (spec: string, value: any) => {
    if (spec) {
      setFormData((prev) => ({
        ...prev,
        customFields: { ...(prev.customFields || {}), [spec]: value },
      }));
    }
  };

  const handleRemoveCustomSpecFromCustomConsumable = (spec: string) => {
    setFormData((prev) => {
      const customFields = { ...(prev.customFields || {}) };
      delete customFields[spec];
      return { ...prev, customFields };
    });
  };

  // Sauvegarde d'un consommable personnalisé
  const handleSaveCustomConsumable = async () => {
    try {
      const response = await fetch('/api/physique/consommables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

      setCustomConsumableDialogOpen(false);
      await fetchConsommables();
    } catch (error) {
      console.error('Erreur sauvegarde consommable personnalisé:', error);
    }
  };

  // Gestion de la navigation après ajout
  const handleFinishWithoutContinue = () => {
    setAddDialogOpen(false);
  };

  const handleContinueToInventory = () => {
    setAddDialogOpen(false);
    setTabValue(1);
    saveTabValue(1);
  };

  // Modification de la quantité d'un consommable
  const handleQuantityChangeWithConsumable = async (
    consumableId: number,
    newQuantity: number,
    unit: string,
  ) => {
    try {
      const response = await fetch(`/api/physique/consommables/${consumableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity, unit }),
      });

      if (!response.ok) throw new Error('Erreur lors de la modification');

      await fetchConsommables();
    } catch (error) {
      console.error('Erreur modification quantité:', error);
    }
  };

  // Mise à jour des spécifications
  const handleSpecificationsUpdate = async (consumableId: number, specifications: string) => {
    try {
      const response = await fetch(`/api/physique/consommables/${consumableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specifications }),
      });

      if (!response.ok) throw new Error('Erreur lors de la modification');

      await fetchConsommables();
    } catch (error) {
      console.error('Erreur modification spécifications:', error);
    }
  };

  // Mise à jour de la localisation
  const handleLocationUpdate = async (consumableId: number, location: string) => {
    try {
      const response = await fetch(`/api/physique/consommables/${consumableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });

      if (!response.ok) throw new Error('Erreur lors de la modification');

      await fetchConsommables();
    } catch (error) {
      console.error('Erreur modification localisation:', error);
    }
  };

  // Récupération des données
  const fetchConsommables = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/physique/consommables');
      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setConsommables(data.consommables || []);
    } catch (error) {
      setError('Erreur lors du chargement des consommables');
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage des consommables
  const filteredConsommables = consommables.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesLowStock = !showLowStock || isLowStock(item.quantity);

    return matchesSearch && matchesType && matchesLowStock;
  });

  // Statistiques pour le tableau de bord
  const lowStockCount = consommables.filter((c) => isLowStock(c.quantity)).length;
  const totalTypes = new Set(consommables.map((c) => c.type).filter(Boolean)).size;
  const totalBrands = new Set(consommables.map((c) => c.brand).filter(Boolean)).size;

  // Initialisation
  useEffect(() => {
    setTabValue(getStoredTabValue());
    fetchConsommables();

    // Récupérer le mode d'affichage stocké
    try {
      const storedView = localStorage.getItem('consommables-view');
      if (storedView) setViewMode(storedView as 'card' | 'list');
    } catch {
      // Ignore
    }
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box className="p-4">
      <Typography variant="h4" gutterBottom className="flex items-center gap-2">
        <ToolIcon />
        Consommables Physique
      </Typography>

      {/* Alertes de stock */}
      {lowStockCount > 0 && (
        <Box className="mb-4">
          <Alert severity="warning">
            <strong>{lowStockCount}</strong> consommable(s) en stock faible (moins de 5 unités)
          </Alert>
        </Box>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Ajout" />
          <Tab label="Inventaire" />
          <Tab label="Tableau de bord" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>
          Ajouter des consommables
        </Typography>
        <Box className="flex gap-2 mb-4">
          <Button variant="contained" onClick={handleQuickAdd} startIcon={<AddIcon />}>
            Ajout rapide
          </Button>
          <Button variant="outlined" onClick={() => setCustomConsumableDialogOpen(true)}>
            Consommable personnalisé
          </Button>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box className="mb-4 flex items-center gap-2 flex-wrap">
          <Box className="flex items-center gap-2">
            <SearchIcon className="text-gray-500" />
            <TextField
              size="small"
              placeholder="Rechercher par nom, type, marque..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              label="Type"
            >
              <MenuItem value="all">Tous</MenuItem>
              {consumableTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch checked={showLowStock} onChange={(e) => setShowLowStock(e.target.checked)} />
            }
            label="Stock faible"
          />

          <Box className="flex gap-1">
            <IconButton
              onClick={() => handleViewModeChange('card')}
              color={viewMode === 'card' ? 'primary' : 'default'}
            >
              <CardViewIcon />
            </IconButton>
            <IconButton
              onClick={() => handleViewModeChange('list')}
              color={viewMode === 'list' ? 'primary' : 'default'}
            >
              <ListViewIcon />
            </IconButton>
          </Box>
        </Box>

        {viewMode === 'card' ? (
          <Grid container spacing={2}>
            {filteredConsommables.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                <Card>
                  <CardContent>
                    <Box className="flex items-start justify-between mb-2">
                      <Typography variant="h6">{item.name}</Typography>
                      {isLowStock(item.quantity) && <WarningIcon color="warning" />}
                    </Box>

                    {item.type && <Chip label={item.type} size="small" className="mb-2" />}

                    {item.brand && (
                      <Typography color="text.secondary">Marque: {item.brand}</Typography>
                    )}

                    {item.model && (
                      <Typography color="text.secondary">Modèle: {item.model}</Typography>
                    )}

                    <Typography
                      color={isLowStock(item.quantity) ? 'warning.main' : 'text.secondary'}
                      className="font-semibold"
                    >
                      Quantité: {item.quantity} {item.unit}
                    </Typography>

                    {item.dimensions && (
                      <Typography color="text.secondary">Dimensions: {item.dimensions}</Typography>
                    )}

                    {item.material && (
                      <Typography color="text.secondary">Matériau: {item.material}</Typography>
                    )}

                    {item.location && (
                      <Typography color="text.secondary">Localisation: {item.location}</Typography>
                    )}

                    <Box className="mt-2 flex gap-1">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingItem(item);
                          setEditDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Marque</TableCell>
                  <TableCell>Modèle</TableCell>
                  <TableCell>Quantité</TableCell>
                  <TableCell>Localisation</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredConsommables.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box className="flex items-center gap-1">
                        {isLowStock(item.quantity) && (
                          <WarningIcon color="warning" fontSize="small" />
                        )}
                        {item.name}
                      </Box>
                    </TableCell>
                    <TableCell>{item.type || '-'}</TableCell>
                    <TableCell>{item.brand || '-'}</TableCell>
                    <TableCell>{item.model || '-'}</TableCell>
                    <TableCell>
                      <Typography
                        color={isLowStock(item.quantity) ? 'warning.main' : 'text.primary'}
                        className={isLowStock(item.quantity) ? 'font-semibold' : ''}
                      >
                        {item.quantity} {item.unit}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.location || '-'}</TableCell>
                    <TableCell>
                      <Box className="flex gap-1">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingItem(item);
                            setEditDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Tableau de bord
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main">
                  <Badge badgeContent={lowStockCount} color="warning">
                    Stock faible
                  </Badge>
                </Typography>
                <Typography variant="body2">Moins de 5 unités</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">Types de consommables</Typography>
                <Typography variant="h4" color="primary">
                  {totalTypes}
                </Typography>
                <Typography variant="body2">Catégories différentes</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">Marques</Typography>
                <Typography variant="h4" color="primary">
                  {totalBrands}
                </Typography>
                <Typography variant="body2">Fournisseurs différents</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6">Répartition par type</Typography>
                {consumableTypes.map((type) => {
                  const count = consommables.filter((c) => c.type === type).length;
                  return count > 0 ? (
                    <Box
                      key={type}
                      className="flex items-center justify-between mt-2 p-2 bg-gray-50 rounded"
                    >
                      <Typography>{type}</Typography>
                      <Typography variant="h6">{count}</Typography>
                    </Box>
                  ) : null;
                })}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Dialogues - À implémenter selon les besoins */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Ajouter un consommable</DialogTitle>
        <DialogContent>
          <Typography>Formulaire d'ajout à implémenter</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFinishWithoutContinue}>Annuler</Button>
          <Button onClick={handleContinueToInventory}>Continuer vers inventaire</Button>
          <Button variant="contained" onClick={handleSubmitWithTabSwitch}>
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Éditer le consommable</DialogTitle>
        <DialogContent>
          <Typography>Formulaire d'édition à implémenter</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Annuler</Button>
          <Button variant="contained">Sauvegarder</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={customConsumableDialogOpen}
        onClose={() => setCustomConsumableDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Consommable personnalisé</DialogTitle>
        <DialogContent>
          <Typography>Formulaire de consommable personnalisé à implémenter</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomConsumableDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveCustomConsumable}>
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
