"use client"

import { useState, useEffect } from "react"
import { 
  Box, Typography, Button, Paper, Stack, IconButton, Alert, 
  Tabs, Tab, Accordion, AccordionSummary, AccordionDetails,
  Chip, Card, CardContent, CardActions, Fab
} from "@mui/material"
import { 
  Add, Edit, Delete, ExpandMore, Science, School, 
  Timer, TrendingUp, Assignment
} from "@mui/icons-material"
import { SECTION_LEVELS } from "@/lib/constants/education-levels"

interface NotebookEntry {
  id: string
  title: string
  content?: string
  description?: string
  sections?: string[]
  materials?: any[]
  chemicals?: any[]
  estimatedDuration?: number
  difficulty?: string
  createdAt: string
  updatedAt?: string
  protocols?: any[]
  status?: string
}

interface NotebookListProps {
  discipline?: 'chimie' | 'physique' | 'general'
  onEdit: (entry: NotebookEntry) => void
  onAdd: () => void
}

export function NotebookList({ discipline = 'general', onEdit, onAdd }: NotebookListProps) {
  const [entries, setEntries] = useState<NotebookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  const loadEntries = async () => {
    try {
      setLoading(true)
      const url = discipline !== 'general' 
        ? `/api/notebook?discipline=${discipline}` 
        : "/api/notebook"
      const response = await fetch(url)
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      setEntries(data.notebooks || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) return
    
    try {
      const response = await fetch(`/api/notebook?id=${id}`, { method: "DELETE" })
      if (response.ok) {
        await loadEntries()
      } else {
        setError("Erreur lors de la suppression")
      }
    } catch (error) {
      setError("Erreur lors de la suppression")
    }
  }

  const organizeEntriesBySection = () => {
    const organized: { [key: string]: NotebookEntry[] } = {}
    
    entries.forEach(entry => {
      if (entry.sections && entry.sections.length > 0) {
        entry.sections.forEach(section => {
          if (!organized[section]) organized[section] = []
          organized[section].push(entry)
        })
      } else {
        if (!organized['sans-section']) organized['sans-section'] = []
        organized['sans-section'].push(entry)
      }
    })
    
    return organized
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'facile': return 'success'
      case 'moyen': return 'warning'
      case 'difficile': return 'error'
      default: return 'default'
    }
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Non spécifié'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`
  }

  // Helper function to get content safely
  const getEntryContent = (entry: NotebookEntry) => {
    return entry.content || entry.description || ''
  }

  if (loading) return <Typography>Chargement...</Typography>
  if (error) return <Alert severity="error">{error}</Alert>

  const organizedEntries = organizeEntriesBySection()

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">TPs et Protocoles</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAdd}
        >
          Nouveau TP
        </Button>
      </Stack>

      <Tabs 
        value={activeTab} 
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Par sections" />
        <Tab label="Chronologique" />
        <Tab label="Statistiques" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {/* Organisation par sections */}
          {SECTION_LEVELS.map(level => {
            const sectionEntries = organizedEntries[level.id] || []
            
            return (
              <Accordion key={level.id} defaultExpanded={sectionEntries.length > 0}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <School color="primary" />
                    <Typography variant="h6">{level.label}</Typography>
                    <Chip 
                      label={`${sectionEntries.length} TP${sectionEntries.length > 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {sectionEntries.length === 0 ? (
                    <Typography color="text.secondary">Aucun TP pour cette section</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {sectionEntries.map(entry => (
                        <Card key={entry.id} sx={{ minWidth: 300, maxWidth: 400 }}>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                {entry.title}
                              </Typography>
                              {entry.difficulty && (
                                <Chip 
                                  label={entry.difficulty}
                                  size="small"
                                  color={getDifficultyColor(entry.difficulty)}
                                />
                              )}
                            </Stack>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {getEntryContent(entry).substring(0, 120)}
                              {getEntryContent(entry).length > 120 && "..."}
                            </Typography>

                            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                              {entry.estimatedDuration && (
                                <Chip 
                                  icon={<Timer />}
                                  label={formatDuration(entry.estimatedDuration)}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Stack>

                            {(entry.materials || entry.chemicals) && (
                              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                {entry.materials && entry.materials.length > 0 && (
                                  <Chip 
                                    icon={<Science />}
                                    label={`${entry.materials.length} matériel${entry.materials.length > 1 ? 's' : ''}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                {entry.chemicals && entry.chemicals.length > 0 && (
                                  <Chip 
                                    label={`${entry.chemicals.length} réactif${entry.chemicals.length > 1 ? 's' : ''}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                            )}

                            <Typography variant="caption" color="text.secondary">
                              Créé le {new Date(entry.createdAt).toLocaleDateString()}
                            </Typography>
                          </CardContent>
                          
                          <CardActions>
                            <IconButton onClick={() => onEdit(entry)} color="primary" size="small">
                              <Edit />
                            </IconButton>
                            <IconButton onClick={() => handleDelete(entry.id)} color="error" size="small">
                              <Delete />
                            </IconButton>
                          </CardActions>
                        </Card>
                      ))}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            )
          })}

          {/* Section sans catégorie */}
          {organizedEntries['sans-section'] && organizedEntries['sans-section'].length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Assignment color="action" />
                  <Typography variant="h6">Sans section</Typography>
                  <Chip 
                    label={`${organizedEntries['sans-section'].length} TP${organizedEntries['sans-section'].length > 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {organizedEntries['sans-section'].map(entry => (
                    <Card key={entry.id} sx={{ minWidth: 300, maxWidth: 400 }}>
                      <CardContent>
                        <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                          {entry.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {getEntryContent(entry).substring(0, 120)}
                          {getEntryContent(entry).length > 120 && "..."}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Créé le {new Date(entry.createdAt).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <IconButton onClick={() => onEdit(entry)} color="primary" size="small">
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(entry.id)} color="error" size="small">
                          <Delete />
                        </IconButton>
                      </CardActions>
                    </Card>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {/* Vue chronologique */}
          <Stack spacing={2}>
            {entries.map(entry => (
              <Paper key={entry.id} sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Typography variant="h6">{entry.title}</Typography>
                  <Stack direction="row" spacing={1}>
                    {entry.difficulty && (
                      <Chip 
                        label={entry.difficulty}
                        size="small"
                        color={getDifficultyColor(entry.difficulty)}
                      />
                    )}
                    <IconButton onClick={() => onEdit(entry)} color="primary" size="small">
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(entry.id)} color="error" size="small">
                      <Delete />
                    </IconButton>
                  </Stack>
                </Stack>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {getEntryContent(entry).substring(0, 200)}
                  {getEntryContent(entry).length > 200 && "..."}
                </Typography>
                
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  {entry.sections?.map(section => {
                    const sectionInfo = SECTION_LEVELS.find(s => s.id === section)
                    return (
                      <Chip 
                        key={section}
                        label={sectionInfo?.label || section}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )
                  })}
                </Stack>
                
                <Typography variant="caption" color="text.secondary">
                  Créé le {new Date(entry.createdAt).toLocaleDateString()} • 
                  Modifié le {new Date(entry.updatedAt || entry.createdAt).toLocaleDateString()}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {/* Statistiques */}
          <Stack spacing={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Statistiques générales</Typography>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="h3" color="primary">{entries.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Total TPs</Typography>
                </Box>
                <Box>
                  <Typography variant="h3" color="success.main">
                    {entries.filter(e => e.status === 'COMPLETED').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Terminés</Typography>
                </Box>
                <Box>
                  <Typography variant="h3" color="warning.main">
                    {entries.filter(e => e.status === 'IN_PROGRESS').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">En cours</Typography>
                </Box>
              </Stack>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Répartition par section</Typography>
              <Stack spacing={2}>
                {SECTION_LEVELS.map(level => {
                  const count = organizedEntries[level.id]?.length || 0
                  const percentage = entries.length > 0 ? (count / entries.length * 100).toFixed(1) : 0
                  
                  return (
                    <Stack key={level.id} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography>{level.label}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          {count} TPs ({percentage}%)
                        </Typography>
                        <Chip label={count} size="small" />
                      </Stack>
                    </Stack>
                  )
                })}
              </Stack>
            </Paper>
          </Stack>
        </Box>
      )}

      <Fab
        color="primary"
        aria-label="add"
        onClick={onAdd}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <Add />
      </Fab>
    </Box>
  )
}