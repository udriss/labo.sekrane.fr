"use client"

import { useState, useEffect } from "react"
import {
  Container, Typography, Alert, CircularProgress, Box, Tabs, Tab, Paper
} from "@mui/material"
import { ChemicalsList } from "@/components/chemicals/chemicals-list"
import { ChemicalForm } from "@/components/chemicals/chemical-form"
import { Chemical } from "@/types/prisma"

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
      id={`chemical-tabpanel-${index}`}
      aria-labelledby={`chemical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ChemicalsPage() {
  const [chemicals, setChemicals] = useState<Chemical[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)

  const fetchChemicals = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/chemicals")
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des produits chimiques")
      }
      
      const { chemicals: data } = await response.json();
      if (Array.isArray(data)) {
        setChemicals(data);
      } else {
        throw new Error("Les données retournées ne sont pas un tableau valide");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChemicals()
  }, [])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        🧪 Inventaire Chimique
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Gestion des produits chimiques du laboratoire
      </Typography>
      
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="chemical tabs">
            <Tab label="📋 Inventaire" id="chemical-tab-0" aria-controls="chemical-tabpanel-0" />
            <Tab label="➕ Ajouter un réactif" id="chemical-tab-1" aria-controls="chemical-tabpanel-1" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <ChemicalsList chemicals={chemicals} onRefresh={fetchChemicals} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <ChemicalForm onSuccess={() => {
            fetchChemicals();
            setTabValue(0); // Retourner à l'onglet inventaire après ajout
          }} />
        </TabPanel>
      </Paper>
    </Container>
  )
}
