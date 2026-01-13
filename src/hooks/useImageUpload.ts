import { useCallback, useRef, useEffect, useMemo } from 'react';
import type { ImageData, ImageTransform, EditorConfig } from '../types';

const DEFAULT_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

interface UseImageUploadOptions {
  config: EditorConfig;
  onImageLoad: (imageData: ImageData) => void;
  onError?: (error: string) => void;
}

export function useImageUpload({ config, onImageLoad, onError }: UseImageUploadOptions) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Use refs to store latest callback values to avoid recreating processFile
  const onImageLoadRef = useRef(onImageLoad);
  const onErrorRef = useRef(onError);
  const configRef = useRef(config);

  useEffect(() => {
    onImageLoadRef.current = onImageLoad;
  }, [onImageLoad]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const acceptedTypes = config.acceptedFileTypes || DEFAULT_ACCEPTED_TYPES;
  const maxFileSize = config.maxFileSize || DEFAULT_MAX_FILE_SIZE;

  const processFile = useCallback(
    (file: File) => {
      const currentConfig = configRef.current;
      const currentAcceptedTypes = currentConfig.acceptedFileTypes || DEFAULT_ACCEPTED_TYPES;
      const currentMaxFileSize = currentConfig.maxFileSize || DEFAULT_MAX_FILE_SIZE;

      // Validate file type
      if (!currentAcceptedTypes.includes(file.type)) {
        onErrorRef.current?.(`Невалиден тип файл. Позволени: ${currentAcceptedTypes.join(', ')}`);
        return;
      }

      // Validate file size
      if (file.size > currentMaxFileSize) {
        onErrorRef.current?.(`Файлът е твърде голям. Максимален размер: ${Math.round(currentMaxFileSize / 1024 / 1024)}MB`);
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new Image();

        img.onload = () => {
          const { naturalWidth, naturalHeight } = img;
          const cfg = configRef.current;

          // Calculate initial size to fit within editor while maintaining aspect ratio
          const printableArea = cfg.printableArea || {
            minX: 0,
            minY: 0,
            maxX: cfg.width,
            maxY: cfg.height,
          };

          const areaWidth = printableArea.maxX - printableArea.minX;
          const areaHeight = printableArea.maxY - printableArea.minY;

          const aspectRatio = naturalWidth / naturalHeight;
          let width: number;
          let height: number;

          // Fit image to 60% of printable area by default
          const targetSize = Math.min(areaWidth, areaHeight) * 0.6;

          if (aspectRatio > 1) {
            width = targetSize;
            height = targetSize / aspectRatio;
          } else {
            height = targetSize;
            width = targetSize * aspectRatio;
          }

          // Center in printable area
          const x = printableArea.minX + (areaWidth - width) / 2;
          const y = printableArea.minY + (areaHeight - height) / 2;

          const transform: ImageTransform = {
            position: { x, y },
            size: { width, height },
            rotation: 0,
          };

          onImageLoadRef.current({
            id: generateId(),
            src,
            naturalWidth,
            naturalHeight,
            transform,
          });
        };

        img.onerror = () => {
          onErrorRef.current?.('Грешка при зареждане на изображението');
        };

        img.src = src;
      };

      reader.onerror = () => {
        onErrorRef.current?.('Грешка при четене на файла');
      };

      reader.readAsDataURL(file);
    },
    [] // No dependencies - uses refs internally
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const file = event.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Memoize return value for stable reference
  return useMemo(() => ({
    inputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    openFilePicker,
    acceptedTypes,
  }), [handleFileChange, handleDrop, handleDragOver, openFilePicker, acceptedTypes]);
}
