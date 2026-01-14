import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ImageData,
  ImageTransform,
  DragState,
  DragMode,
  ControlHandle,
  EditorConfig,
} from '../types';

// Extend DragState to include pointerId for pointer capture
interface ExtendedDragState extends DragState {
  pointerId?: number;
  element?: HTMLElement;
}

// State for pinch gesture
interface PinchState {
  imageId: string;
  startDistance: number;
  startTransform: ImageTransform;
  startCenter: { x: number; y: number };
}

// Touch point interface for cross-compatibility
interface TouchPoint {
  clientX: number;
  clientY: number;
}

// Calculate distance between two touch points
function getTouchDistance(touch1: TouchPoint, touch2: TouchPoint): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Calculate center point between two touches
function getTouchCenter(touch1: TouchPoint, touch2: TouchPoint): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

interface UseImageTransformOptions {
  images: ImageData[];
  config: EditorConfig;
  containerRef: React.RefObject<HTMLElement>;
  onChange?: (images: ImageData[]) => void;
  /** Display scale factor for responsive mode (default: 1) */
  displayScale?: number;
}

export function useImageTransform({ images, config, containerRef, onChange, displayScale = 1 }: UseImageTransformOptions) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const dragStateRef = useRef<ExtendedDragState | null>(null);
  const pinchStateRef = useRef<PinchState | null>(null);
  const [isPinching, setIsPinching] = useState(false);

  // Store latest values in refs to avoid recreating callbacks during drag
  const imagesRef = useRef(images);
  const onChangeRef = useRef(onChange);
  const configRef = useRef(config);
  const displayScaleRef = useRef(displayScale);

  // Keep refs in sync with props
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    displayScaleRef.current = displayScale;
  }, [displayScale]);

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
      const minSize = config.minImageSize || 20;

      const clampedWidth = Math.max(minSize, size.width);
      const clampedHeight = Math.max(minSize, size.height);

      return {
        position: { x: position.x, y: position.y },
        size: { width: clampedWidth, height: clampedHeight },
        rotation,
      };
    },
    [config.minImageSize]
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

  const handlePointerDown = useCallback(
    (
      event: React.PointerEvent,
      imageId: string,
      mode: DragMode,
      handle?: ControlHandle['position']
    ) => {
      const image = images.find((img) => img.id === imageId);
      if (!image) return;

      event.preventDefault();
      event.stopPropagation();

      // Capture pointer for reliable tracking across touch/mouse
      const element = event.currentTarget as HTMLElement;
      element.setPointerCapture(event.pointerId);

      setSelectedId(imageId);
      setIsDragging(true);
      setDragMode(mode);
      dragStateRef.current = {
        mode,
        imageId,
        startPosition: { x: event.clientX, y: event.clientY },
        startTransform: { ...image.transform },
        handle,
        pointerId: event.pointerId,
        element,
      };
    },
    [images]
  );

  // Stable pointer move handler that reads from refs
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      // Only process events for our captured pointer
      if (dragState.pointerId !== undefined && event.pointerId !== dragState.pointerId) return;

      const currentImages = imagesRef.current;
      const currentConfig = configRef.current;
      const currentDisplayScale = displayScaleRef.current;

      const image = currentImages.find((img) => img.id === dragState.imageId);
      if (!image) return;

      // Scale delta by inverse of display scale to convert screen pixels to original coordinate space
      const deltaX = (event.clientX - dragState.startPosition.x) / currentDisplayScale;
      const deltaY = (event.clientY - dragState.startPosition.y) / currentDisplayScale;

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
          const minSize = currentConfig.minImageSize || 20;

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
            ...image.transform,
            position: { x: newX, y: newY },
            size: { width: clampedWidth, height: clampedHeight },
          };
          break;
        }

        case 'rotate': {
          if (!currentConfig.allowRotation) {
            return;
          }

          // Get container position to convert client coords to local coords
          const container = containerRef.current;
          if (!container) return;

          const rect = container.getBoundingClientRect();

          // Image center in local (canvas) coordinates - scaled for display
          const centerX =
            (dragState.startTransform.position.x +
            dragState.startTransform.size.width / 2) * currentDisplayScale;
          const centerY =
            (dragState.startTransform.position.y +
            dragState.startTransform.size.height / 2) * currentDisplayScale;

          // Convert pointer positions to local coordinates (already in screen space)
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
            ...image.transform,
            rotation,
          };
          break;
        }

        default:
          return;
      }

      // Use ref-based update to avoid dependency on images/onChange
      const updatedImages = currentImages.map((img) =>
        img.id === dragState.imageId ? { ...img, transform: clampTransform(newTransform) } : img
      );
      onChangeRef.current?.(updatedImages);
    },
    [containerRef, clampTransform] // Minimal stable dependencies
  );

  const handlePointerUp = useCallback((event?: PointerEvent) => {
    const dragState = dragStateRef.current;

    // Release pointer capture if we have it
    if (dragState?.element && dragState?.pointerId !== undefined) {
      try {
        dragState.element.releasePointerCapture(dragState.pointerId);
      } catch {
        // Pointer capture may already be released
      }
    }

    setIsDragging(false);
    setDragMode(null);
    dragStateRef.current = null;
  }, []);

  // Pinch gesture handlers for two-finger scaling
  const handleTouchStart = useCallback(
    (event: React.TouchEvent, imageId: string) => {
      // Only handle pinch when we have exactly 2 touches
      if (event.touches.length !== 2) return;

      const image = images.find((img) => img.id === imageId);
      if (!image) return;

      event.preventDefault();
      event.stopPropagation();

      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);

      setSelectedId(imageId);
      setIsPinching(true);

      // Cancel any ongoing drag
      if (dragStateRef.current) {
        setIsDragging(false);
        setDragMode(null);
        dragStateRef.current = null;
      }

      pinchStateRef.current = {
        imageId,
        startDistance: distance,
        startTransform: { ...image.transform },
        startCenter: center,
      };
    },
    [images]
  );

  // Stable touch move handler that reads from refs
  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      const pinchState = pinchStateRef.current;
      if (!pinchState || event.touches.length !== 2) return;

      const currentImages = imagesRef.current;
      const currentConfig = configRef.current;
      const currentDisplayScale = displayScaleRef.current;

      const image = currentImages.find((img) => img.id === pinchState.imageId);
      if (!image) return;

      event.preventDefault();

      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentCenter = getTouchCenter(touch1, touch2);

      // Calculate scale factor
      const scale = currentDistance / pinchState.startDistance;

      // Calculate new size maintaining aspect ratio
      const aspectRatio = image.naturalWidth / image.naturalHeight;
      const minSize = currentConfig.minImageSize || 20;

      const newWidth = Math.max(minSize, pinchState.startTransform.size.width * scale);
      const newHeight = newWidth / aspectRatio;

      // Get container rect to convert center coordinates
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Calculate center movement (for panning while pinching), scaled to original coordinates
      const centerDeltaX = (currentCenter.x - pinchState.startCenter.x) / currentDisplayScale;
      const centerDeltaY = (currentCenter.y - pinchState.startCenter.y) / currentDisplayScale;

      // Calculate the image center in container coordinates (original coordinate space)
      const startImageCenterX = pinchState.startTransform.position.x + pinchState.startTransform.size.width / 2;
      const startImageCenterY = pinchState.startTransform.position.y + pinchState.startTransform.size.height / 2;

      // Scale around the pinch center point (convert screen to original coordinates)
      const pinchCenterX = (pinchState.startCenter.x - rect.left) / currentDisplayScale;
      const pinchCenterY = (pinchState.startCenter.y - rect.top) / currentDisplayScale;

      // Calculate new position to keep the pinch center stable
      const newCenterX = pinchCenterX + (startImageCenterX - pinchCenterX) * scale + centerDeltaX;
      const newCenterY = pinchCenterY + (startImageCenterY - pinchCenterY) * scale + centerDeltaY;

      const newX = newCenterX - newWidth / 2;
      const newY = newCenterY - newHeight / 2;

      const newTransform: ImageTransform = {
        position: { x: newX, y: newY },
        size: { width: newWidth, height: newHeight },
        rotation: pinchState.startTransform.rotation,
      };

      // Use ref-based update to avoid dependency on images/onChange
      const updatedImages = currentImages.map((img) =>
        img.id === pinchState.imageId ? { ...img, transform: clampTransform(newTransform) } : img
      );
      onChangeRef.current?.(updatedImages);
    },
    [containerRef, clampTransform] // Minimal stable dependencies
  );

  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
    pinchStateRef.current = null;
  }, []);

  // Attach global pointer events when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);

      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Attach global touch events when pinching
  useEffect(() => {
    if (isPinching) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);

      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [isPinching, handleTouchMove, handleTouchEnd]);

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
    isPinching,
    dragMode,
    handlePointerDown,
    handleTouchStart,
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
