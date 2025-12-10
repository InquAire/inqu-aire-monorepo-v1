/**
 * 파일 업로드 유틸리티
 *
 * 이미지, 문서 등 다양한 파일 업로드를 지원하는 유틸리티
 */

import axios, { AxiosProgressEvent } from 'axios';
import { useCallback, useRef, useState } from 'react';

/**
 * 파일 타입
 */
export enum FileType {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  ANY = 'ANY',
}

/**
 * 파일 MIME 타입 맵
 */
export const FILE_TYPE_MAP: Record<FileType, string[]> = {
  [FileType.IMAGE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  [FileType.DOCUMENT]: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  [FileType.VIDEO]: ['video/mp4', 'video/webm', 'video/ogg'],
  [FileType.AUDIO]: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
  [FileType.ANY]: ['*/*'],
};

/**
 * 파일 확장자 맵
 */
export const FILE_EXTENSION_MAP: Record<FileType, string[]> = {
  [FileType.IMAGE]: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  [FileType.DOCUMENT]: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
  [FileType.VIDEO]: ['.mp4', '.webm', '.ogg'],
  [FileType.AUDIO]: ['.mp3', '.ogg', '.wav'],
  [FileType.ANY]: ['.*'],
};

/**
 * 파일 업로드 상태
 */
export interface UploadProgress {
  /** 업로드된 바이트 */
  loaded: number;
  /** 전체 바이트 */
  total: number;
  /** 진행률 (0-100) */
  percentage: number;
}

/**
 * 업로드된 파일 정보
 */
export interface UploadedFile {
  /** 파일 ID */
  id: string;
  /** 파일명 */
  name: string;
  /** 파일 크기 (bytes) */
  size: number;
  /** MIME 타입 */
  type: string;
  /** 파일 URL */
  url: string;
  /** 썸네일 URL (이미지인 경우) */
  thumbnailUrl?: string;
  /** 업로드 시간 */
  uploadedAt: string;
}

/**
 * 파일 검증 옵션
 */
export interface FileValidationOptions {
  /** 허용된 파일 타입 */
  allowedTypes?: FileType[];
  /** 최대 파일 크기 (bytes) */
  maxSize?: number;
  /** 최소 파일 크기 (bytes) */
  minSize?: number;
  /** 최대 파일 개수 */
  maxFiles?: number;
  /** 이미지 최대 너비 (px) */
  maxWidth?: number;
  /** 이미지 최대 높이 (px) */
  maxHeight?: number;
}

type ValidationResult = { valid: boolean; error?: string };

/**
 * 파일 검증 (동기)
 * 이미지 크기 검증이 필요한 경우 validateFileAsync 사용
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): ValidationResult {
  const { allowedTypes, maxSize, minSize } = options;

  // 파일 타입 검증
  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some(type => {
      const mimeTypes = FILE_TYPE_MAP[type];
      return mimeTypes.includes(file.type) || mimeTypes.includes('*/*');
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `허용되지 않는 파일 형식입니다. (${file.type})`,
      };
    }
  }

  // 파일 크기 검증
  if (maxSize && file.size > maxSize) {
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. (최대: ${formatFileSize(maxSize)})`,
    };
  }

  if (minSize && file.size < minSize) {
    return {
      valid: false,
      error: `파일 크기가 너무 작습니다. (최소: ${formatFileSize(minSize)})`,
    };
  }

  return { valid: true };
}

/**
 * 파일 검증 (비동기 - 이미지 크기 검증 포함)
 */
export async function validateFileAsync(
  file: File,
  options: FileValidationOptions = {}
): Promise<ValidationResult> {
  // 기본 검증 먼저 실행
  const basicResult = validateFile(file, options);
  if (!basicResult.valid) {
    return basicResult;
  }

  const { maxWidth, maxHeight } = options;

  // 이미지 크기 검증 (비동기로 처리해야 함)
  if ((maxWidth || maxHeight) && file.type.startsWith('image/')) {
    return new Promise<ValidationResult>(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        if (maxWidth && img.width > maxWidth) {
          resolve({
            valid: false,
            error: `이미지 너비가 너무 큽니다. (최대: ${maxWidth}px)`,
          });
          return;
        }

        if (maxHeight && img.height > maxHeight) {
          resolve({
            valid: false,
            error: `이미지 높이가 너무 큽니다. (최대: ${maxHeight}px)`,
          });
          return;
        }

        resolve({ valid: true });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: '이미지를 불러올 수 없습니다.' });
      };

      img.src = url;
    });
  }

  return { valid: true };
}

/**
 * 파일 크기 포맷팅
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 파일 업로드 Hook 옵션
 */
interface UseFileUploadOptions {
  /** 업로드 API 엔드포인트 */
  endpoint: string;
  /** 검증 옵션 */
  validation?: FileValidationOptions;
  /** 업로드 완료 시 콜백 */
  onSuccess?: (file: UploadedFile) => void;
  /** 업로드 실패 시 콜백 */
  onError?: (error: Error) => void;
  /** 자동 업로드 여부 (기본값: false) */
  autoUpload?: boolean;
}

/**
 * 파일 업로드 Hook
 *
 * @example
 * const { upload, uploading, progress, uploadedFiles } = useFileUpload({
 *   endpoint: '/api/upload',
 *   validation: {
 *     allowedTypes: [FileType.IMAGE],
 *     maxSize: 5 * 1024 * 1024, // 5MB
 *   },
 *   onSuccess: (file) => {
 *     console.log('Uploaded:', file);
 *   },
 * });
 */
export function useFileUpload(options: UseFileUploadOptions) {
  const { endpoint, validation = {}, onSuccess, onError } = options;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      // 파일 검증 (이미지 크기 검증이 필요한 경우 비동기)
      const needsAsyncValidation =
        (validation.maxWidth || validation.maxHeight) && file.type.startsWith('image/');
      const validationResult = needsAsyncValidation
        ? await validateFileAsync(file, validation)
        : validateFile(file, validation);

      if (!validationResult.valid) {
        const error = new Error(validationResult.error);
        setError(error);
        onError?.(error);
        return null;
      }

      setUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: 0, percentage: 0 });

      // AbortController 생성
      abortControllerRef.current = new AbortController();

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post<UploadedFile>(endpoint, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            const { loaded, total = 0 } = progressEvent;
            const percentage = Math.round((loaded * 100) / total);
            setProgress({ loaded, total, percentage });
          },
          signal: abortControllerRef.current.signal,
        });

        const uploadedFile = response.data;
        setUploadedFiles(prev => [...prev, uploadedFile]);
        onSuccess?.(uploadedFile);
        setUploading(false);

        return uploadedFile;
      } catch (err) {
        if (axios.isCancel(err)) {
          console.log('Upload cancelled');
        } else {
          let errorMessage = '파일 업로드에 실패했습니다.';
          if (axios.isAxiosError(err) && err.response?.data?.message) {
            errorMessage = err.response.data.message;
          } else if (err instanceof Error) {
            errorMessage = err.message;
          }
          const error = new Error(errorMessage);
          setError(error);
          onError?.(error);
        }
        setUploading(false);
        return null;
      }
    },
    [endpoint, validation, onSuccess, onError]
  );

  const uploadMultiple = useCallback(
    async (files: File[]): Promise<UploadedFile[]> => {
      // 최대 파일 개수 검증
      if (validation.maxFiles && files.length > validation.maxFiles) {
        const error = new Error(`최대 ${validation.maxFiles}개의 파일만 업로드할 수 있습니다.`);
        setError(error);
        onError?.(error);
        return [];
      }

      const uploadPromises = files.map(file => upload(file));
      const results = await Promise.all(uploadPromises);
      return results.filter((file): file is UploadedFile => file !== null);
    },
    [upload, validation.maxFiles, onError]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setUploading(false);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setUploadedFiles([]);
    setError(null);
  }, []);

  return {
    upload,
    uploadMultiple,
    uploading,
    progress,
    uploadedFiles,
    error,
    cancel,
    removeFile,
    reset,
  };
}

/**
 * 드래그 앤 드롭 파일 업로드 Hook
 *
 * @example
 * const { isDragging, handleDrop } = useDropzone({
 *   onDrop: (files) => {
 *     console.log('Dropped files:', files);
 *   },
 * });
 */
export function useDropzone(options: {
  onDrop: (files: File[]) => void;
  validation?: FileValidationOptions;
  onError?: (error: Error) => void;
}) {
  const { onDrop, validation = {}, onError } = options;
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);

      // 파일 개수 검증
      if (validation.maxFiles && files.length > validation.maxFiles) {
        onError?.(new Error(`최대 ${validation.maxFiles}개의 파일만 업로드할 수 있습니다.`));
        return;
      }

      // 각 파일 검증
      const validFiles: File[] = [];
      for (const file of files) {
        const result = validateFile(file, validation);
        if (result.valid) {
          validFiles.push(file);
        } else {
          onError?.(new Error(result.error));
        }
      }

      if (validFiles.length > 0) {
        onDrop(validFiles);
      }
    },
    [onDrop, validation, onError]
  );

  return {
    isDragging,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}

/**
 * 이미지 프리뷰 생성
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      resolve(e.target?.result as string);
    };

    reader.onerror = error => {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 이미지 리사이징
 */
export function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
