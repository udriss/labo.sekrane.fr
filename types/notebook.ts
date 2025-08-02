// types/notebook.ts
export interface TPPreset {
  id: string
  title: string
  description?: string
  discipline: 'chimie' | 'physique' | 'general'
  level?: string
  estimated_duration?: number
  difficulty: 'facile' | 'moyen' | 'difficile'
  objectives?: string
  prerequisites?: string
  safety_notes?: string
  materials: TPMaterial[]
  chemicals: TPChemical[]
  protocols: TPProtocol[]
  sections: TPSection[]
  tags: string[]
  status: 'active' | 'archived' | 'draft'
  created_by: string
  created_at: string
  updated_at: string
}

export interface NotebookEntry {
  id: string
  preset_id?: string
  title: string
  description?: string
  content?: string
  discipline: 'chimie' | 'physique' | 'general'
  level?: string
  estimated_duration?: number
  actual_duration?: number
  difficulty: 'facile' | 'moyen' | 'difficile'
  objectives?: string
  prerequisites?: string
  safety_notes?: string
  materials: TPMaterial[]
  chemicals: TPChemical[]
  protocols: TPProtocol[]
  sections: TPSection[]
  class_group?: string
  teacher_id: string
  student_groups: StudentGroup[]
  date_performed?: string
  observations?: string
  results?: string
  evaluation?: TPEvaluation
  attachments: TPAttachment[]
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  // Relations
  preset_title?: string
}

export interface TPMaterial {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  description?: string
  safety_level?: 'low' | 'medium' | 'high'
  location?: string
  available: boolean
}

export interface TPChemical {
  id: string
  name: string
  formula?: string
  cas_number?: string
  concentration?: string
  quantity: number
  unit: string
  safety_level: 'low' | 'medium' | 'high'
  hazard_symbols: string[]
  storage_conditions?: string
  available: boolean
}

export interface TPProtocol {
  id: string
  step_number: number
  title: string
  description: string
  duration?: number
  safety_notes?: string
  materials_used: string[]
  chemicals_used: string[]
  expected_result?: string
  troubleshooting?: string
}

export interface TPSection {
  id: string
  section_number: number
  title: string
  content: string
  type: 'theory' | 'protocol' | 'observation' | 'analysis' | 'conclusion'
  estimated_duration?: number
}

export interface StudentGroup {
  id: string
  name: string
  students: Array<{
    id: string
    name: string
    role?: 'leader' | 'member'
  }>
}

export interface TPEvaluation {
  criteria: Array<{
    name: string
    description: string
    max_points: number
    obtained_points?: number
  }>
  total_points?: number
  grade?: string
  comments?: string
  evaluated_by?: string
  evaluated_at?: string
}

export interface TPAttachment {
  id: string
  filename: string
  original_name: string
  mimetype: string
  size: number
  url: string
  uploaded_at: string
  uploaded_by: string
}

// Types pour les API requests
export interface CreateTPPresetRequest {
  type: 'preset'
  title: string
  description?: string
  discipline?: 'chimie' | 'physique' | 'general'
  level?: string
  estimated_duration?: number
  difficulty?: 'facile' | 'moyen' | 'difficile'
  objectives?: string
  prerequisites?: string
  safety_notes?: string
  materials?: TPMaterial[]
  chemicals?: TPChemical[]
  protocols?: TPProtocol[]
  sections?: TPSection[]
  tags?: string[]
}

export interface CreateNotebookEntryRequest {
  type?: 'entry'
  preset_id?: string
  title: string
  description?: string
  content?: string
  discipline?: 'chimie' | 'physique' | 'general'
  level?: string
  estimated_duration?: number
  difficulty?: 'facile' | 'moyen' | 'difficile'
  objectives?: string
  prerequisites?: string
  safety_notes?: string
  materials?: TPMaterial[]
  chemicals?: TPChemical[]
  protocols?: TPProtocol[]
  sections?: TPSection[]
  class_group?: string
  student_groups?: StudentGroup[]
  date_performed?: string
  observations?: string
  results?: string
  evaluation?: TPEvaluation
  attachments?: TPAttachment[]
}

// Types pour les réponses API
export interface NotebookAPIResponse {
  success: boolean
  message?: string
  presets?: TPPreset[]
  notebooks?: NotebookEntry[]
  error?: string
}

export interface CreateResponseAPI {
  success: boolean
  message: string
  id: string
}
