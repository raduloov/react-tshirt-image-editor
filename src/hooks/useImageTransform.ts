import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ImageData,
  ImageTransform,
  DragState,
  DragMode,
  ControlHandle,
  EditorConfig,
} from '../types';

interface UseImageTransformOptions {
  images: ImageData[];
  config: EditorConfig;
  onChange?: (images: ImageData[]) => void;
}

export function useImageTransform({ images, config, onChange }: UseImageTransformOptions) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);

  // Auto-select newly added image
  useEffect(() => {
    if (images.length > 0 && !selectedId) {
      setSelectedId(images[images.length - 1].id);
    } else if (images.length === 0) {
      setSelectedId(null);
    } else if (selectedId && !images.find((img) => img.id === selectedId)) {
      // Selected image was removed, select the last one
      setSelectedId(images.length > 0 ? images[images.length - 1].id : null);
    }
  }, [images, selectedId]);

  const clampTransform = useCallback(
    (newTransform: ImageTransform): ImageTransform => {
      const { position, size, rotation } = newTransform;

      // Only clamp size to min/max, allow position to be anywhere
      const minSize = config.minImageSize || 20;
      const maxSize = config.maxImageSize || Math.max(config.width, config.height);

      const clampedWidth = Math.max(minSize, Math.min(maxSize, size.width));
      const clampedHeight = Math.max(minSize, Math.min(maxSize, size.height));

      return {
        position: { x: position.x, y: position.y },
        size: { width: clampedWidth, height: clampedHeight },
        rotation,
      };
    },
    [config]
  );

  const updateImageTransform = useCallback(
    (imageId: string, newTransform: ImageTransform) => {
      const clamped = clampTransform(newTransform);
      const updatedImages = images.map((img) =>
        img.id === imageId ? { ...img, transform: clamped } : img
      );
      onChange?.(updatedImages);
    },
    [clampTransform, images, onChange]
  );

  const handleMouseDown = useCallback(
    (
      event: React.MouseEvent,
      imageId: string,
      mode: DragMode,
      handle?: ControlHandle['position']
    ) => {
      const image = images.find((img) => img.id === imageId);
      if (!image) return;

      event.preventDefault();
      event.stopPropagation();

      setSelectedId(imageId);
      setIsDragging(true);
      dragStateRef.current = {
        mode,
        imageId,
        startPosition: { x: event.clientX, y: event.clientY },
        startTransform: { ...image.transform },
        handle,
      };
    },
    [images]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const image = images.find((img) => img.id === dragState.imageId);
      if (!image) return;

      const deltaX = event.clientX - dragState.startPosition.x;
      const deltaY = event.clientY - dragState.startPosition.y;

      let newTransform: ImageTransform;

      switch (dragState.mode) {
        case 'move':
          newTransform = {
            ...image.transform,
            position: {
              x: dragState.startTransform.position.x + deltaX,
              y: dragState.startTransform.position.y + deltaY,
            },
          };
          break;

        case 'resize': {
          const { handle } = dragState;
          const aspectRatio = image.naturalWidth / image.naturalHeight;
          const minSize = config.minImageSize || 20;
          const maxSize = config.maxImageSize || Math.max(config.width, config.height);

          let newWidth = dragState.startTransform.size.width;
          let newX = dragState.startTransform.position.x;
          let newY = dragState.startTransform.position.y;

          // Calculate new width based on handle
          switch (handle) {
            case 'se':
            case 'ne':
              newWidth = dragState.startTransform.size.width + deltaX;
              break;
            case 'sw':
            case 'nw':
              newWidth = dragState.startTransform.size.width - deltaX;
              break;
          }

          // Clamp width first
          const clampedWidth = Math.max(minSize, Math.min(maxSize, newWidth));
          const clampedHeight = clampedWidth / aspectRatio;

          // Calculate position based on clamped size
          const widthDiff = clampedWidth - dragState.startTransform.size.width;
          const heightDiff = clampedHeight - dragState.startTransform.size.height;

          switch (handle) {
            case 'se':
              // Bottom-right: position stays same
              break;
            case 'sw':
              // Bottom-left: x moves left as width increases
              newX = dragState.startTransform.position.x - widthDiff;
              break;
            case 'ne':
              // Top-right: y moves up as height increases
              newY = dragState.startTransform.position.y - heightDiff;
              break;
            case 'nw':
              // Top-left: both x and y move
              newX = dragState.startTransform.position.x - widthDiff;
              newY = dragState.startTransform.position.y - heightDiff;
              break;
          }

          newTransform = {
            ...image.transform,
            position: { x: newX, y: newY },
            size: { width: clampedWidth, height: clampedHeight },
          };
          break;
        }

        case 'rotate': {
          if (!config.allowRotation) {
            return;
          }
          const centerX =
            dragState.startTransform.position.x +
            dragState.startTransform.size.width / 2;
          const centerY =
            dragState.startTransform.position.y +
            dragState.startTransform.size.height / 2;

          const startAngle = Math.atan2(
            dragState.startPosition.y - centerY,
            dragState.startPosition.x - centerX
          );
          const currentAngle = Math.atan2(
            event.clientY - centerY,
            event.clientX - centerX
          );

          const rotation =
            dragState.startTransform.rotation +
            ((currentAngle - startAngle) * 180) / Math.PI;

          newTransform = {
            ...image.transform,
            rotation,
          };
          break;
        }

        default:
          return;
      }

      updateImageTransform(dragState.imageId, newTransform);
    },
    [images, config.allowRotation, updateImageTransform]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStateRef.current = null;
  }, []);

  // Attach global mouse events when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const selectImage = useCallback((imageId: string | null) => {
    setSelectedId(imageId);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedId(null);
  }, []);

  const deleteImage = useCallback(
    (imageId: string) => {
      const updatedImages = images.filter((img) => img.id !== imageId);
      onChange?.(updatedImages);
    },
    [images, onChange]
  );

  const deleteSelected = useCallback(() => {
    if (selectedId) {
      deleteImage(selectedId);
    }
  }, [selectedId, deleteImage]);

  const bringToFront = useCallback(
    (imageId: string) => {
      const image = images.find((img) => img.id === imageId);
      if (!image) return;
      const others = images.filter((img) => img.id !== imageId);
      onChange?.([...others, image]);
    },
    [images, onChange]
  );

  const sendToBack = useCallback(
    (imageId: string) => {
      const image = images.find((img) => img.id === imageId);
      if (!image) return;
      const others = images.filter((img) => img.id !== imageId);
      onChange?.([image, ...others]);
    },
    [images, onChange]
  );

  const reorderImage = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex < 0 || fromIndex >= images.length) return;
      if (toIndex < 0 || toIndex >= images.length) return;
      if (fromIndex === toIndex) return;

      const newImages = [...images];
      const [moved] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, moved);
      onChange?.(newImages);
    },
    [images, onChange]
  );

  return {
    selectedId,
    isDragging,
    handleMouseDown,
    selectImage,
    deselectAll,
    deleteImage,
    deleteSelected,
    bringToFront,
    sendToBack,
    reorderImage,
    updateImageTransform,
  };
}
