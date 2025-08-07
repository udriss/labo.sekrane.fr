// Composant d'édition de créneau individuel
// Fichier : components/timeslots/TimeslotEditor.tsx

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Save, X, Clock, FileText, Calendar } from 'lucide-react'
import { TimeslotProposal, TimeslotEditorProps } from '@/types/timeslots'

export function TimeslotEditor({
  eventId,
  discipline,
  initialData,
  onSave,
  onCancel,
  mode = 'create'
}: TimeslotEditorProps) {
  const [formData, setFormData] = useState<Partial<TimeslotProposal>>({
    event_id: eventId,
    discipline: discipline,
    user_id: '', // Sera rempli par le composant parent
    start_date: '',
    end_date: '',
    timeslot_date: '',
    notes: '',
    action: mode === 'create' ? 'create' : 'modify',
    ...initialData
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)

  // Validation du formulaire
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    // Vérifier les champs obligatoires
    if (!formData.start_date) {
      newErrors.start_date = 'Heure de début requise'
    }

    if (!formData.end_date) {
      newErrors.end_date = 'Heure de fin requise'
    }

    if (!formData.timeslot_date) {
      newErrors.timeslot_date = 'Date requise'
    }

    // Vérifier que l'heure de fin est après l'heure de début
    if (formData.start_date && formData.end_date) {
      const startTime = new Date(formData.start_date)
      const endTime = new Date(formData.end_date)
      
      if (startTime >= endTime) {
        newErrors.end_date = 'L\'heure de fin doit être après l\'heure de début'
      }
    }

    // Vérifier que la date n'est pas dans le passé
    if (formData.timeslot_date) {
      const slotDate = new Date(formData.timeslot_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (slotDate < today) {
        newErrors.timeslot_date = 'La date ne peut pas être dans le passé'
      }
    }

    setErrors(newErrors)
    setIsValid(Object.keys(newErrors).length === 0)
  }, [formData])

  // Mettre à jour les dates/heures automatiquement
  const updateDateTime = (date: string, startTime: string, endTime: string) => {
    if (date && startTime) {
      const startDateTime = `${date}T${startTime}`
      setFormData(prev => ({ ...prev, start_date: startDateTime }))
    }
    
    if (date && endTime) {
      const endDateTime = `${date}T${endTime}`
      setFormData(prev => ({ ...prev, end_date: endDateTime }))
    }
  }

  // Extraire la date et les heures des datetime
  const getDateTimeComponents = () => {
    const date = formData.timeslot_date || formData.start_date?.split('T')[0] || ''
    const startTime = formData.start_date ? format(new Date(formData.start_date), 'HH:mm') : ''
    const endTime = formData.end_date ? format(new Date(formData.end_date), 'HH:mm') : ''
    
    return { date, startTime, endTime }
  }

  const { date, startTime, endTime } = getDateTimeComponents()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValid) {
      return
    }

    // Créer la proposition finale
    const proposal: TimeslotProposal = {
      ...formData,
      event_id: eventId,
      discipline: discipline,
      action: formData.action || (mode === 'create' ? 'create' : 'modify')
    } as TimeslotProposal

    onSave(proposal)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {mode === 'create' ? 'Nouveau créneau' : 'Modifier le créneau'}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Annuler
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className={`px-3 py-1 rounded flex items-center gap-1 ${
              isValid 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="h-4 w-4" />
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Date du créneau */}
      <div className="space-y-2">
        <label className="block text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Date du créneau
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            const newDate = e.target.value
            setFormData(prev => ({ ...prev, timeslot_date: newDate }))
            updateDateTime(newDate, startTime, endTime)
          }}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.timeslot_date ? 'border-red-500' : 'border-gray-300'
          }`}
          required
        />
        {errors.timeslot_date && (
          <p className="text-sm text-red-600">{errors.timeslot_date}</p>
        )}
      </div>

      {/* Heures */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Heure de début
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => {
              const newStartTime = e.target.value
              updateDateTime(date, newStartTime, endTime)
            }}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.start_date ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.start_date && (
            <p className="text-sm text-red-600">{errors.start_date}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Heure de fin
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => {
              const newEndTime = e.target.value
              updateDateTime(date, startTime, newEndTime)
            }}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.end_date ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.end_date && (
            <p className="text-sm text-red-600">{errors.end_date}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Notes (optionnel)
        </label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Informations complémentaires sur ce créneau..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
          rows={3}
        />
      </div>

      {/* Aperçu du créneau */}
      {formData.start_date && formData.end_date && (
        <div className="p-3 bg-blue-50 rounded-md">
          <h4 className="font-medium text-sm mb-2">Aperçu du créneau :</h4>
          <div className="text-sm text-gray-700">
            <p>
              <strong>Date :</strong> {formData.timeslot_date && format(new Date(formData.timeslot_date), 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
            <p>
              <strong>Horaire :</strong> {format(new Date(formData.start_date), 'HH:mm')} - {format(new Date(formData.end_date), 'HH:mm')}
            </p>
            <p>
              <strong>Durée :</strong> {Math.round((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60))} minutes
            </p>
            {formData.notes && (
              <p>
                <strong>Notes :</strong> {formData.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Messages d'erreur globaux */}
      {Object.keys(errors).length > 0 && (
        <div className="p-3 bg-red-50 rounded-md">
          <p className="text-sm text-red-700">
            Veuillez corriger les erreurs ci-dessus avant de continuer.
          </p>
        </div>
      )}
    </form>
  )
}

// Composant de sélection rapide d'horaires prédéfinis
export function QuickTimeSelector({ 
  onSelect, 
  className = "" 
}: { 
  onSelect: (start: string, end: string) => void
  className?: string 
}) {
  const quickSlots = [
    { label: '08h00 - 10h00', start: '08:00', end: '10:00' },
    { label: '10h00 - 12h00', start: '10:00', end: '12:00' },
    { label: '14h00 - 16h00', start: '14:00', end: '16:00' },
    { label: '16h00 - 18h00', start: '16:00', end: '18:00' },
  ]

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm font-medium">Créneaux suggérés :</p>
      <div className="grid grid-cols-2 gap-2">
        {quickSlots.map((slot) => (
          <button
            key={slot.label}
            type="button"
            onClick={() => onSelect(slot.start, slot.end)}
            className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
          >
            {slot.label}
          </button>
        ))}
      </div>
    </div>
  )
}
