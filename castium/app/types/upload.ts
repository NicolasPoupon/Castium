export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'complete' | 'error'

export interface UploadProgress {
    fileName: string
    progress: number
    status: UploadStatus
    error?: string
}
