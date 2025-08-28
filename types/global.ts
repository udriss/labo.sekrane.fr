export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';

export interface ExistingFileMeta {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}

export interface FileWithMetadata {
  id: string;
  // New file
  file?: File;
  // Already uploaded/persisted file
  existingFile?: ExistingFileMeta;
  // Live upload feedback
  uploadProgress?: number; // 0..100
  uploadStatus?: UploadStatus;
  // For previewing or storing returned URL
  fileContent?: string; // usually a URL
  // Error message if any
  error?: string;
  // Mark as saved in backend if needed by caller
  isPersisted?: boolean;
}
