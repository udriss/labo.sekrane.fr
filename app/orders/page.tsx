"use client"

import { useState, useEffect } from "react"
import { 
  Container, Typography, Box, Card, CardContent, CardActions, Button,
  Grid, Avatar, Chip, Alert, Paper, Stack, IconButton, Badge,
  Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Autocomplete, List, ListItem, ListItemText,
  LinearProgress, Fab
} from "@mui/material"
import { 
  ShoppingCart, Add, Visibility, Edit, Delete, Send, Check,
  LocalShipping, Cancel, AttachMoney, Business, CalendarToday,
  FilterList, Download, Print
} from "@mui/icons-material"
import Link from "next/link"

import { OrderWithRelations } from "@/types/prisma"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`orders-tabpanel-${index}`}
      aria-labelledby={`orders-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const ORDER_STATUS = {
  DRAFT: { label: "Brouillon", color: "default" as const },
  SENT: { label: "Envoyée", color: "info" as const },
  CONFIRMED: { label: "Confirmée", color: "primary" as const },
  RECEIVED: { label: "Reçue", color: "success" as const },
  CANCELLED: { label: "Annulée", color: "error" as const }
}

export default function OrdersPage() {
  const [tabValue, setTabValue] = useState(0)
  const [orders, setOrders] = useState<OrderWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null)

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des commandes');
      }
      const ordersData = await response.json();
      setOrders(ordersData);
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [])

  const handleViewOrder = (order: OrderWithRelations) => {
    setSelectedOrder(order)
    setOpenDialog(true)
  }

  const getStatusChip = (status: string) => {
    const statusInfo = ORDER_STATUS[status as keyof typeof ORDER_STATUS]
    return <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
  }

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "-"
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('fr-FR')
  }

  const formatPrice = (price?: number | null) => {
    if (!price) return "-"
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(price)
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            Gestion des Commandes
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Suivi des achats et gestion des fournisseurs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          size="large"
          onClick={() => setOpenDialog(true)}
        >
          Nouvelle commande
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistiques rapides */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <ShoppingCart />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="primary">
                    {orders.length}
                  </Typography>
                  <Typography variant="body2">Total commandes</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Send />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {orders.filter(o => o.status === 'SENT').length}
                  </Typography>
                  <Typography variant="body2">En attente</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <Check />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="success.main">
                    {orders.filter(o => o.status === 'RECEIVED').length}
                  </Typography>
                  <Typography variant="body2">Reçues</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <AttachMoney />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="info.main">
                    {formatPrice(orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
                  </Typography>
                  <Typography variant="body2">Montant total</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ px: 2 }}
          >
            <Tab label="Toutes les commandes" />
            <Tab label="En cours" />
            <Tab label="Fournisseurs" />
          </Tabs>
        </Box>

        {/* Tab 0: Toutes les commandes */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>N° Commande</TableCell>
                  <TableCell>Fournisseur</TableCell>
                  <TableCell>Demandeur</TableCell>
                  <TableCell>Date commande</TableCell>
                  <TableCell>Livraison prévue</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {order.orderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{order.supplier.name}</Typography>
                        {order.supplier.email && (
                          <Typography variant="caption" color="text.secondary">
                            {order.supplier.email}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{order.user.name}</TableCell>
                    <TableCell>{formatDate(order.orderDate)}</TableCell>
                    <TableCell>{formatDate(order.deliveryDate)}</TableCell>
                    <TableCell>{formatPrice(order.totalAmount)}</TableCell>
                    <TableCell>{getStatusChip(order.status)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewOrder(order)}
                          title="Voir détails"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton size="small" title="Modifier">
                          <Edit />
                        </IconButton>
                        <IconButton size="small" title="Imprimer">
                          <Print />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 1: Commandes en cours */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Commandes en cours de traitement
          </Typography>
          <Grid container spacing={2}>
            {orders.filter(o => ['SENT', 'CONFIRMED'].includes(o.status)).map((order) => (
              <Grid size={{ xs:12, sm:6, lg:4 }} key={order.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Typography variant="h6">{order.orderNumber}</Typography>
                      {getStatusChip(order.status)}
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {order.supplier.name}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Demandeur: {order.user.name}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatPrice(order.totalAmount)}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => handleViewOrder(order)}>
                      Voir détails
                    </Button>
                    <Button size="small" color="primary">
                      Suivre
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Tab 2: Fournisseurs */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Fournisseurs partenaires
          </Typography>
          <Grid container spacing={2}>
            {Array.from(new Set(orders.map(o => o.supplier.name))).map((supplierName) => {
              const supplier = orders.find(o => o.supplier.name === supplierName)?.supplier
              const supplierOrders = orders.filter(o => o.supplier.name === supplierName)
              return (
                <Grid size={{ xs:12, sm:6, lg:4 }} key={supplierName}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          <Business />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">{supplierName}</Typography>
                          {supplier?.email && (
                            <Typography variant="body2" color="text.secondary">
                              {supplier.email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Typography variant="body2" gutterBottom>
                        {supplierOrders.length} commande(s)
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {formatPrice(supplierOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small">Voir commandes</Button>
                      <Button size="small">Contact</Button>
                    </CardActions>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Dialog détails commande */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedOrder ? `Détails - ${selectedOrder.orderNumber}` : "Nouvelle commande"}
        </DialogTitle>
        <DialogContent>
          {selectedOrder ? (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs:6 }}>
                  <Typography variant="subtitle2">Fournisseur</Typography>
                  <Typography variant="body1">{selectedOrder.supplier.name}</Typography>
                </Grid>
                <Grid size={{ xs:6 }}>
                  <Typography variant="subtitle2">Statut</Typography>
                  {getStatusChip(selectedOrder.status)}
                </Grid>
                <Grid size={{ xs:6 }}>
                  <Typography variant="subtitle2">Date commande</Typography>
                  <Typography variant="body1">{formatDate(selectedOrder.orderDate)}</Typography>
                </Grid>
                <Grid size={{ xs:6 }}>
                  <Typography variant="subtitle2">Livraison prévue</Typography>
                  <Typography variant="body1">{formatDate(selectedOrder.deliveryDate)}</Typography>
                </Grid>
              </Grid>
              
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>Articles commandés</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Article</TableCell>
                          <TableCell align="right">Quantité</TableCell>
                          <TableCell align="right">Prix unitaire</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedOrder.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.chemical?.name || item.materiel?.name}
                            </TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">{formatPrice(item.unitPrice)}</TableCell>
                            <TableCell align="right">{formatPrice(item.totalPrice)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} sx={{ fontWeight: 'bold' }}>Total</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatPrice(selectedOrder.totalAmount)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              <Typography>Formulaire de nouvelle commande</Typography>
              {/* Formulaire à implémenter */}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Fermer</Button>
          {selectedOrder && (
            <>
              <Button variant="outlined">Modifier</Button>
              <Button variant="contained">Actions</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  )
}
