// app/physique/chemicals/page.tsx

"use client"

import { useState, useEffect } from "react"
import {
  Container, Typography, Alert, CircularProgress, Box, Tabs, Tab, Paper
} from "@mui/material"
import { 
  Science, 
  Inventory, 
  Add 
} from "@mui/icons-material"
import { ChemicalsList } from "@/components/chemicals/chemicals-list"
import { ChemicalForm } from "@/components/chemicals/chemical-form"
import { Chemical } from "@/types/chemicals"

// Fonction helper pour gérer localStorage
const getStoredTabValue = (): number => {
  try {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('physicsChemicalsTabValue')
      if (savedTab !== null) {
        const parsedValue = parseInt(savedTab, 10)
        if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 1) {
          return parsedValue
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la lecture du localStorage:', error)
  }
  return 0
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

export default function PhysicsPage() {
  const [chemicals, setChemicals] = useState<Chemical[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(getStoredTabValue)

  const saveTabValue = (value: number): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('physicsTabValue', value.toString())
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde dans localStorage:', error)
    }
  }

  const fetchChemicals = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/physique/consumables")
      
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des produits chimiques de physique")
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
    saveTabValue(newValue);
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
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Science sx={{ fontSize: 40, color: 'primary.main' }} />
        <Typography variant="h3" component="h1">
          Inventaire des réactifs chimiques
        </Typography>
      </Box>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
                    Gestion des Produits Chimiques - Physique
      </Typography>
      
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="chemical tabs"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                fontWeight: 500,
              }
            }}
          >
            <Tab 
              label="Inventaire" 
              icon={<Inventory />} 
              iconPosition="start"
              id="chemical-tab-0" 
              aria-controls="chemical-tabpanel-0" 
            />
            <Tab 
              label="Ajouter un réactif" 
              icon={<Add />} 
              iconPosition="start"
              id="chemical-tab-1" 
              aria-controls="chemical-tabpanel-1" 
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <ChemicalsList chemicals={chemicals} onRefresh={fetchChemicals} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <ChemicalForm onSuccess={() => {
            fetchChemicals();
            // Ne pas changer de tab automatiquement pour respecter le choix de l'utilisateur
          }} />
        </TabPanel>
      </Paper>
    </Container>
  )
}