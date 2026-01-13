import { useCallback, useRef } from 'react';
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

  const acceptedTypes = config.acceptedFileTypes || DEFAULT_ACCEPTED_TYPES;
  const maxFileSize = config.maxFileSize || DEFAULT_MAX_FILE_SIZE;

  const processFile = useCallback(
    (file: File) => {
      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        onError?.(`Невалиден тип файл. Позволени: ${acceptedTypes.join(', ')}`);
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        onError?.(`Файлът е твърде голям. Максимален размер: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new Image();

        img.onload = () => {
          const { naturalWidth, naturalHeight } = img;

          // Calculate initial size to fit within editor while maintaining aspect ratio
          const printableArea = config.printableArea || {
            minX: 0,
            minY: 0,
            maxX: config.width,
            maxY: config.height,
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

          onImageLoad({
            id: generateId(),
            src,
            naturalWidth,
            naturalHeight,
            transform,
          });
        };

        img.onerror = () => {
          onError?.('Грешка при зареждане на изображението');
        };

        img.src = src;
      };

      reader.onerror = () => {
        onError?.('Грешка при четене на файла');
      };

      reader.readAsDataURL(file);
    },
    [acceptedTypes, maxFileSize, config, onImageLoad, onError]
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

  return {
    inputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    openFilePicker,
    acceptedTypes,
  };
}
