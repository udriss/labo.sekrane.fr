// types/global.d.ts
export type UserRole =
  | 'ADMIN'
  | 'TEACHER'
  | 'STUDENT'
  | 'ADMINLABO'
  | 'LABORANTIN';


export interface FileWithMetadata {
  file: File
  id: string
  uploadProgress?: number
  error?: string
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error'
  fileContent?: string // Base64 content
}