"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Container, Typography, Box, Card, CardContent, CardActions, Button,
  Grid, Avatar, Chip, Alert, Paper, Stack, IconButton, Badge,
  Tab, Tabs, List, ListItem, ListItemText, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, GlobalStyles,
  Select, MenuItem, Switch, FormControlLabel, ListItemIcon, Divider
} from "@mui/material"
import { 
  QrCodeScanner, CameraAlt, Close, CheckCircle, Error, Warning,
  FlashOn, FlashOff, Refresh, History, Add, Science, Inventory,
  PhotoCamera, Search
} from "@mui/icons-material"

import { ScanResult as ScanResultType, Chemical, Materiel } from "@/types/prisma"

interface ScanResult {
  id: string
  code: string
  type: "chemical" | "materiel"
  name: string
  quantity?: number
  location?: string
  status: "found" | "not_found" | "error"
  timestamp: Date
  details?: Chemical | Materiel
}

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
      id={`scanner-tabpanel-${index}`}
      aria-labelledby={`scanner-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

// Define mockProducts for testing purposes
const mockProducts: Record<string, { name: string }> = {
  "1234567890123": { name: "Produit A" },
  "9876543210987": { name: "Produit B" },
};

export default function ScannerPage() {
  const [tabValue, setTabValue] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [autoScan, setAutoScan] = useState(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      setCameraError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", // Caméra arrière
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
      setIsScanning(true)
    } catch (error) {
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.")
      console.error("Erreur caméra:", error)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      setStream(null)
    }
    setIsScanning(false)
  }

  const simulateScan = async (code: string) => {
    try {
      const response = await fetch(`/api/scanner?code=${encodeURIComponent(code)}`);
      if (response.ok) {
        const data = await response.json();
        const result: ScanResult = {
          id: Date.now().toString(),
          code,
          type: data.type,
          name: data.product.name,
          quantity: data.product.quantity,
          location: data.product.storage || data.product.location,
          status: "found",
          timestamp: new Date(),
          details: data.product
        };
        setScanHistory((prev: ScanResult[]) => [result, ...prev]);
        setSelectedResult(result);
        setOpenDialog(true);
        return result;
      } else {
        const result: ScanResult = {
          id: Date.now().toString(),
          code,
          type: "chemical",
          name: "Produit inconnu",
          status: "not_found",
          timestamp: new Date()
        };
        setScanHistory((prev: ScanResult[]) => [result, ...prev]);
        return result;
      }
    } catch (error) {
      console.error('Erreur lors du scan:', error);
    }
  };

  const handleManualCode = async (code: string) => {
    if (code.trim()) {
      await simulateScan(code.trim())
    }
  }

  const captureFrame = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext("2d")
      
      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        
        // Ici, on pourrait intégrer une vraie bibliothèque de détection de QR codes
        // Pour la démo, on simule une détection aléatoire
        if (Math.random() > 0.7) {
          console.warn("Simulation désactivée : aucune donnée mock disponible.");
        }
      }
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isScanning && autoScan) {
      interval = setInterval(captureFrame, 2000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isScanning, autoScan])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "found": return "success"
      case "not_found": return "error"
      case "error": return "warning"
      default: return "default"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "found": return <CheckCircle />
      case "not_found": return <Error />
      case "error": return <Warning />
      default: return <QrCodeScanner />
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            Scanner QR/Code-barres
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Identification rapide des produits chimiques et matériel
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant={isScanning ? "outlined" : "contained"}
            startIcon={isScanning ? <Close /> : <CameraAlt />}
            onClick={isScanning ? stopCamera : startCamera}
            color={isScanning ? "secondary" : "primary"}
          >
            {isScanning ? "Arrêter" : "Scanner"}
          </Button>
        </Stack>
      </Box>

      {cameraError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {cameraError}
        </Alert>
      )}

      {/* Statistiques rapides */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <QrCodeScanner />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="primary">
                    {scanHistory.length}
                  </Typography>
                  <Typography variant="body2">Scans total</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="success.main">
                    {scanHistory.filter(s => s.status === "found").length}
                  </Typography>
                  <Typography variant="body2">Produits trouvés</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <Error />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="error.main">
                    {scanHistory.filter(s => s.status === "not_found").length}
                  </Typography>
                  <Typography variant="body2">Non reconnus</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Science />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="info.main">
                    {scanHistory.filter(s => s.type === "chemical").length}
                  </Typography>
                  <Typography variant="body2">Produits chimiques</Typography>
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
            onChange={(_event: React.SyntheticEvent, newValue: number) => setTabValue(newValue)}
            sx={{ px: 2 }}
          >
            <Tab label="Scanner" />
            <Tab label="Historique" />
            <Tab label="Saisie manuelle" />
          </Tabs>
        </Box>

        {/* Tab 0: Scanner */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card>
                <CardContent>
                  <Box 
                    sx={{ 
                      position: 'relative',
                      width: '100%',
                      height: 400,
                      bgcolor: 'grey.900',
                      borderRadius: 2,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isScanning ? (
                      <>
                        <video
                          ref={videoRef}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          autoPlay
                          muted
                          playsInline
                        />
                        <canvas
                          ref={canvasRef}
                          style={{ display: 'none' }}
                        />
                        {/* Overlay de visée */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 200,
                            height: 200,
                            border: 2,
                            borderColor: 'primary.main',
                            borderRadius: 2,
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: -2,
                              left: -2,
                              right: -2,
                              bottom: -2,
                              border: 2,
                              borderColor: 'transparent',
                              borderTopColor: 'primary.main',
                              borderRightColor: 'primary.main',
                              borderRadius: 2,
                              animation: 'scan 2s linear infinite'
                            }
                          }}
                        />
                      </>
                    ) : (
                      <Box textAlign="center" color="white">
                        <QrCodeScanner sx={{ fontSize: 80, mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          Cliquez sur "Scanner" pour commencer
                        </Typography>
                        <Typography variant="body2" color="grey.400">
                          Pointez la caméra vers un QR code ou code-barres
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
                <CardActions>
                  <Stack direction="row" spacing={2} width="100%">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoScan}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoScan(e.target.checked)}
                          disabled={!isScanning}
                        />
                      }
                      label="Scan automatique"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={flashEnabled}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFlashEnabled(e.target.checked)}
                          disabled={!isScanning}
                        />
                      }
                      label="Flash"
                    />
                    {isScanning && (
                      <Button
                        variant="outlined"
                        onClick={captureFrame}
                        startIcon={<PhotoCamera />}
                      >
                        Capturer
                      </Button>
                    )}
                  </Stack>
                </CardActions>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Instructions
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CameraAlt />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Autoriser l'accès caméra"
                        secondary="Permettez l'utilisation de la caméra"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <QrCodeScanner />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Pointer vers le code"
                        secondary="Centrez le code dans le cadre"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Résultat automatique"
                        secondary="L'identification se fait en temps réel"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>

              {/* Derniers scans */}
              {scanHistory.length > 0 && (
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Derniers scans
                    </Typography>
                    <List dense>
                      {scanHistory.slice(0, 5).map((result) => (
                        <ListItem key={result.id} divider>
                          <ListItemIcon>
                            <Avatar 
                              sx={{ 
                                bgcolor: `${getStatusColor(result.status)}.main`,
                                width: 32, 
                                height: 32 
                              }}
                            >
                              {getStatusIcon(result.status)}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={result.name}
                            secondary={`${result.code} • ${result.timestamp.toLocaleTimeString()}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 1: Historique */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Historique des scans
          </Typography>
          {scanHistory.length === 0 ? (
            <Alert severity="info">
              Aucun scan effectué pour le moment
            </Alert>
          ) : (
            <List>
              {scanHistory.map((result) => (
                <ListItem 
                  key={result.id}
                  sx={{ 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1, 
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => {
                    setSelectedResult(result)
                    setOpenDialog(true)
                  }}
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: `${getStatusColor(result.status)}.main` }}>
                      {result.type === "chemical" ? <Science /> : <Inventory />}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">{result.name}</Typography>
                        <Chip 
                          label={result.status === "found" ? "Trouvé" : "Non trouvé"} 
                          color={getStatusColor(result.status) as any}
                          size="small" 
                        />
                        <Chip 
                          label={result.type === "chemical" ? "Chimique" : "Matériel"} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                    }
                    secondary={
                      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          📱 {result.code}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          🕒 {result.timestamp.toLocaleString()}
                        </Typography>
                        {result.location && (
                          <Typography variant="body2" color="text.secondary">
                            📍 {result.location}
                          </Typography>
                        )}
                        {result.quantity && (
                          <Typography variant="body2" color="text.secondary">
                            📊 Qté: {result.quantity}
                          </Typography>
                        )}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Tab 2: Saisie manuelle */}
        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Saisie manuelle d'un code
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Si le scanner ne fonctionne pas, vous pouvez saisir manuellement le code du produit.
              </Typography>
              
              <Box component="form" 
                onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                  e.preventDefault()
                  const formData = new FormData(e.target as HTMLFormElement)
                  const code = formData.get('code') as string
                  handleManualCode(code)
                }}
              >
                <TextField
                  name="code"
                  label="Code-barres ou QR code"
                  placeholder="Saisissez le code du produit"
                  fullWidth
                  margin="normal"
                  helperText="Exemple: 1234567890123"
                />
                <Box sx={{ mt: 2 }}>
                  <Button type="submit" variant="contained" startIcon={<Search />}>
                    Rechercher
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle1" gutterBottom>
                Codes de test disponibles :
              </Typography>
              <Stack spacing={1}>
                {Object.entries(mockProducts).map(([code, product]) => (
                  <Box key={code} display="flex" alignItems="center" gap={2}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleManualCode(code)}
                    >
                      {code}
                    </Button>
                    <Typography variant="body2">
                      {(product as { name: string }).name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>

      {/* Dialog détails du produit */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedResult ? `Détails - ${selectedResult.name}` : "Détails du produit"}
        </DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar sx={{ bgcolor: `${getStatusColor(selectedResult.status)}.main` }}>
                      {selectedResult.type === "chemical" ? <Science /> : <Inventory />}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{selectedResult.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Code: {selectedResult.code}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip 
                    label={selectedResult.status === "found" ? "Produit trouvé" : "Produit non trouvé"} 
                    color={getStatusColor(selectedResult.status) as any}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                
                {selectedResult.status === "found" && (
                  <>
                    {selectedResult.quantity && (
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="subtitle2">Quantité</Typography>
                        <Typography variant="body1">{selectedResult.quantity}</Typography>
                      </Grid>
                    )}
                    {selectedResult.location && (
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="subtitle2">Localisation</Typography>
                        <Typography variant="body1">{selectedResult.location}</Typography>
                      </Grid>
                    )}
                    {selectedResult.details && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2">Détails</Typography>
                        <Box sx={{ mt: 1 }}>
                          {Object.entries(selectedResult.details).map(([key, value]) => (
                            <Typography key={key} variant="body2">
                              <strong>{key}:</strong> {value as string}
                            </Typography>
                          ))}
                        </Box>
                      </Grid>
                    )}
                  </>
                )}
                
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2">Scanné le</Typography>
                  <Typography variant="body1">
                    {selectedResult.timestamp.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Fermer</Button>
          {selectedResult?.status === "found" && (
            <>
              <Button variant="outlined">Voir fiche</Button>
              <Button variant="contained">Utiliser</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <GlobalStyles
      styles={{
        '@keyframes scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        }
      }}
    />
    </Container>
  )
}
