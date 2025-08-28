'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add, Warning, Science } from '@mui/icons-material';
import { GhsIcon } from '@/components/chemicals/ghs-icons';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface Equipement {
  id: number;
  name: string;
  category?: string | null;
  location?: string | null;
  quantity: number;
}

interface Reactif {
  id: number;
  name: string;
  casNumber?: string | null;
  hazard?: string | null;
  stock: number;
  location?: string | null;
}

export default function ChimiePage() {
  const [tabValue, setTabValue] = useState(0);
  const [equipement, setEquipment] = useState<Equipement[]>([]);
  const [chemicals, setChemicals] = useState<Reactif[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/equipement?discipline=chimie');
      const data = await response.json();
      setEquipment(data.equipement || []);
    } catch (error) {
      console.error('Failed to fetch equipement:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChemicals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chemicals');
      const data = await response.json();
      setChemicals(data.reactifs || []);
    } catch (error) {
      console.error('Failed to fetch chemicals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) fetchEquipment();
    if (tabValue === 1) fetchChemicals();
  }, [tabValue]);

  const filteredEquipment = equipement.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredChemicals = chemicals.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.casNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Container maxWidth="lg">
      <Box className="flex items-center gap-3 mb-6">
        <Science fontSize="large" color="primary" />
        <Typography variant="h3" component="h1">
          Laboratoire de Chimie
        </Typography>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Équipements" />
            <Tab label="Produits Chimiques" />
          </Tabs>
        </Box>

        <CardContent>
          <Box className="flex justify-between items-center mb-4">
            <TextField
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ width: 300 }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                /* TODO: Open create dialog */
              }}
            >
              Ajouter
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={34} />
            </Box>
          ) : (
            <>
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  {filteredEquipment.map((item) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {item.name}
                          </Typography>
                          {item.category && (
                            <Chip label={item.category} size="small" sx={{ mb: 1 }} />
                          )}
                          <Typography color="text.secondary" gutterBottom>
                            Quantité : {item.quantity}
                          </Typography>
                          {item.location && (
                            <Typography variant="body2">📍 {item.location}</Typography>
                          )}
                          {item.quantity <= 5 && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                              <Warning fontSize="small" /> Stock bas
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={3}>
                  {filteredChemicals.map((item) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {item.name}
                          </Typography>
                          {item.casNumber && (
                            <Typography variant="body2" color="text.secondary">
                              CAS: {item.casNumber}
                            </Typography>
                          )}
                          {item.hazard && (
                            <Chip
                              label={item.hazard}
                              color="error"
                              size="small"
                              icon={<GhsIcon hazard={item.hazard} fontSize="small" />}
                              sx={{ mt: 1, mb: 1 }}
                            />
                          )}
                          <Typography color="text.secondary" gutterBottom>
                            Stock: {item.stock}
                          </Typography>
                          {item.location && (
                            <Typography variant="body2">📍 {item.location}</Typography>
                          )}
                          {item.stock <= 10 && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                              <Warning fontSize="small" /> Stock bas
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </TabPanel>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
