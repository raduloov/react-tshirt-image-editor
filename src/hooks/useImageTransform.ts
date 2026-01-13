import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  containerRef: React.RefObject<HTMLElement>;
  onChange?: (images: ImageData[]) => void;
}

export function useImageTransform({ images, config, containerRef, onChange }: UseImageTransformOptions) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingMouseEvent = useRef<MouseEvent | null>(null);

  // Store latest values in refs to avoid recreating callbacks
  const imagesRef = useRef(images);
  const onChangeRef = useRef(onChange);
  const configRef = useRef(config);

  // Keep refs updated
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

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

      // Only clamp size to min, allow position to be anywhere
      const minSize = configRef.current.minImageSize || 20;

      const clampedWidth = Math.max(minSize, size.width);
      const clampedHeight = Math.max(minSize, size.height);

      return {
        position: { x: position.x, y: position.y },
        size: { width: clampedWidth, height: clampedHeight },
        rotation,
      };
    },
    []
  );

  const updateImageTransform = useCallback(
    (imageId: string, newTransform: ImageTransform) => {
      const clamped = clampTransform(newTransform);
      const updatedImages = imagesRef.current.map((img) =>
        img.id === imageId ? { ...img, transform: clamped } : img
      );
      onChangeRef.current?.(updatedImages);
    },
    [clampTransform]
  );

  const handleMouseDown = useCallback(
    (
      event: React.MouseEvent,
      imageId: string,
      mode: DragMode,
      handle?: ControlHandle['position']
    ) => {
      const image = imagesRef.current.find((img) => img.id === imageId);
      if (!image) return;

      event.preventDefault();
      event.stopPropagation();

      setSelectedId(imageId);
      setIsDragging(true);
      setDragMode(mode);
      dragStateRef.current = {
        mode,
        imageId,
        startPosition: { x: event.clientX, y: event.clientY },
        startTransform: { ...image.transform },
        handle,
      };
    },
    []
  );

  const processMouseMove = useCallback(
    (event: MouseEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const image = imagesRef.current.find((img) => img.id === dragState.imageId);
      if (!image) return;

      const deltaX = event.clientX - dragState.startPosition.x;
      const deltaY = event.clientY - dragState.startPosition.y;

      let newTransform: ImageTransform;

      switch (dragState.mode) {
        case 'move':
          newTransform = {
            ...dragState.startTransform,
            position: {
              x: dragState.startTransform.position.x + deltaX,
              y: dragState.startTransform.position.y + deltaY,
            },
          };
          break;

        case 'resize': {
          const { handle } = dragState;
          const aspectRatio = image.naturalWidth / image.naturalHeight;
          const minSize = configRef.current.minImageSize || 20;

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

          // Clamp width to minimum only
          const clampedWidth = Math.max(minSize, newWidth);
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
            ...dragState.startTransform,
            position: { x: newX, y: newY },
            size: { width: clampedWidth, height: clampedHeight },
          };
          break;
        }

        case 'rotate': {
          if (!configRef.current.allowRotation) {
            return;
          }

          // Get container position to convert client coords to local coords
          const container = containerRef.current;
          if (!container) return;

          const rect = container.getBoundingClientRect();

          // Image center in local (canvas) coordinates
          const centerX =
            dragState.startTransform.position.x +
            dragState.startTransform.size.width / 2;
          const centerY =
            dragState.startTransform.position.y +
            dragState.startTransform.size.height / 2;

          // Convert mouse positions to local coordinates
          const startLocalX = dragState.startPosition.x - rect.left;
          const startLocalY = dragState.startPosition.y - rect.top;
          const currentLocalX = event.clientX - rect.left;
          const currentLocalY = event.clientY - rect.top;

          const startAngle = Math.atan2(
            startLocalY - centerY,
            startLocalX - centerX
          );
          const currentAngle = Math.atan2(
            currentLocalY - centerY,
            currentLocalX - centerX
          );

          const rotation =
            dragState.startTransform.rotation +
            ((currentAngle - startAngle) * 180) / Math.PI;

          newTransform = {
            ...dragState.startTransform,
            rotation,
          };
          break;
        }

        default:
          return;
      }

      updateImageTransform(dragState.imageId, newTransform);
    },
    [containerRef, updateImageTransform]
  );

  // Throttle mousemove with requestAnimationFrame for smooth performance
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      pendingMouseEvent.current = event;

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingMouseEvent.current) {
            processMouseMove(pendingMouseEvent.current);
          }
          rafRef.current = null;
        });
      }
    },
    [processMouseMove]
  );

  const handleMouseUp = useCallback(() => {
    // Cancel any pending RAF
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingMouseEvent.current = null;
    setIsDragging(false);
    setDragMode(null);
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
      const updatedImages = imagesRef.current.filter((img) => img.id !== imageId);
      onChangeRef.current?.(updatedImages);
    },
    []
  );

  const deleteSelected = useCallback(() => {
    if (selectedId) {
      deleteImage(selectedId);
    }
  }, [selectedId, deleteImage]);

  const bringToFront = useCallback(
    (imageId: string) => {
      const images = imagesRef.current;
      const image = images.find((img) => img.id === imageId);
      if (!image) return;
      const others = images.filter((img) => img.id !== imageId);
      onChangeRef.current?.([...others, image]);
    },
    []
  );

  const sendToBack = useCallback(
    (imageId: string) => {
      const images = imagesRef.current;
      const image = images.find((img) => img.id === imageId);
      if (!image) return;
      const others = images.filter((img) => img.id !== imageId);
      onChangeRef.current?.([image, ...others]);
    },
    []
  );

  const reorderImage = useCallback(
    (fromIndex: number, toIndex: number) => {
      const images = imagesRef.current;
      if (fromIndex < 0 || fromIndex >= images.length) return;
      if (toIndex < 0 || toIndex >= images.length) return;
      if (fromIndex === toIndex) return;

      const newImages = [...images];
      const [moved] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, moved);
      onChangeRef.current?.(newImages);
    },
    []
  );

  // Use useMemo to return a stable object reference
  return useMemo(() => ({
    selectedId,
    isDragging,
    dragMode,
    handleMouseDown,
    selectImage,
    deselectAll,
    deleteImage,
    deleteSelected,
    bringToFront,
    sendToBack,
    reorderImage,
    updateImageTransform,
  }), [
    selectedId,
    isDragging,
    dragMode,
    handleMouseDown,
    selectImage,
    deselectAll,
    deleteImage,
    deleteSelected,
    bringToFront,
    sendToBack,
    reorderImage,
    updateImageTransform,
  ]);
}
