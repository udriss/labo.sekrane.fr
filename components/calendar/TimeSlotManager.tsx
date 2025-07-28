// components/TimeSlotManager.tsx
import React, { useState } from 'react';
import {
  Box, IconButton, Button, Typography, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Chip
} from '@mui/material';
import { Delete, Edit, Add } from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { TimeSlot } from '@/types/calendar';
import dayjs, { Dayjs } from 'dayjs';

interface TimeSlotManagerProps {
  timeSlots: TimeSlot[];
  onChange: (updates: any[]) => void;
  readOnly?: boolean;
}

export const TimeSlotManager: React.FC<TimeSlotManagerProps> = ({ 
  timeSlots, 
  onChange, 
  readOnly = false 
}) => {
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [newSlot, setNewSlot] = useState<{
    date: Dayjs;
    startTime: Dayjs;
    endTime: Dayjs;
  }>({
    date: dayjs(),
    startTime: dayjs(),
    endTime: dayjs().add(1, 'hour')
  });
  const [showAddDialog, setShowAddDialog] = useState(false);

  const activeSlots = timeSlots.filter(slot => slot.status === 'active');

  const handleDeleteSlot = (slotId: string) => {
    onChange([{
      action: 'delete',
      timeSlot: { id: slotId }
    }]);
  };

  const handleEditSlot = (slot: TimeSlot) => {
    setEditingSlot(slot);
  };

  const handleSaveEdit = () => {
    if (!editingSlot) return;

    onChange([{
      action: 'update',
      timeSlot: editingSlot
    }]);
    setEditingSlot(null);
  };

  const handleAddSlot = () => {
    const startDateTime = newSlot.date
      .hour(newSlot.startTime.hour())
      .minute(newSlot.startTime.minute());
    
    const endDateTime = newSlot.date
      .hour(newSlot.endTime.hour())
      .minute(newSlot.endTime.minute());

    onChange([{
      action: 'add',
      timeSlot: {
        date: newSlot.date.format('YYYY-MM-DD'),
        startTime: startDateTime.format('HH:mm'),
        endTime: endDateTime.format('HH:mm')
      }
    }]);

    setShowAddDialog(false);
    setNewSlot({
      date: dayjs(),
      startTime: dayjs(),
      endTime: dayjs().add(1, 'hour')
    });
  };

  const formatTimeSlot = (slot: TimeSlot) => {
    const start = dayjs(slot.startDate);
    const end = dayjs(slot.endDate);
    return `${start.format('DD/MM/YYYY')} - ${start.format('HH:mm')} à ${end.format('HH:mm')}`;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1">Créneaux horaires</Typography>
        {!readOnly && (
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => setShowAddDialog(true)}
          >
            Ajouter un créneau
          </Button>
        )}
      </Box>

      <List>
        {activeSlots.map((slot) => (
          <ListItem 
            key={slot.id}
            secondaryAction={
              !readOnly && (
                <>
                  <IconButton 
                    edge="end" 
                    onClick={() => handleEditSlot(slot)}
                    sx={{ mr: 1 }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDeleteSlot(slot.id)}
                  >
                    <Delete />
                  </IconButton>
                </>
              )
            }
          >
            <ListItemText
              primary={formatTimeSlot(slot)}
              secondary={`ID: ${slot.id}`}
            />
          </ListItem>
        ))}
      </List>

      {/* Dialog pour ajouter un créneau */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)}>
        <DialogTitle>Ajouter un créneau</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <DatePicker
                label="Date"
                value={newSlot.date.toDate()}
                onChange={(newValue) => {
                  if (newValue) {
                    setNewSlot({ ...newSlot, date: dayjs(newValue) });
                  }
                }}
                format="DD/MM/YYYY"
                slotProps={{
                textField: { 
                  size: "small",
                  sx: { 
                    minWidth: { xs: '100%', sm: 120 },
                    transition: 'all 0.3s ease'
                  },
                  onClick: (e: any) => {
                    if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                      const button = e.currentTarget.querySelector('button')
                      if (button) button.click()
                    }
                  }
                }
              }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TimePicker
                label="Heure de début"
                value={newSlot.startTime.toDate()}
                onChange={(newValue) => {
                  if (newValue) {
                    setNewSlot({ ...newSlot, startTime: dayjs(newValue) });
                  }
                }}
                format="HH:mm"
                slotProps={{
                textField: { 
                  size: "small",
                  sx: { 
                    minWidth: { xs: '100%', sm: 120 },
                    transition: 'all 0.3s ease'
                  },
                  onClick: (e: any) => {
                    if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                      const button = e.currentTarget.querySelector('button')
                      if (button) button.click()
                    }
                  }
                }
              }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TimePicker
                label="Heure de fin"
                value={newSlot.endTime.toDate()}
                onChange={(newValue) => {
                  if (newValue) {
                    setNewSlot({ ...newSlot, endTime: dayjs(newValue) });
                  }
                }}
                format="HH:mm"
                slotProps={{
                textField: { 
                  size: "small",
                  sx: { 
                    minWidth: { xs: '100%', sm: 120 },
                    transition: 'all 0.3s ease'
                  },
                  onClick: (e: any) => {
                    if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                      const button = e.currentTarget.querySelector('button')
                      if (button) button.click()
                    }
                  }
                }
              }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Annuler</Button>
          <Button onClick={handleAddSlot} variant="contained">Ajouter</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour éditer un créneau */}
      {editingSlot && (
        <Dialog open={!!editingSlot} onClose={() => setEditingSlot(null)}>
          <DialogTitle>Modifier le créneau</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <DatePicker
                  label="Date"
                  value={new Date(editingSlot.startDate)}
                  onChange={(newValue) => {
                    if (newValue) {
                      const startDayjs = dayjs(editingSlot.startDate);
                      const endDayjs = dayjs(editingSlot.endDate);
                      const newDateDayjs = dayjs(newValue);
                      
                      const newStart = startDayjs
                        .year(newDateDayjs.year())
                        .month(newDateDayjs.month())
                        .date(newDateDayjs.date());
                      
                      const newEnd = endDayjs
                        .year(newDateDayjs.year())
                        .month(newDateDayjs.month())
                        .date(newDateDayjs.date());
                      
                      setEditingSlot({
                        ...editingSlot,
                        startDate: newStart.toISOString(),
                        endDate: newEnd.toISOString()
                      });
                    }
                  }}
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TimePicker
                  label="Heure de début"
                  value={new Date(editingSlot.startDate)}
                  onChange={(newValue) => {
                    if (newValue) {
                      const currentStart = dayjs(editingSlot.startDate);
                      const newStartDayjs = dayjs(newValue);
                      const updatedStart = currentStart
                        .hour(newStartDayjs.hour())
                        .minute(newStartDayjs.minute());
                      
                      setEditingSlot({
                        ...editingSlot,
                        startDate: updatedStart.toISOString()
                      });
                    }
                  }}
                  format="HH:mm"
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TimePicker
                  label="Heure de fin"
                  value={new Date(editingSlot.endDate)}
                  onChange={(newValue) => {
                    if (newValue) {
                      const currentEnd = dayjs(editingSlot.endDate);
                      const newEndDayjs = dayjs(newValue);
                      const updatedEnd = currentEnd
                        .hour(newEndDayjs.hour())
                        .minute(newEndDayjs.minute());
                      
                      setEditingSlot({
                        ...editingSlot,
                        endDate: updatedEnd.toISOString()
                      });
                    }
                  }}
                  format="HH:mm"
                slotProps={{
                textField: { 
                  size: "small",
                  sx: { 
                    minWidth: { xs: '100%', sm: 120 },
                    transition: 'all 0.3s ease'
                  },
                  onClick: (e: any) => {
                    if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                      const button = e.currentTarget.querySelector('button')
                      if (button) button.click()
                    }
                  }
                }
              }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingSlot(null)}>Annuler</Button>
            <Button onClick={handleSaveEdit} variant="contained">Enregistrer</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};