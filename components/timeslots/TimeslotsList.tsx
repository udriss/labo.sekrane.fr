// Composant d'affichage de la liste des créneaux
// Fichier : components/timeslots/TimeslotsList.tsx

import React from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  Clock, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  User,
  Calendar,
  FileText
} from 'lucide-react'
import { 
  TimeslotData, 
  TimeslotProposal, 
  TimeslotsListProps, 
  TIMESLOT_STATES 
} from '@/types/timeslots'

export function TimeslotsList({
  timeslots,
  onUpdate,
  onDelete,
  editable = false,
  showActions = true,
  groupByDate = true,
  discipline
}: TimeslotsListProps) {
  
  // Grouper les créneaux par date si demandé
  const groupedTimeslots = React.useMemo(() => {
    if (!groupByDate) {
      return { 'all': timeslots }
    }
    
    return timeslots.reduce((groups, timeslot) => {
      const date = 'timeslot_date' in timeslot 
        ? (timeslot as TimeslotData).timeslot_date 
        : (timeslot as TimeslotProposal).start_date.split('T')[0]
      
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(timeslot)
      return groups
    }, {} as Record<string, (TimeslotData | TimeslotProposal)[]>)
  }, [timeslots, groupByDate])

  // Fonction pour formater l'heure
  const formatTime = (dateTime: string) => {
    return format(new Date(dateTime), 'HH:mm', { locale: fr })
  }

  // Fonction pour formater la date
  const formatDate = (date: string) => {
    return format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })
  }

  // Rendu d'un créneau individuel
  const renderTimeslot = (timeslot: TimeslotData | TimeslotProposal, index: number) => {
    const isTimeslotData = 'created_at' in timeslot
    const state = isTimeslotData ? timeslot.state : (timeslot.state || 'created')
    const stateConfig = TIMESLOT_STATES[state]

    return (
      <div key={timeslot.id || index} className="border rounded-lg p-4 mb-2 bg-white shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Horaires */}
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="font-medium">
                {formatTime(timeslot.start_date)} - {formatTime(timeslot.end_date)}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                state === 'approved' ? 'bg-green-100 text-green-800' :
                state === 'created' ? 'bg-blue-100 text-blue-800' :
                state === 'modified' ? 'bg-orange-100 text-orange-800' :
                state === 'rejected' || state === 'deleted' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {stateConfig.label}
              </span>
            </div>

            {/* Notes si présentes */}
            {timeslot.notes && (
              <div className="flex items-start gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                <span className="text-sm text-gray-600">
                  {timeslot.notes}
                </span>
              </div>
            )}

            {/* Informations utilisateur */}
            {isTimeslotData && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <User className="h-3 w-3" />
                <span>Créé par: {timeslot.user_id}</span>
                {timeslot.created_at && (
                  <>
                    <Calendar className="h-3 w-3 ml-2" />
                    <span>
                      {format(new Date(timeslot.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Action en cours pour les propositions */}
            {'action' in timeslot && timeslot.action !== 'none' && (
              <div className="mt-2">
                <span className="px-2 py-1 border rounded text-xs">
                  Action: {timeslot.action}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 ml-4">
              {editable && onUpdate && (
                <button
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                  onClick={() => onUpdate(index, timeslot as TimeslotProposal)}
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}

              {editable && onDelete && (
                <button
                  className="px-3 py-1 border rounded hover:bg-gray-50"
                  onClick={() => onDelete(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              {/* Actions spécifiques selon l'état */}
              {isTimeslotData && state === 'created' && (
                <>
                  <button className="px-3 py-1 border rounded hover:bg-gray-50 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button className="px-3 py-1 border rounded hover:bg-gray-50 text-red-600">
                    <XCircle className="h-4 w-4" />
                  </button>
                </>
              )}

              {isTimeslotData && state === 'deleted' && (
                <button className="px-3 py-1 border rounded hover:bg-gray-50 text-blue-600">
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (timeslots.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50">
        <p className="text-center text-gray-600">
          Aucun créneau trouvé pour cette {discipline}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedTimeslots).map(([date, dateTimeslots]) => (
        <div key={date}>
          {groupByDate && date !== 'all' && (
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {formatDate(date)}
              <span className="ml-auto px-2 py-1 bg-gray-100 rounded text-sm">
                {dateTimeslots.length} créneau{dateTimeslots.length > 1 ? 'x' : ''}
              </span>
            </h3>
          )}
          
          <div className="space-y-2">
            {dateTimeslots.map((timeslot, index) => renderTimeslot(timeslot, index))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Composant d'affichage compact pour les résumés
export function TimeslotsCompactList({
  timeslots,
  maxVisible = 3,
  discipline
}: {
  timeslots: TimeslotData[]
  maxVisible?: number
  discipline: string
}) {
  const visibleTimeslots = timeslots.slice(0, maxVisible)
  const remainingCount = Math.max(0, timeslots.length - maxVisible)

  return (
    <div className="space-y-2">
      {visibleTimeslots.map((timeslot) => (
        <div key={timeslot.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm">
              {format(new Date(timeslot.start_date), 'HH:mm')} - 
              {format(new Date(timeslot.end_date), 'HH:mm')}
            </span>
          </div>
          <span className={`px-2 py-1 rounded text-xs ${
            timeslot.state === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {TIMESLOT_STATES[timeslot.state].label}
          </span>
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className="text-center p-2 text-sm text-gray-500">
          +{remainingCount} créneau{remainingCount > 1 ? 'x' : ''} supplémentaire{remainingCount > 1 ? 's' : ''}
        </div>
      )}
      
      {timeslots.length === 0 && (
        <div className="text-center p-4 text-sm text-gray-500">
          Aucun créneau pour cette {discipline}
        </div>
      )}
    </div>
  )
}
