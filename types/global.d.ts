// types/global.d.ts
export type UserRole =
  | 'ADMIN'
  | 'TEACHER'
  | 'STUDENT'
  | 'ADMINLABO'
  | 'LABORANTIN';



// Interface mise à jour pour gérer les fichiers existants
export interface FileWithMetadata {
  file: File | null  // Peut être null pour les fichiers existants
  id: string
  uploadProgress?: number
  error?: string
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled'
  fileContent?: string
  // Pour les fichiers existants
  existingFile?: {
    fileName: string
    fileUrl: string
    filePath?: string
    fileSize?: number
    fileType?: string
    uploadedAt?: string
  }
  isPersisted?: boolean
}