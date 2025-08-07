// Composant d'interface de validation des créneaux
// Fichier : components/timeslots/TimeslotValidation.tsx

import React, { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  FileText, 
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { 
  TimeslotData, 
  TimeslotValidation as TimeslotValidationType, 
  TimeslotValidationProps,
  TIMESLOT_STATES 
} from '@/types/timeslots'

export function TimeslotValidation({
  pendingTimeslots,
  onApprove,
  onReject,
  loading = false
}: TimeslotValidationProps) {
  const [selectedTimeslots, setSelectedTimeslots] = useState<Set<string>>(new Set())
  const [validationReasons, setValidationReasons] = useState<Record<string, string>>({})
  const [batchAction, setBatchAction] = useState<'approve' | 'reject' | null>(null)

  // Fonction pour sélectionner/désélectionner un créneau
  const toggleTimeslotSelection = (timeslotId: string) => {
    const newSelection = new Set(selectedTimeslots)
    if (newSelection.has(timeslotId)) {
      newSelection.delete(timeslotId)
    } else {
      newSelection.add(timeslotId)
    }
    setSelectedTimeslots(newSelection)
  }

  // Fonction pour sélectionner tous les créneaux
  const selectAll = () => {
    setSelectedTimeslots(new Set(pendingTimeslots.map(slot => slot.id)))
  }

  // Fonction pour désélectionner tous les créneaux
  const selectNone = () => {
    setSelectedTimeslots(new Set())
  }

  // Fonction pour mettre à jour la raison de validation
  const updateValidationReason = (timeslotId: string, reason: string) => {
    setValidationReasons(prev => ({
      ...prev,
      [timeslotId]: reason
    }))
  }

  // Fonction pour valider un créneau individuel
  const handleIndividualValidation = async (
    timeslot: TimeslotData, 
    action: 'approve' | 'reject'
  ) => {
    const validation: TimeslotValidationType = {
      id: timeslot.id,
      action: action,
      reason: validationReasons[timeslot.id] || '',
      validator_id: '' // Sera rempli par le hook
    }

    try {
      if (action === 'approve') {
        await onApprove([validation])
      } else {
        await onReject([validation])
      }
    } catch (error) {
      console.error(`Erreur lors de la ${action === 'approve' ? 'approbation' : 'rejet'}:`, error)
    }
  }

  // Fonction pour validation en lot
  const handleBatchValidation = async () => {
    if (selectedTimeslots.size === 0 || !batchAction) {
      return
    }

    const validations: TimeslotValidationType[] = Array.from(selectedTimeslots).map(id => ({
      id,
      action: batchAction,
      reason: validationReasons[id] || `${batchAction === 'approve' ? 'Approbation' : 'Rejet'} en lot`,
      validator_id: ''
    }))

    try {
      if (batchAction === 'approve') {
        await onApprove(validations)
      } else {
        await onReject(validations)
      }
      
      // Réinitialiser la sélection
      setSelectedTimeslots(new Set())
      setBatchAction(null)
    } catch (error) {
      console.error('Erreur lors de la validation en lot:', error)
    }
  }

  // Fonction pour formater l'heure
  const formatTime = (dateTime: string) => {
    return format(new Date(dateTime), 'HH:mm', { locale: fr })
  }

  // Fonction pour formater la date
  const formatDate = (date: string) => {
    return format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })
  }

  if (pendingTimeslots.length === 0) {
    return (
      <div className="text-center p-8 bg-green-50 rounded-lg">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          Aucun créneau en attente
        </h3>
        <p className="text-green-700">
          Tous les créneaux ont été traités ou il n'y a pas de nouvelles propositions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions en lot */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-blue-600" />
            Validation des créneaux ({pendingTimeslots.length})
          </h2>
          
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-sm border rounded hover:bg-white"
              disabled={loading}
            >
              Tout sélectionner
            </button>
            <button
              onClick={selectNone}
              className="px-3 py-1 text-sm border rounded hover:bg-white"
              disabled={loading}
            >
              Tout désélectionner
            </button>
          </div>
        </div>

        {/* Actions en lot */}
        {selectedTimeslots.size > 0 && (
          <div className="flex items-center gap-4 p-3 bg-white rounded border">
            <span className="text-sm font-medium">
              {selectedTimeslots.size} créneau{selectedTimeslots.size > 1 ? 'x' : ''} sélectionné{selectedTimeslots.size > 1 ? 's' : ''}
            </span>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBatchAction('approve')
                  handleBatchValidation()
                }}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && batchAction === 'approve' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approuver la sélection
              </button>
              
              <button
                onClick={() => {
                  setBatchAction('reject')
                  handleBatchValidation()
                }}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && batchAction === 'reject' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Rejeter la sélection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Liste des créneaux à valider */}
      <div className="space-y-4">
        {pendingTimeslots.map((timeslot) => (
          <div key={timeslot.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-start gap-4">
              {/* Checkbox de sélection */}
              <input
                type="checkbox"
                checked={selectedTimeslots.has(timeslot.id)}
                onChange={() => toggleTimeslotSelection(timeslot.id)}
                className="mt-1"
                disabled={loading}
              />

              {/* Informations du créneau */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">
                      {formatTime(timeslot.start_date)} - {formatTime(timeslot.end_date)}
                    </span>
                  </div>
                  
                  <span className={`px-2 py-1 rounded text-sm ${
                    timeslot.state === 'created' ? 'bg-blue-100 text-blue-800' :
                    timeslot.state === 'modified' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {TIMESLOT_STATES[timeslot.state].label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <div>
                    <strong>Date :</strong> {formatDate(timeslot.timeslot_date)}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <strong>Proposé par :</strong> {timeslot.user_id}
                  </div>
                </div>

                {timeslot.notes && (
                  <div className="flex items-start gap-2 mb-3">
                    <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <strong className="text-sm">Notes :</strong>
                      <p className="text-sm text-gray-600">{timeslot.notes}</p>
                    </div>
                  </div>
                )}

                {/* Zone de commentaire pour la validation */}
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">
                    Commentaire de validation (optionnel) :
                  </label>
                  <textarea
                    value={validationReasons[timeslot.id] || ''}
                    onChange={(e) => updateValidationReason(timeslot.id, e.target.value)}
                    placeholder="Raison de l'approbation ou du rejet..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                    rows={2}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Actions individuelles */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleIndividualValidation(timeslot, 'approve')}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Approuver
                </button>
                
                <button
                  onClick={() => handleIndividualValidation(timeslot, 'reject')}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Rejeter
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Composant de résumé des validations
export function ValidationSummary({
  totalPending,
  recentValidations
}: {
  totalPending: number
  recentValidations?: { approved: number; rejected: number; date: string }[]
}) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold mb-3">Résumé des validations</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{totalPending}</div>
          <div className="text-sm text-gray-600">En attente</div>
        </div>
        
        {recentValidations && recentValidations.length > 0 && (
          <>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {recentValidations.reduce((sum, v) => sum + v.approved, 0)}
              </div>
              <div className="text-sm text-gray-600">Approuvés aujourd'hui</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {recentValidations.reduce((sum, v) => sum + v.rejected, 0)}
              </div>
              <div className="text-sm text-gray-600">Rejetés aujourd'hui</div>
            </div>
          </>
        )}
      </div>
      
      {totalPending === 0 && (
        <div className="text-center text-green-600 font-medium">
          ✓ Toutes les validations sont à jour
        </div>
      )}
    </div>
  )
}
