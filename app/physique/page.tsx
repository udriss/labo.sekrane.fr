"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Badge,
  Alert
} from "@mui/material"
import {
  Add,
  Inventory,
  Science,
  Category
} from "@mui/icons-material"

// Composants similaires à ceux de chimie mais adaptés pour la physique
import PhysicsConsumableAddTab from "@/components/physics/physics-consumable-add-tab"
import PhysicsConsumableInventoryTab from "@/components/physics/physics-consumable-inventory-tab"
import PhysicsEquipmentAddTab from "@/components/physics/physics-equipment-add-tab"
import PhysicsEquipmentInventoryTab from "@/components/physics/physics-equipment-inventory-tab"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`physics-tabpanel-${index}`}
      aria-labelledby={`physics-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  )
}

export default function PhysicsPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [consumableStats, setConsumableStats] = useState({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0
  })
  const [equipmentStats, setEquipmentStats] = useState({
    total: 0,
    available: 0,
    maintenance: 0,
    outOfOrder: 0
  })
  const [error, setError] = useState<string | null>(null)

  // Charger les statistiques
  const loadStats = async () => {
    try {
      const [consumablesRes, equipmentRes] = await Promise.all([
        fetch('/api/physics/consumables'),
        fetch('/api/physics/equipment')
      ])

      if (consumablesRes.ok) {
        const consumablesData = await consumablesRes.json()
        setConsumableStats(consumablesData.stats || {})
      }

      if (equipmentRes.ok) {
        const equipmentData = await equipmentRes.json()
        setEquipmentStats(equipmentData.stats || {})
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error)
      setError('Erreur lors du chargement des statistiques')
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
    setError(null)
  }

  // Gérer le changement d'onglet après ajout
  const handleConsumableAdded = () => {
    loadStats()
    setActiveTab(1) // Basculer vers l'inventaire des consommables
  }

  const handleEquipmentAdded = () => {
    loadStats()
    setActiveTab(3) // Basculer vers l'inventaire des équipements
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestion Physique
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestion des consommables et équipements de laboratoire de physique
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 72,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500
              }
            }}
          >
            <Tab
              icon={<Add />}
              label="Ajouter Consommable"
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              icon={
                <Badge 
                  badgeContent={consumableStats.lowStock || 0} 
                  color="warning"
                  invisible={!consumableStats.lowStock}
                >
                  <Inventory />
                </Badge>
              }
              label={`Inventaire Consommables (${consumableStats.total || 0})`}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              icon={<Science />}
              label="Ajouter Équipement"
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab
              icon={
                <Badge 
                  badgeContent={equipmentStats.maintenance || 0} 
                  color="error"
                  invisible={!equipmentStats.maintenance}
                >
                  <Category />
                </Badge>
              }
              label={`Inventaire Équipements (${equipmentStats.total || 0})`}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <PhysicsConsumableAddTab onConsumableAdded={handleConsumableAdded} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <PhysicsConsumableInventoryTab onStatsUpdate={loadStats} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <PhysicsEquipmentAddTab onEquipmentAdded={handleEquipmentAdded} />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <PhysicsEquipmentInventoryTab onStatsUpdate={loadStats} />
        </TabPanel>
      </Paper>
    </Container>
  )
}
