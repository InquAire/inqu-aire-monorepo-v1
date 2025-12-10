/**
 * FileUpload Component
 *
 * 드래그 앤 드롭과 파일 선택을 지원하는 파일 업로드 컴포넌트
 */
import { File, FileText, Image, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  FILE_TYPE_MAP,
  FileType,
  FileValidationOptions,
  UploadedFile,
  createImagePreview,
  formatFileSize,
  useDropzone,
  useFileUpload,
} from '../lib/file-upload';
import { cn } from '../lib/utils';

import { Button } from './button';
import { Progress } from './progress';

interface FileUploadProps {
  /** 업로드 API 엔드포인트 */
  endpoint: string;
  /** 허용된 파일 타입 */
  allowedTypes?: FileType[];
  /** 최대 파일 크기 (bytes) */
  maxSize?: number;
  /** 최대 파일 개수 */
  maxFiles?: number;
  /** 다중 파일 업로드 여부 */
  multiple?: boolean;
  /** 업로드 완료 시 콜백 */
  onSuccess?: (files: UploadedFile[]) => void;
  /** 업로드 실패 시 콜백 */
  onError?: (error: Error) => void;
  /** 클래스명 */
  className?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
}

export function FileUpload({
  endpoint,
  allowedTypes = [FileType.ANY],
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  multiple = true,
  onSuccess,
  onError,
  className,
  disabled = false,
}: FileUploadProps) {
  const [previews, setPreviews] = useState<{ file: File; preview?: string }[]>([]);

  const validation: FileValidationOptions = {
    allowedTypes,
    maxSize,
    maxFiles,
  };

  const { upload, uploadMultiple, uploading, progress, uploadedFiles, error, removeFile } =
    useFileUpload({
      endpoint,
      validation,
      onSuccess: file => {
        onSuccess?.([file]);
      },
      onError,
    });

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      // 프리뷰 생성
      const previewPromises = files.map(async file => {
        if (file.type.startsWith('image/')) {
          const preview = await createImagePreview(file);
          return { file, preview };
        }
        return { file };
      });

      const newPreviews = await Promise.all(previewPromises);
      setPreviews(prev => (multiple ? [...prev, ...newPreviews] : newPreviews));

      // 업로드
      if (multiple && files.length > 1) {
        const results = await uploadMultiple(files);
        onSuccess?.(results);
      } else {
        const result = await upload(files[0]);
        if (result) {
          onSuccess?.([result]);
        }
      }
    },
    [upload, uploadMultiple, multiple, onSuccess]
  );

  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } = useDropzone({
    onDrop: handleFilesSelected,
    validation,
    onError,
  });

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        handleFilesSelected(files);
      }
    },
    [handleFilesSelected]
  );

  const handleRemovePreview = useCallback((index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-500" />;
    }
    if (file.type.includes('pdf') || file.type.includes('document')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 드롭존 */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-colors',
          isDragging && 'border-primary bg-primary/5',
          !isDragging && 'border-border hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed',
          uploading && 'pointer-events-none'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple={multiple}
          accept={allowedTypes
            .map(type => FILE_TYPE_MAP[type])
            .flat()
            .join(',')}
          onChange={handleFileInput}
          disabled={disabled || uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Upload
            className={cn('h-12 w-12', isDragging ? 'text-primary' : 'text-muted-foreground')}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragging ? '파일을 여기에 놓으세요' : '파일을 드래그하거나 클릭하여 선택하세요'}
            </p>
            <p className="text-xs text-muted-foreground">
              최대 {formatFileSize(maxSize)}, {maxFiles}개 파일
            </p>
          </div>
        </div>
      </div>

      {/* 업로드 진행률 */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>업로드 중...</span>
            <span>{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} />
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error.message}
        </div>
      )}

      {/* 프리뷰 목록 */}
      {previews.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">선택된 파일</p>
          <div className="grid gap-2">
            {previews.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg group">
                {/* 프리뷰 이미지 또는 아이콘 */}
                <div className="shrink-0">
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(item.file)
                  )}
                </div>

                {/* 파일 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
                </div>

                {/* 삭제 버튼 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePreview(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 업로드된 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">업로드 완료</p>
          <div className="grid gap-2">
            {uploadedFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg group"
              >
                {/* 썸네일 또는 아이콘 */}
                <div className="shrink-0">
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.name}
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <FileText className="h-8 w-8 text-green-500" />
                  )}
                </div>

                {/* 파일 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • 업로드 완료
                  </p>
                </div>

                {/* 삭제 버튼 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
