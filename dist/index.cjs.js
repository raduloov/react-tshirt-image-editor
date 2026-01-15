'use strict';

var jsxRuntime = require('react/jsx-runtime');
var React = require('react');

const DEFAULT_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
function generateId() {
    return Math.random().toString(36).substring(2, 11);
}
function useImageUpload({ config, onImageLoad, onError, isMobile = false }) {
    const inputRef = React.useRef(null);
    const [uploadState, setUploadState] = React.useState({
        isUploading: false,
        progress: 0,
        fileName: null
    });
    const acceptedTypes = config.acceptedFileTypes || DEFAULT_ACCEPTED_TYPES;
    const maxFileSize = config.maxFileSize || DEFAULT_MAX_FILE_SIZE;
    // For mobile, use image/* to allow camera and all image types
    // For desktop, use specific MIME types
    const acceptAttribute = isMobile ? 'image/*' : acceptedTypes.join(',');
    const processFile = React.useCallback((file) => {
        // For mobile, be more lenient with MIME types (camera may return different types)
        // Check if it's an image by prefix
        const isImage = file.type.startsWith('image/') || acceptedTypes.includes(file.type);
        if (!isImage) {
            onError === null || onError === void 0 ? void 0 : onError(`Невалиден тип файл. Позволени: ${acceptedTypes.join(', ')}`);
            return;
        }
        // Validate file size
        if (file.size > maxFileSize) {
            onError === null || onError === void 0 ? void 0 : onError(`Файлът е твърде голям. Максимален размер: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
            return;
        }
        // Set uploading state
        setUploadState({
            isUploading: true,
            progress: 0,
            fileName: file.name
        });
        const reader = new FileReader();
        // Track progress for visual feedback
        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 50); // 0-50% for reading
                setUploadState(prev => ({ ...prev, progress }));
            }
        };
        reader.onload = (e) => {
            var _a;
            const src = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
            const img = new Image();
            // Update progress - file read complete, now loading image
            setUploadState(prev => ({ ...prev, progress: 60 }));
            img.onload = () => {
                setUploadState(prev => ({ ...prev, progress: 80 }));
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
                let width;
                let height;
                // Fit image to 60% of printable area by default
                const targetSize = Math.min(areaWidth, areaHeight) * 0.6;
                if (aspectRatio > 1) {
                    width = targetSize;
                    height = targetSize / aspectRatio;
                }
                else {
                    height = targetSize;
                    width = targetSize * aspectRatio;
                }
                // Center in printable area
                const x = printableArea.minX + (areaWidth - width) / 2;
                const y = printableArea.minY + (areaHeight - height) / 2;
                const transform = {
                    position: { x, y },
                    size: { width, height },
                    rotation: 0,
                };
                // Complete - 100%
                setUploadState(prev => ({ ...prev, progress: 100 }));
                onImageLoad({
                    id: generateId(),
                    src,
                    naturalWidth,
                    naturalHeight,
                    transform,
                });
                // Reset upload state after a brief delay for visual feedback
                setTimeout(() => {
                    setUploadState({
                        isUploading: false,
                        progress: 0,
                        fileName: null
                    });
                }, 300);
            };
            img.onerror = () => {
                setUploadState({
                    isUploading: false,
                    progress: 0,
                    fileName: null
                });
                onError === null || onError === void 0 ? void 0 : onError('Грешка при зареждане на изображението');
            };
            img.src = src;
        };
        reader.onerror = () => {
            setUploadState({
                isUploading: false,
                progress: 0,
                fileName: null
            });
            onError === null || onError === void 0 ? void 0 : onError('Грешка при четене на файла');
        };
        reader.readAsDataURL(file);
    }, [acceptedTypes, maxFileSize, config, onImageLoad, onError]);
    const handleFileChange = React.useCallback((event) => {
        var _a;
        const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (file) {
            processFile(file);
        }
        // Reset input so the same file can be selected again
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [processFile]);
    const handleDrop = React.useCallback((event) => {
        var _a;
        event.preventDefault();
        event.stopPropagation();
        const file = (_a = event.dataTransfer.files) === null || _a === void 0 ? void 0 : _a[0];
        if (file) {
            processFile(file);
        }
    }, [processFile]);
    const handleDragOver = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);
    const openFilePicker = React.useCallback(() => {
        var _a;
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.click();
    }, []);
    // Handle paste from clipboard
    const handlePaste = React.useCallback((event) => {
        var _a;
        const items = (_a = event.clipboardData) === null || _a === void 0 ? void 0 : _a.items;
        if (!items)
            return;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    event.preventDefault();
                    processFile(file);
                    return;
                }
            }
        }
    }, [processFile]);
    return {
        inputRef,
        handleFileChange,
        handleDrop,
        handleDragOver,
        openFilePicker,
        handlePaste,
        acceptedTypes,
        acceptAttribute,
        uploadState,
        isMobile,
    };
}

// Calculate distance between two touch points
function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}
// Calculate center point between two touches
function getTouchCenter(touch1, touch2) {
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
    };
}
function useImageTransform({ images, config, containerRef, onChange, displayScale = 1 }) {
    const [selectedId, setSelectedId] = React.useState(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragMode, setDragMode] = React.useState(null);
    const dragStateRef = React.useRef(null);
    const pinchStateRef = React.useRef(null);
    const [isPinching, setIsPinching] = React.useState(false);
    // Store latest values in refs to avoid recreating callbacks during drag
    const imagesRef = React.useRef(images);
    const onChangeRef = React.useRef(onChange);
    const configRef = React.useRef(config);
    const displayScaleRef = React.useRef(displayScale);
    // Keep refs in sync with props
    React.useEffect(() => {
        imagesRef.current = images;
    }, [images]);
    React.useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);
    React.useEffect(() => {
        configRef.current = config;
    }, [config]);
    React.useEffect(() => {
        displayScaleRef.current = displayScale;
    }, [displayScale]);
    // Auto-select newly added image
    React.useEffect(() => {
        if (images.length > 0 && !selectedId) {
            setSelectedId(images[images.length - 1].id);
        }
        else if (images.length === 0) {
            setSelectedId(null);
        }
        else if (selectedId && !images.find((img) => img.id === selectedId)) {
            // Selected image was removed, select the last one
            setSelectedId(images.length > 0 ? images[images.length - 1].id : null);
        }
    }, [images, selectedId]);
    const clampTransform = React.useCallback((newTransform) => {
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
    }, [config.minImageSize]);
    const updateImageTransform = React.useCallback((imageId, newTransform) => {
        const clamped = clampTransform(newTransform);
        const updatedImages = images.map((img) => img.id === imageId ? { ...img, transform: clamped } : img);
        onChange === null || onChange === void 0 ? void 0 : onChange(updatedImages);
    }, [clampTransform, images, onChange]);
    const handlePointerDown = React.useCallback((event, imageId, mode, handle) => {
        const image = images.find((img) => img.id === imageId);
        if (!image)
            return;
        event.preventDefault();
        event.stopPropagation();
        // Capture pointer for reliable tracking across touch/mouse
        const element = event.currentTarget;
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
    }, [images]);
    // Stable pointer move handler that reads from refs
    const handlePointerMove = React.useCallback((event) => {
        var _a;
        const dragState = dragStateRef.current;
        if (!dragState)
            return;
        // Only process events for our captured pointer
        if (dragState.pointerId !== undefined && event.pointerId !== dragState.pointerId)
            return;
        const currentImages = imagesRef.current;
        const currentConfig = configRef.current;
        const currentDisplayScale = displayScaleRef.current;
        const image = currentImages.find((img) => img.id === dragState.imageId);
        if (!image)
            return;
        // Scale delta by inverse of display scale to convert screen pixels to original coordinate space
        const deltaX = (event.clientX - dragState.startPosition.x) / currentDisplayScale;
        const deltaY = (event.clientY - dragState.startPosition.y) / currentDisplayScale;
        let newTransform;
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
                if (!container)
                    return;
                const rect = container.getBoundingClientRect();
                // Image center in local (canvas) coordinates - scaled for display
                const centerX = (dragState.startTransform.position.x +
                    dragState.startTransform.size.width / 2) * currentDisplayScale;
                const centerY = (dragState.startTransform.position.y +
                    dragState.startTransform.size.height / 2) * currentDisplayScale;
                // Convert pointer positions to local coordinates (already in screen space)
                const startLocalX = dragState.startPosition.x - rect.left;
                const startLocalY = dragState.startPosition.y - rect.top;
                const currentLocalX = event.clientX - rect.left;
                const currentLocalY = event.clientY - rect.top;
                const startAngle = Math.atan2(startLocalY - centerY, startLocalX - centerX);
                const currentAngle = Math.atan2(currentLocalY - centerY, currentLocalX - centerX);
                const rotation = dragState.startTransform.rotation +
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
        const updatedImages = currentImages.map((img) => img.id === dragState.imageId ? { ...img, transform: clampTransform(newTransform) } : img);
        (_a = onChangeRef.current) === null || _a === void 0 ? void 0 : _a.call(onChangeRef, updatedImages);
    }, [containerRef, clampTransform] // Minimal stable dependencies
    );
    const handlePointerUp = React.useCallback((event) => {
        const dragState = dragStateRef.current;
        // Release pointer capture if we have it
        if ((dragState === null || dragState === void 0 ? void 0 : dragState.element) && (dragState === null || dragState === void 0 ? void 0 : dragState.pointerId) !== undefined) {
            try {
                dragState.element.releasePointerCapture(dragState.pointerId);
            }
            catch (_a) {
                // Pointer capture may already be released
            }
        }
        setIsDragging(false);
        setDragMode(null);
        dragStateRef.current = null;
    }, []);
    // Pinch gesture handlers for two-finger scaling
    const handleTouchStart = React.useCallback((event, imageId) => {
        // Only handle pinch when we have exactly 2 touches
        if (event.touches.length !== 2)
            return;
        const image = images.find((img) => img.id === imageId);
        if (!image)
            return;
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
    }, [images]);
    // Stable touch move handler that reads from refs
    const handleTouchMove = React.useCallback((event) => {
        var _a;
        const pinchState = pinchStateRef.current;
        if (!pinchState || event.touches.length !== 2)
            return;
        const currentImages = imagesRef.current;
        const currentConfig = configRef.current;
        const currentDisplayScale = displayScaleRef.current;
        const image = currentImages.find((img) => img.id === pinchState.imageId);
        if (!image)
            return;
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
        if (!container)
            return;
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
        const newTransform = {
            position: { x: newX, y: newY },
            size: { width: newWidth, height: newHeight },
            rotation: pinchState.startTransform.rotation,
        };
        // Use ref-based update to avoid dependency on images/onChange
        const updatedImages = currentImages.map((img) => img.id === pinchState.imageId ? { ...img, transform: clampTransform(newTransform) } : img);
        (_a = onChangeRef.current) === null || _a === void 0 ? void 0 : _a.call(onChangeRef, updatedImages);
    }, [containerRef, clampTransform] // Minimal stable dependencies
    );
    const handleTouchEnd = React.useCallback(() => {
        setIsPinching(false);
        pinchStateRef.current = null;
    }, []);
    // Attach global pointer events when dragging
    React.useEffect(() => {
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
    React.useEffect(() => {
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
    const selectImage = React.useCallback((imageId) => {
        setSelectedId(imageId);
    }, []);
    const deselectAll = React.useCallback(() => {
        setSelectedId(null);
    }, []);
    const deleteImage = React.useCallback((imageId) => {
        const updatedImages = images.filter((img) => img.id !== imageId);
        onChange === null || onChange === void 0 ? void 0 : onChange(updatedImages);
    }, [images, onChange]);
    const deleteSelected = React.useCallback(() => {
        if (selectedId) {
            deleteImage(selectedId);
        }
    }, [selectedId, deleteImage]);
    const bringToFront = React.useCallback((imageId) => {
        const image = images.find((img) => img.id === imageId);
        if (!image)
            return;
        const others = images.filter((img) => img.id !== imageId);
        onChange === null || onChange === void 0 ? void 0 : onChange([...others, image]);
    }, [images, onChange]);
    const sendToBack = React.useCallback((imageId) => {
        const image = images.find((img) => img.id === imageId);
        if (!image)
            return;
        const others = images.filter((img) => img.id !== imageId);
        onChange === null || onChange === void 0 ? void 0 : onChange([image, ...others]);
    }, [images, onChange]);
    const reorderImage = React.useCallback((fromIndex, toIndex) => {
        if (fromIndex < 0 || fromIndex >= images.length)
            return;
        if (toIndex < 0 || toIndex >= images.length)
            return;
        if (fromIndex === toIndex)
            return;
        const newImages = [...images];
        const [moved] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, moved);
        onChange === null || onChange === void 0 ? void 0 : onChange(newImages);
    }, [images, onChange]);
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

const DEFAULT_CONFIG$1 = {
    mobileBreakpoint: 639,
    tabletBreakpoint: 1024,
    enabled: true,
};
/**
 * Hook for detecting viewport breakpoints and responsive state.
 * Uses matchMedia for efficient breakpoint detection.
 */
function useResponsive(config) {
    const { mobileBreakpoint, tabletBreakpoint, enabled } = {
        ...DEFAULT_CONFIG$1,
        ...config,
    };
    const getBreakpoint = React.useCallback((width) => {
        if (width <= mobileBreakpoint)
            return 'mobile';
        if (width <= tabletBreakpoint)
            return 'tablet';
        return 'desktop';
    }, [mobileBreakpoint, tabletBreakpoint]);
    const getInitialState = React.useCallback(() => {
        // SSR safety - default to desktop if window not available
        if (typeof window === 'undefined') {
            return {
                breakpoint: 'desktop',
                isMobile: false,
                isTablet: false,
                isDesktop: true,
                viewportWidth: 1200,
                viewportHeight: 800,
                isPortrait: false,
                isLandscape: true,
            };
        }
        const width = window.innerWidth;
        const height = window.innerHeight;
        const breakpoint = getBreakpoint(width);
        return {
            breakpoint,
            isMobile: breakpoint === 'mobile',
            isTablet: breakpoint === 'tablet',
            isDesktop: breakpoint === 'desktop',
            viewportWidth: width,
            viewportHeight: height,
            isPortrait: height > width,
            isLandscape: width >= height,
        };
    }, [getBreakpoint]);
    const [state, setState] = React.useState(getInitialState);
    React.useEffect(() => {
        if (!enabled || typeof window === 'undefined')
            return;
        // Create media queries for breakpoints
        const mobileQuery = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`);
        const tabletQuery = window.matchMedia(`(max-width: ${tabletBreakpoint}px)`);
        const portraitQuery = window.matchMedia('(orientation: portrait)');
        const updateState = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const breakpoint = getBreakpoint(width);
            setState({
                breakpoint,
                isMobile: breakpoint === 'mobile',
                isTablet: breakpoint === 'tablet',
                isDesktop: breakpoint === 'desktop',
                viewportWidth: width,
                viewportHeight: height,
                isPortrait: height > width,
                isLandscape: width >= height,
            });
        };
        // Use matchMedia change events for breakpoint changes
        const handleMediaChange = () => updateState();
        // Also listen to resize for viewport dimensions
        const handleResize = () => updateState();
        // Add listeners
        mobileQuery.addEventListener('change', handleMediaChange);
        tabletQuery.addEventListener('change', handleMediaChange);
        portraitQuery.addEventListener('change', handleMediaChange);
        window.addEventListener('resize', handleResize);
        // Initial update
        updateState();
        return () => {
            mobileQuery.removeEventListener('change', handleMediaChange);
            tabletQuery.removeEventListener('change', handleMediaChange);
            portraitQuery.removeEventListener('change', handleMediaChange);
            window.removeEventListener('resize', handleResize);
        };
    }, [enabled, mobileBreakpoint, tabletBreakpoint, getBreakpoint]);
    return state;
}

// Size configurations
const HANDLE_SIZE_DESKTOP = 10;
const HANDLE_SIZE_MOBILE_VISUAL = 14; // Visual size on mobile
const HANDLE_SIZE_MOBILE_HIT = 44; // Touch target size (Apple HIG recommendation)
const ROTATION_HANDLE_OFFSET_DESKTOP = 34;
const ROTATION_HANDLE_OFFSET_MOBILE = 50;
const ACCENT_COLOR = '#4A4A4A'; // dark gray - subtle and professional
// SVG rotate cursor icon encoded as data URI
const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/%3E%3Cpath d='M21 3v5h-5'/%3E%3C/svg%3E") 12 12, crosshair`;
// Helper to create handle styles based on mobile state and active state
function getHandleStyle(isMobile, isActive) {
    const visualSize = isMobile ? HANDLE_SIZE_MOBILE_VISUAL : HANDLE_SIZE_DESKTOP;
    return {
        position: 'absolute',
        width: visualSize,
        height: visualSize,
        backgroundColor: '#ffffff',
        border: `2px solid ${ACCENT_COLOR}`,
        borderRadius: '50%',
        boxSizing: 'border-box',
        boxShadow: isActive
            ? '0 4px 14px rgba(0, 0, 0, 0.25)'
            : '0 2px 10px rgba(0, 0, 0, 0.15)',
        transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
        transform: isActive ? 'scale(1.2)' : 'scale(1)',
        touchAction: 'none',
    };
}
// Helper to create rotation handle styles based on mobile state and active state
function getRotateHandleStyle(isMobile, isActive) {
    const visualSize = isMobile ? HANDLE_SIZE_MOBILE_VISUAL + 4 : HANDLE_SIZE_DESKTOP + 2;
    return {
        position: 'absolute',
        width: visualSize,
        height: visualSize,
        backgroundColor: ACCENT_COLOR,
        border: '2px solid #fff',
        borderRadius: '50%',
        boxSizing: 'border-box',
        cursor: ROTATE_CURSOR,
        boxShadow: isActive
            ? '0 4px 14px rgba(0, 0, 0, 0.3)'
            : '0 2px 10px rgba(0, 0, 0, 0.2)',
        transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
        transform: isActive ? 'scale(1.2)' : 'scale(1)',
        touchAction: 'none',
    };
}
// Helper to create invisible touch target style for mobile
function getTouchTargetStyle(isMobile, position) {
    if (!isMobile)
        return {};
    const hitSize = HANDLE_SIZE_MOBILE_HIT;
    return {
        position: 'absolute',
        width: hitSize,
        height: hitSize,
        backgroundColor: 'transparent',
        borderRadius: '50%',
        // Center the touch target around the visual handle
        margin: -15,
        touchAction: 'none',
        cursor: position === 'rotate' ? ROTATE_CURSOR : getCursorForHandle(position),
    };
}
// Get cursor style for resize handles
function getCursorForHandle(position) {
    switch (position) {
        case 'nw':
        case 'se':
            return 'nwse-resize';
        case 'ne':
        case 'sw':
            return 'nesw-resize';
        default:
            return 'pointer';
    }
}
function Controls({ transform, allowRotation, onPointerDown, isMobile = false }) {
    const { position, size, rotation } = transform;
    // Track which handle is currently active for touch feedback
    const [activeHandle, setActiveHandle] = React.useState(null);
    // Wrapper for pointer down that adds touch feedback
    const handlePointerDownWithFeedback = React.useCallback((e, mode, handle) => {
        setActiveHandle(handle || mode || null);
        onPointerDown(e, mode, handle);
        // Listen for pointer up to clear active state
        const clearActive = () => {
            setActiveHandle(null);
            document.removeEventListener('pointerup', clearActive);
            document.removeEventListener('pointercancel', clearActive);
        };
        document.addEventListener('pointerup', clearActive);
        document.addEventListener('pointercancel', clearActive);
    }, [onPointerDown]);
    // Calculate visual and positioning sizes based on mobile state
    const visualSize = isMobile ? HANDLE_SIZE_MOBILE_VISUAL : HANDLE_SIZE_DESKTOP;
    const rotationOffset = isMobile ? ROTATION_HANDLE_OFFSET_MOBILE : ROTATION_HANDLE_OFFSET_DESKTOP;
    // On mobile, position handles slightly outside the image bounds for better accessibility
    const handleOutset = isMobile ? 4 : 0;
    const containerStyle = {
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: 'center center',
        pointerEvents: 'none',
    };
    const handles = [
        {
            position: 'nw',
            style: {
                top: -visualSize / 2 - handleOutset,
                left: -visualSize / 2 - handleOutset,
                cursor: 'nwse-resize',
            },
        },
        {
            position: 'ne',
            style: {
                top: -visualSize / 2 - handleOutset,
                right: -visualSize / 2 - handleOutset,
                cursor: 'nesw-resize',
            },
        },
        {
            position: 'sw',
            style: {
                bottom: -visualSize / 2 - handleOutset,
                left: -visualSize / 2 - handleOutset,
                cursor: 'nesw-resize',
            },
        },
        {
            position: 'se',
            style: {
                bottom: -visualSize / 2 - handleOutset,
                right: -visualSize / 2 - handleOutset,
                cursor: 'nwse-resize',
            },
        },
    ];
    // Selection border - thicker and more visible on mobile
    const borderStyle = {
        position: 'absolute',
        inset: -1,
        border: `${isMobile ? 2.5 : 2}px solid ${ACCENT_COLOR}`,
        borderRadius: '4px',
        pointerEvents: 'none',
        boxShadow: isMobile
            ? '0 0 0 1px rgba(255, 255, 255, 0.5), 0 2px 12px rgba(0, 0, 0, 0.15)'
            : '0 2px 10px rgba(0, 0, 0, 0.1)',
    };
    // Rotation stem sizing
    const stemHeight = isMobile ? 28 : 18;
    const stemTop = isMobile ? -38 : -28;
    return (jsxRuntime.jsxs("div", { style: containerStyle, children: [jsxRuntime.jsx("div", { style: borderStyle }), handles.map(({ position: pos, style }) => {
                const isActive = activeHandle === pos;
                const handleStyles = getHandleStyle(isMobile, isActive);
                return (jsxRuntime.jsx("div", { style: {
                        ...handleStyles,
                        ...style,
                        pointerEvents: 'auto',
                    }, onPointerDown: (e) => handlePointerDownWithFeedback(e, 'resize', pos), onContextMenu: (e) => e.preventDefault(), children: isMobile && (jsxRuntime.jsx("div", { style: getTouchTargetStyle(isMobile, pos), onPointerDown: (e) => {
                            e.stopPropagation();
                            handlePointerDownWithFeedback(e, 'resize', pos);
                        }, onContextMenu: (e) => e.preventDefault() })) }, pos));
            }), allowRotation && (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx("div", { style: {
                            position: 'absolute',
                            top: stemTop,
                            left: '50%',
                            width: isMobile ? 2 : 1.5,
                            height: stemHeight,
                            backgroundColor: ACCENT_COLOR,
                            transform: 'translateX(-50%)',
                            opacity: 0.8,
                            pointerEvents: 'none',
                        } }), jsxRuntime.jsx("div", { style: {
                            ...getRotateHandleStyle(isMobile, activeHandle === 'rotate'),
                            top: -rotationOffset - visualSize / 2,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'auto',
                        }, onPointerDown: (e) => handlePointerDownWithFeedback(e, 'rotate'), onContextMenu: (e) => e.preventDefault(), children: isMobile && (jsxRuntime.jsx("div", { style: getTouchTargetStyle(isMobile, 'rotate'), onPointerDown: (e) => {
                                e.stopPropagation();
                                handlePointerDownWithFeedback(e, 'rotate');
                            }, onContextMenu: (e) => e.preventDefault() })) })] }))] }));
}

const ITEM_HEIGHT = 56; // Height of each layer item in pixels (desktop)
const MOBILE_ITEM_HEIGHT = 64; // Height of each layer item in pixels (mobile, min 48px for touch)
// teniski-varna color palette
const COLORS$1 = {
    ACCENT: "#FAC000",
    BLACK: "#000000",
    WHITE: "#FFFFFF",
    GRAY: "#9B9B9B",
    LIGHT_GRAY: "#F7F7F7",
    DARK_GRAY: "#4A4A4A",
    RED: "#FF0000"
};
const panelStyle = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: COLORS$1.WHITE,
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
    // Prevent double-tap zoom on the panel
    touchAction: "manipulation"
};
const headerStyle = {
    display: "flex",
    alignItems: "center",
    padding: "8px",
    borderBottom: `1px solid ${COLORS$1.LIGHT_GRAY}`
};
const viewToggleContainerStyle = {
    display: "flex",
    width: "100%",
    backgroundColor: COLORS$1.LIGHT_GRAY,
    borderRadius: "8px",
    padding: "4px"
};
const getViewButtonStyle = (isActive) => ({
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px 12px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: isActive ? COLORS$1.WHITE : "transparent",
    color: isActive ? COLORS$1.DARK_GRAY : COLORS$1.GRAY,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease-out",
    boxShadow: isActive ? "0 2px 4px rgba(0, 0, 0, 0.08)" : "none"
});
const listStyle = {
    listStyle: "none",
    margin: 0,
    padding: "8px",
    flex: 1,
    overflowY: "auto",
    position: "relative"
};
const emptyStyle = {
    padding: "32px 20px",
    textAlign: "center",
    color: COLORS$1.GRAY,
    fontSize: "13px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
};
// Note: dragHandleStyle and dragLineStyle are now dynamic functions inside the component
// to support mobile-responsive sizing (getDragHandleStyle and getDragLineStyle)
// Plus icon for add button
const PlusIcon = () => (jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: jsxRuntime.jsx("path", { d: "M8 3v10M3 8h10", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }) }));
// Front icon
const FrontIcon = () => (jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsxRuntime.jsx("path", { d: "M20 21V19a4 4 0 00-4-4H8a4 4 0 00-4 4v2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("circle", { cx: "12", cy: "7", r: "4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
// Back icon
const BackIcon = () => (jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsxRuntime.jsx("path", { d: "M20 21V19a4 4 0 00-4-4H8a4 4 0 00-4 4v2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("circle", { cx: "12", cy: "7", r: "4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("path", { d: "M3 3l18 18", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })] }));
// Delete icon
const DeleteIcon = () => (jsxRuntime.jsx("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: jsxRuntime.jsx("path", { d: "M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }));
// Empty layers icon
const EmptyLayersIcon = () => (jsxRuntime.jsxs("svg", { width: "24", height: "24", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsxRuntime.jsx("path", { d: "M8 1L1 4.5L8 8L15 4.5L8 1Z", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("path", { d: "M1 11.5L8 15L15 11.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("path", { d: "M1 8L8 11.5L15 8", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })] }));
// Base add button style - will be enhanced for mobile via getAddButtonStyle function
const addButtonStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    width: "100%",
    padding: "12px 16px",
    margin: "8px 0",
    backgroundColor: COLORS$1.ACCENT,
    color: COLORS$1.BLACK,
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    boxShadow: "0 2px 10px rgba(250, 192, 0, 0.3)",
    transition: "filter 0.1s ease-out, transform 0.1s ease-out"
};
// Mobile-optimized add button style
const getMobileAddButtonStyle = (isMobile) => ({
    ...addButtonStyle,
    padding: isMobile ? "16px 20px" : "12px 16px",
    minHeight: isMobile ? "52px" : "auto",
    fontSize: isMobile ? "15px" : "14px",
    gap: isMobile ? "8px" : "6px",
    touchAction: "manipulation"
});
function LayerPanel({ images, selectedId, onSelect, onDelete, onReorder, onAddImage, currentView, onViewChange, compact = false, isMobile = false, hideAddButton = false }) {
    // Adjust panel style for compact mode
    const dynamicPanelStyle = compact
        ? { ...panelStyle, width: '100%', height: 'auto', borderRadius: '0 0 10px 10px', boxShadow: 'none' }
        : panelStyle;
    // Use mobile item height for touch-friendly targets
    const itemHeight = isMobile ? MOBILE_ITEM_HEIGHT : ITEM_HEIGHT;
    // Swipe-to-delete state
    const [swipeState, setSwipeState] = React.useState(null);
    const [dragState, setDragState] = React.useState(null);
    const listRef = React.useRef(null);
    // Reverse to show top layer first (last in array = top = first in list)
    const reversedImages = [...images].reverse();
    const handlePointerDown = React.useCallback((e, reversedIndex) => {
        e.preventDefault();
        e.stopPropagation();
        // Capture pointer for reliable tracking across touch/mouse
        const element = e.currentTarget;
        element.setPointerCapture(e.pointerId);
        setDragState({
            draggingIndex: reversedIndex,
            startY: e.clientY,
            currentY: e.clientY,
            pointerId: e.pointerId,
            element
        });
    }, []);
    const handlePointerMove = React.useCallback((e) => {
        if (!dragState)
            return;
        // Only process events for our captured pointer
        if (dragState.pointerId !== undefined && e.pointerId !== dragState.pointerId)
            return;
        setDragState(prev => prev
            ? {
                ...prev,
                currentY: e.clientY
            }
            : null);
    }, [dragState]);
    const handlePointerUp = React.useCallback(() => {
        if (!dragState)
            return;
        // Release pointer capture if we have it
        if (dragState.element && dragState.pointerId !== undefined) {
            try {
                dragState.element.releasePointerCapture(dragState.pointerId);
            }
            catch (_a) {
                // Pointer capture may already be released
            }
        }
        const deltaY = dragState.currentY - dragState.startY;
        const indexDelta = Math.round(deltaY / itemHeight);
        const newReversedIndex = Math.max(0, Math.min(reversedImages.length - 1, dragState.draggingIndex + indexDelta));
        if (newReversedIndex !== dragState.draggingIndex) {
            // Convert reversed indices to original indices
            const fromOriginal = images.length - 1 - dragState.draggingIndex;
            const toOriginal = images.length - 1 - newReversedIndex;
            onReorder(fromOriginal, toOriginal);
        }
        setDragState(null);
    }, [dragState, reversedImages.length, images.length, onReorder, itemHeight]);
    React.useEffect(() => {
        if (dragState) {
            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", handlePointerUp);
            window.addEventListener("pointercancel", handlePointerUp);
            return () => {
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerup", handlePointerUp);
                window.removeEventListener("pointercancel", handlePointerUp);
            };
        }
    }, [dragState, handlePointerMove, handlePointerUp]);
    const handleDelete = (e, id) => {
        e.stopPropagation();
        onDelete(id);
    };
    // Swipe-to-delete handlers (mobile only)
    const handleSwipeStart = React.useCallback((e, id) => {
        if (!isMobile)
            return;
        // Only start swipe if not on drag handle (drag handle is on the left)
        const target = e.target;
        if (target.closest('[data-drag-handle]'))
            return;
        setSwipeState({
            id,
            startX: e.clientX,
            currentX: e.clientX,
            pointerId: e.pointerId
        });
    }, [isMobile]);
    const handleSwipeMove = React.useCallback((e) => {
        if (!swipeState)
            return;
        if (e.pointerId !== swipeState.pointerId)
            return;
        setSwipeState(prev => prev ? {
            ...prev,
            currentX: e.clientX
        } : null);
    }, [swipeState]);
    const handleSwipeEnd = React.useCallback(() => {
        if (!swipeState)
            return;
        const deltaX = swipeState.currentX - swipeState.startX;
        // Delete threshold: swipe left more than 100px
        if (deltaX < -100) {
            onDelete(swipeState.id);
        }
        setSwipeState(null);
    }, [swipeState, onDelete]);
    // Add swipe listeners
    React.useEffect(() => {
        if (swipeState) {
            window.addEventListener("pointermove", handleSwipeMove);
            window.addEventListener("pointerup", handleSwipeEnd);
            window.addEventListener("pointercancel", handleSwipeEnd);
            return () => {
                window.removeEventListener("pointermove", handleSwipeMove);
                window.removeEventListener("pointerup", handleSwipeEnd);
                window.removeEventListener("pointercancel", handleSwipeEnd);
            };
        }
    }, [swipeState, handleSwipeMove, handleSwipeEnd]);
    // Calculate visual positions during drag
    const getItemStyle = (reversedIndex, isSelected, swipeOffset = 0) => {
        const isDragging = (dragState === null || dragState === void 0 ? void 0 : dragState.draggingIndex) === reversedIndex;
        let transform = swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : "translateY(0)";
        let zIndex = 1;
        let boxShadow = isSelected
            ? `0 0 0 2px ${COLORS$1.ACCENT}, 0 2px 10px rgba(250, 192, 0, 0.15)`
            : "0 1px 3px rgba(0, 0, 0, 0.05)";
        let transition = "transform 0.3s ease-out, background-color 0.3s ease-out, box-shadow 0.3s ease-out, border-color 0.3s ease-out";
        // Calculate background color for swipe feedback
        let backgroundColor = isDragging ? COLORS$1.WHITE : isSelected ? "#FEF9E7" : COLORS$1.WHITE;
        if (swipeOffset < -50) {
            // Red tint as user swipes to delete
            const intensity = Math.min(1, Math.abs(swipeOffset + 50) / 50);
            backgroundColor = `rgba(255, ${235 - intensity * 100}, ${235 - intensity * 100}, 1)`;
        }
        if (dragState) {
            if (isDragging) {
                // The dragged item follows the pointer - enhanced visual feedback
                const deltaY = dragState.currentY - dragState.startY;
                transform = `translateY(${deltaY}px) scale(1.03)`;
                zIndex = 100;
                boxShadow = "0 12px 28px rgba(0,0,0,0.2), 0 6px 12px rgba(0, 0, 0, 0.12)";
                transition = "box-shadow 0.3s ease-out, scale 0.15s ease-out";
                backgroundColor = "#FEF9E7"; // Highlight dragged item
            }
            else {
                // Other items shift to make room - smoother animation
                const draggedIndex = dragState.draggingIndex;
                const deltaY = dragState.currentY - dragState.startY;
                const targetIndex = Math.round(deltaY / itemHeight) + draggedIndex;
                const clampedTarget = Math.max(0, Math.min(reversedImages.length - 1, targetIndex));
                if (draggedIndex < reversedIndex && clampedTarget >= reversedIndex) {
                    // Dragged item moved down past this item - shift up
                    transform = `translateY(-${itemHeight}px)`;
                }
                else if (draggedIndex > reversedIndex && clampedTarget <= reversedIndex) {
                    // Dragged item moved up past this item - shift down
                    transform = `translateY(${itemHeight}px)`;
                }
            }
        }
        return {
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "12px" : "10px",
            padding: isMobile ? "12px 14px" : "10px 12px",
            marginBottom: "6px",
            borderRadius: "10px",
            border: `1px solid ${isSelected ? COLORS$1.ACCENT : COLORS$1.LIGHT_GRAY}`,
            backgroundColor,
            cursor: "pointer",
            position: "relative",
            zIndex,
            transform,
            transition,
            boxShadow,
            height: `${itemHeight}px`,
            boxSizing: "border-box",
            overflow: "hidden"
        };
    };
    // Mobile-responsive thumbnail size
    const thumbnailSize = isMobile ? 44 : 36;
    const thumbnailStyle = {
        width: `${thumbnailSize}px`,
        height: `${thumbnailSize}px`,
        objectFit: "contain",
        backgroundColor: COLORS$1.LIGHT_GRAY,
        borderRadius: "8px",
        border: `1px solid ${COLORS$1.LIGHT_GRAY}`,
        padding: "2px",
        flexShrink: 0
    };
    const labelStyle = {
        flex: 1,
        fontSize: isMobile ? "14px" : "13px",
        fontWeight: 500,
        color: COLORS$1.DARK_GRAY,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    };
    // Mobile-responsive delete button (min 44px touch target)
    const deleteButtonSize = isMobile ? 44 : 28;
    const deleteButtonStyle = {
        width: `${deleteButtonSize}px`,
        height: `${deleteButtonSize}px`,
        padding: 0,
        border: "none",
        borderRadius: "50%",
        backgroundColor: "transparent",
        color: COLORS$1.GRAY,
        cursor: "pointer",
        fontSize: isMobile ? "18px" : "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease-out",
        flexShrink: 0
    };
    const deleteButtonHoverStyle = {
        ...deleteButtonStyle,
        backgroundColor: "#FFEBEB",
        color: COLORS$1.RED,
        transform: "scale(1.1)"
    };
    // Mobile-responsive drag handle styles
    const getDragHandleStyle = (isDragging) => ({
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? "4px" : "3px",
        cursor: isDragging ? "grabbing" : "grab",
        padding: isMobile ? "10px 8px" : "6px 4px",
        borderRadius: "4px",
        transition: "background-color 0.3s ease-out",
        touchAction: "none",
        backgroundColor: isDragging ? "#e2e8f0" : "transparent",
        minWidth: isMobile ? "32px" : "18px",
        alignItems: "center"
    });
    const getDragLineStyle = () => ({
        width: isMobile ? "14px" : "10px",
        height: isMobile ? "3px" : "2px",
        backgroundColor: COLORS$1.GRAY,
        borderRadius: "1px"
    });
    // Delete button with hover state
    const [hoveredDeleteId, setHoveredDeleteId] = React.useState(null);
    const [addButtonHovered, setAddButtonHovered] = React.useState(false);
    const [addButtonActive, setAddButtonActive] = React.useState(false);
    return (jsxRuntime.jsxs("div", { style: dynamicPanelStyle, children: [!compact && (jsxRuntime.jsx("div", { style: headerStyle, children: jsxRuntime.jsxs("div", { style: viewToggleContainerStyle, children: [jsxRuntime.jsxs("button", { style: getViewButtonStyle(currentView === "front"), onClick: () => onViewChange("front"), children: [jsxRuntime.jsx(FrontIcon, {}), "\u041E\u0442\u043F\u0440\u0435\u0434"] }), jsxRuntime.jsxs("button", { style: getViewButtonStyle(currentView === "back"), onClick: () => onViewChange("back"), children: [jsxRuntime.jsx(BackIcon, {}), "\u041E\u0442\u0437\u0430\u0434"] })] }) })), !hideAddButton && (jsxRuntime.jsx("div", { style: { padding: "12px 12px 4px" }, children: jsxRuntime.jsxs("button", { style: {
                        ...getMobileAddButtonStyle(isMobile),
                        margin: 0,
                        ...(addButtonActive
                            ? {
                                filter: "brightness(0.9)",
                                transform: "scale(0.95)"
                            }
                            : addButtonHovered
                                ? {
                                    filter: "brightness(0.9)"
                                }
                                : {})
                    }, onClick: onAddImage, onMouseEnter: () => setAddButtonHovered(true), onMouseLeave: () => {
                        setAddButtonHovered(false);
                        setAddButtonActive(false);
                    }, onMouseDown: () => setAddButtonActive(true), onMouseUp: () => setAddButtonActive(false), children: [isMobile ? (
                        // Camera icon for mobile
                        jsxRuntime.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsxRuntime.jsx("path", { d: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("circle", { cx: "12", cy: "13", r: "4", stroke: "currentColor", strokeWidth: "2" })] })) : (jsxRuntime.jsx(PlusIcon, {})), isMobile ? "Качи снимка" : "Добави изображение"] }) })), images.length === 0 ? (jsxRuntime.jsxs("div", { style: {
                    ...emptyStyle,
                    padding: isMobile ? "24px 16px" : "32px 20px"
                }, children: [jsxRuntime.jsx("div", { style: { marginBottom: "8px", opacity: 0.6 }, children: jsxRuntime.jsx(EmptyLayersIcon, {}) }), jsxRuntime.jsx("div", { style: { marginBottom: isMobile ? "8px" : "0" }, children: "\u041D\u044F\u043C\u0430 \u0441\u043B\u043E\u0435\u0432\u0435" }), isMobile && (jsxRuntime.jsx("div", { style: { fontSize: "12px", color: COLORS$1.GRAY, lineHeight: 1.4 }, children: "\u041D\u0430\u0442\u0438\u0441\u043D\u0435\u0442\u0435 \u0431\u0443\u0442\u043E\u043D\u0430 \u043E\u0442\u0433\u043E\u0440\u0435 \u0437\u0430 \u0434\u0430 \u043A\u0430\u0447\u0438\u0442\u0435 \u0441\u043D\u0438\u043C\u043A\u0430 \u043E\u0442 \u043A\u0430\u043C\u0435\u0440\u0430 \u0438\u043B\u0438 \u0433\u0430\u043B\u0435\u0440\u0438\u044F" }))] })) : (jsxRuntime.jsx("ul", { ref: listRef, style: listStyle, children: reversedImages.map((image, reversedIndex) => {
                    const originalIndex = images.length - 1 - reversedIndex;
                    const isSelected = image.id === selectedId;
                    const isDragging = (dragState === null || dragState === void 0 ? void 0 : dragState.draggingIndex) === reversedIndex;
                    // Calculate swipe offset for this item
                    const swipeOffset = (swipeState === null || swipeState === void 0 ? void 0 : swipeState.id) === image.id
                        ? Math.min(0, swipeState.currentX - swipeState.startX) // Only allow left swipe
                        : 0;
                    return (jsxRuntime.jsxs("li", { style: getItemStyle(reversedIndex, isSelected, swipeOffset), onClick: () => !dragState && !swipeState && onSelect(image.id), onPointerDown: e => handleSwipeStart(e, image.id), onContextMenu: e => e.preventDefault(), children: [isMobile && swipeOffset < -20 && (jsxRuntime.jsx("div", { style: {
                                    position: "absolute",
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: Math.abs(swipeOffset),
                                    backgroundColor: swipeOffset < -100 ? COLORS$1.RED : "#FFEBEB",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: swipeOffset < -100 ? COLORS$1.WHITE : COLORS$1.RED,
                                    transition: "background-color 0.2s ease-out",
                                    borderRadius: "0 10px 10px 0"
                                }, children: jsxRuntime.jsx(DeleteIcon, {}) })), jsxRuntime.jsxs("div", { "data-drag-handle": true, style: getDragHandleStyle(isDragging), onPointerDown: e => {
                                    e.stopPropagation();
                                    handlePointerDown(e, reversedIndex);
                                }, onContextMenu: e => e.preventDefault(), children: [jsxRuntime.jsx("div", { style: getDragLineStyle() }), jsxRuntime.jsx("div", { style: getDragLineStyle() }), jsxRuntime.jsx("div", { style: getDragLineStyle() })] }), jsxRuntime.jsx("img", { src: image.src, alt: `Layer ${originalIndex + 1}`, style: thumbnailStyle, draggable: false, loading: "lazy", decoding: "async" }), jsxRuntime.jsxs("span", { style: labelStyle, children: ["\u0421\u043B\u043E\u0439 ", originalIndex + 1] }), jsxRuntime.jsx("button", { style: hoveredDeleteId === image.id ? deleteButtonHoverStyle : deleteButtonStyle, onClick: e => handleDelete(e, image.id), onMouseEnter: () => setHoveredDeleteId(image.id), onMouseLeave: () => setHoveredDeleteId(null), onPointerDown: e => e.stopPropagation(), title: "\u0418\u0437\u0442\u0440\u0438\u0439 \u0441\u043B\u043E\u0439", children: jsxRuntime.jsx(DeleteIcon, {}) })] }, image.id));
                }) }))] }));
}

// Helper to load an image from a source URL
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
async function exportToDataUrl(canvas, backgroundImage, images, config, format = 'image/png', quality = 0.92) {
    const scale = config.exportScale || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }
    // Pre-load all user images to ensure they're ready for drawing
    const loadedImages = await Promise.all(images.map(async (imageData) => ({
        transform: imageData.transform,
        img: await loadImage(imageData.src),
    })));
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Scale all drawing operations
    ctx.save();
    ctx.scale(scale, scale);
    // Draw background using "cover" behavior to match CSS background-size: cover
    if (backgroundImage) {
        const imgRatio = backgroundImage.naturalWidth / backgroundImage.naturalHeight;
        const containerRatio = config.width / config.height;
        let drawWidth, drawHeight, drawX, drawY;
        if (imgRatio > containerRatio) {
            // Image is wider - fit height, crop width
            drawHeight = config.height;
            drawWidth = backgroundImage.naturalWidth * (config.height / backgroundImage.naturalHeight);
            drawX = (config.width - drawWidth) / 2;
            drawY = 0;
        }
        else {
            // Image is taller - fit width, crop height
            drawWidth = config.width;
            drawHeight = backgroundImage.naturalHeight * (config.width / backgroundImage.naturalWidth);
            drawX = 0;
            drawY = (config.height - drawHeight) / 2;
        }
        ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
    }
    // Set up clipping if printable area is defined
    if (config.printableArea) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(config.printableArea.minX, config.printableArea.minY, config.printableArea.maxX - config.printableArea.minX, config.printableArea.maxY - config.printableArea.minY);
        ctx.clip();
    }
    // Draw all user images in order (first = bottom, last = top)
    for (const { transform, img } of loadedImages) {
        ctx.save();
        if (transform.rotation !== 0) {
            const centerX = transform.position.x + transform.size.width / 2;
            const centerY = transform.position.y + transform.size.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate((transform.rotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
        }
        ctx.drawImage(img, transform.position.x, transform.position.y, transform.size.width, transform.size.height);
        ctx.restore();
    }
    // Restore from clip if it was applied
    if (config.printableArea) {
        ctx.restore();
    }
    // Restore from scale
    ctx.restore();
    return canvas.toDataURL(format, quality);
}
function createOffscreenCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

// teniski-varna color palette
const COLORS = {
    ACCENT: "#FAC000",
    BLACK: "#000000",
    WHITE: "#FFFFFF",
    GRAY: "#9B9B9B",
    LIGHT_GRAY: "#F7F7F7",
    DARK_GRAY: "#4A4A4A",
    RED: "#FF0000"
};
const DEFAULT_CONFIG = {
    width: 400,
    height: 500,
    minImageSize: 20,
    allowRotation: false,
    acceptedFileTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    maxFileSize: 10 * 1024 * 1024
};
const DEFAULT_RESPONSIVE_CONFIG = {
    enabled: false,
    mobileBreakpoint: 639,
    tabletBreakpoint: 1024,
    forceLayout: undefined,
    tabletPanelWidth: 180,
    desktopPanelWidth: 220,
    mobileCollapsedByDefault: true
};
// Helper to calculate scaled dimensions for responsive canvas
function calculateScaledDimensions(originalWidth, originalHeight, containerWidth, maxHeight) {
    const aspectRatio = originalWidth / originalHeight;
    // First try to fit width
    let width = Math.min(originalWidth, containerWidth);
    let height = width / aspectRatio;
    // If height exceeds max, constrain by height instead
    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }
    const scale = width / originalWidth;
    return {
        width: Math.round(width),
        height: Math.round(height),
        scale
    };
}
// Scale printable area proportionally
function scalePrintableArea(printableArea, scale) {
    if (!printableArea)
        return undefined;
    return {
        minX: Math.round(printableArea.minX * scale),
        minY: Math.round(printableArea.minY * scale),
        maxX: Math.round(printableArea.maxX * scale),
        maxY: Math.round(printableArea.maxY * scale)
    };
}
function TShirtBuilder({ frontBgImage, backBgImage, backgrounds, initialBackgroundId, onBackgroundChange, config: configProp, responsive: responsiveProp, onChange, onExport, className, style, initialImages }) {
    var _a;
    const config = { ...DEFAULT_CONFIG, ...configProp };
    const responsiveConfig = { ...DEFAULT_RESPONSIVE_CONFIG, ...responsiveProp };
    // Responsive state detection
    const responsiveState = useResponsive({
        mobileBreakpoint: responsiveConfig.mobileBreakpoint,
        tabletBreakpoint: responsiveConfig.tabletBreakpoint,
        enabled: responsiveConfig.enabled
    });
    // Container ref for measuring available space
    const wrapperRef = React.useRef(null);
    const [containerWidth, setContainerWidth] = React.useState(0);
    // Mobile drawer state
    const [isPanelCollapsed, setIsPanelCollapsed] = React.useState((_a = responsiveConfig.mobileCollapsedByDefault) !== null && _a !== void 0 ? _a : true);
    // Measure container width for responsive scaling
    React.useEffect(() => {
        if (!responsiveConfig.enabled || !wrapperRef.current)
            return;
        const measureContainer = () => {
            if (wrapperRef.current) {
                setContainerWidth(wrapperRef.current.clientWidth);
            }
        };
        // Initial measurement
        measureContainer();
        // Use ResizeObserver for efficient container size tracking
        const resizeObserver = new ResizeObserver(measureContainer);
        resizeObserver.observe(wrapperRef.current);
        return () => resizeObserver.disconnect();
    }, [responsiveConfig.enabled]);
    // Determine layout mode based on responsive state or forced layout
    const layoutMode = React.useMemo(() => {
        if (responsiveConfig.forceLayout) {
            return responsiveConfig.forceLayout;
        }
        if (!responsiveConfig.enabled) {
            return 'horizontal';
        }
        // Mobile uses vertical layout, tablet and desktop use horizontal
        return responsiveState.isMobile ? 'vertical' : 'horizontal';
    }, [responsiveConfig.forceLayout, responsiveConfig.enabled, responsiveState.isMobile]);
    // Calculate panel width based on breakpoint
    const panelWidth = React.useMemo(() => {
        var _a, _b, _c;
        if (!responsiveConfig.enabled) {
            return (_a = responsiveConfig.desktopPanelWidth) !== null && _a !== void 0 ? _a : 220;
        }
        if (responsiveState.isMobile) {
            return '100%'; // Full width for mobile drawer
        }
        if (responsiveState.isTablet) {
            return (_b = responsiveConfig.tabletPanelWidth) !== null && _b !== void 0 ? _b : 180;
        }
        return (_c = responsiveConfig.desktopPanelWidth) !== null && _c !== void 0 ? _c : 220;
    }, [responsiveConfig.enabled, responsiveConfig.tabletPanelWidth, responsiveConfig.desktopPanelWidth, responsiveState.isMobile, responsiveState.isTablet]);
    // Calculate canvas dimensions based on responsive state
    const canvasDimensions = React.useMemo(() => {
        if (!responsiveConfig.enabled || !containerWidth) {
            return { width: config.width, height: config.height, scale: 1 };
        }
        // Calculate available width for canvas
        let availableWidth = containerWidth;
        if (layoutMode === 'horizontal') {
            const gap = 16;
            const numericPanelWidth = typeof panelWidth === 'number' ? panelWidth : 220;
            availableWidth = containerWidth - numericPanelWidth - gap;
        }
        else {
            // Vertical layout - full width with some padding
            availableWidth = containerWidth - 32; // 16px padding on each side
        }
        // Calculate max height (leave room for buttons and panel in vertical layout)
        const maxHeight = layoutMode === 'vertical'
            ? responsiveState.viewportHeight * 0.5 // Half of viewport height in vertical layout
            : responsiveState.viewportHeight - 200; // Leave room for buttons in horizontal
        return calculateScaledDimensions(config.width, config.height, availableWidth, maxHeight);
    }, [responsiveConfig.enabled, containerWidth, config.width, config.height, layoutMode, panelWidth, responsiveState.viewportHeight]);
    // Calculate scaled printable area
    const scaledPrintableArea = React.useMemo(() => {
        return scalePrintableArea(config.printableArea, canvasDimensions.scale);
    }, [config.printableArea, canvasDimensions.scale]);
    // Create a scaled config for rendering (keeps original for export)
    const displayConfig = React.useMemo(() => ({
        ...config,
        width: canvasDimensions.width,
        height: canvasDimensions.height,
        printableArea: scaledPrintableArea
    }), [config, canvasDimensions.width, canvasDimensions.height, scaledPrintableArea]);
    const [currentView, setCurrentView] = React.useState("front");
    const [viewImages, setViewImages] = React.useState(initialImages || { front: [], back: [] });
    const [bgImage, setBgImage] = React.useState(null);
    const [error, setError] = React.useState(null);
    // Selected background for multi-background support
    const [selectedBackgroundId, setSelectedBackgroundId] = React.useState(initialBackgroundId || (backgrounds && backgrounds.length > 0 ? backgrounds[0].id : undefined));
    const containerRef = React.useRef(null);
    // Get current images based on view
    const images = viewImages[currentView];
    // Get the selected background option
    const selectedBackground = React.useMemo(() => {
        if (!backgrounds || backgrounds.length === 0)
            return undefined;
        return backgrounds.find(bg => bg.id === selectedBackgroundId) || backgrounds[0];
    }, [backgrounds, selectedBackgroundId]);
    // Get current background image URL based on view (supports both single and multi-background modes)
    const currentBackgroundUrl = React.useMemo(() => {
        if (selectedBackground) {
            return currentView === "front" ? selectedBackground.frontImage : selectedBackground.backImage;
        }
        return currentView === "front" ? frontBgImage : backBgImage;
    }, [selectedBackground, currentView, frontBgImage, backBgImage]);
    // Get front/back background URLs for export (supports both single and multi-background modes)
    const frontBackgroundUrl = selectedBackground ? selectedBackground.frontImage : frontBgImage;
    const backBackgroundUrl = selectedBackground ? selectedBackground.backImage : backBgImage;
    // Handle background selection change
    const handleBackgroundSelect = React.useCallback((backgroundId) => {
        setSelectedBackgroundId(backgroundId);
        onBackgroundChange === null || onBackgroundChange === void 0 ? void 0 : onBackgroundChange(backgroundId);
    }, [onBackgroundChange]);
    // Load background image based on current view
    React.useEffect(() => {
        if (currentBackgroundUrl) {
            const img = new Image();
            img.onload = () => setBgImage(img);
            img.onerror = () => setError("Грешка при зареждане на изображението");
            img.src = currentBackgroundUrl;
        }
        else {
            setBgImage(null);
        }
    }, [currentBackgroundUrl]);
    const handleImagesChange = React.useCallback((newImages) => {
        setViewImages(prev => {
            const updated = { ...prev, [currentView]: newImages };
            onChange === null || onChange === void 0 ? void 0 : onChange(updated, currentView);
            return updated;
        });
    }, [onChange, currentView]);
    const handleImageLoad = React.useCallback((newImageData) => {
        setViewImages(prev => {
            const newImages = [...prev[currentView], newImageData];
            const updated = { ...prev, [currentView]: newImages };
            onChange === null || onChange === void 0 ? void 0 : onChange(updated, currentView);
            return updated;
        });
        setError(null);
    }, [currentView, onChange]);
    const isMobileMode = responsiveConfig.enabled && responsiveState.isMobile;
    const { inputRef, handleFileChange, handleDrop, handleDragOver, openFilePicker, handlePaste, acceptAttribute, uploadState } = useImageUpload({
        config,
        onImageLoad: handleImageLoad,
        onError: setError,
        isMobile: isMobileMode
    });
    // Listen for clipboard paste events
    React.useEffect(() => {
        const handleGlobalPaste = (e) => handlePaste(e);
        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [handlePaste]);
    const { selectedId, isDragging, isPinching, dragMode, handlePointerDown, handleTouchStart, selectImage, deselectAll, deleteImage, deleteSelected, reorderImage } = useImageTransform({
        images,
        config,
        containerRef,
        onChange: handleImagesChange,
        displayScale: canvasDimensions.scale
    });
    // SVG rotate cursor - same as in Controls.tsx
    const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/%3E%3Cpath d='M21 3v5h-5'/%3E%3C/svg%3E") 12 12, crosshair`;
    // Set cursor on body during rotation to ensure it persists outside the handle
    React.useEffect(() => {
        if (isDragging && dragMode === 'rotate') {
            document.body.style.cursor = ROTATE_CURSOR;
            return () => {
                document.body.style.cursor = '';
            };
        }
    }, [isDragging, dragMode]);
    const handleExport = React.useCallback(async () => {
        if (!onExport)
            return;
        const scale = config.exportScale || 1;
        const canvas = createOffscreenCanvas(config.width * scale, config.height * scale);
        // Helper to load an image
        const loadImage = (src) => {
            if (!src)
                return Promise.resolve(null);
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = src;
            });
        };
        // Load both background images (use computed URLs that support multi-background)
        const [frontBg, backBg] = await Promise.all([
            loadImage(frontBackgroundUrl),
            loadImage(backBackgroundUrl)
        ]);
        // Export front
        const frontDataUrl = await exportToDataUrl(canvas, frontBg, viewImages.front, config);
        // Export back
        const backDataUrl = await exportToDataUrl(canvas, backBg, viewImages.back, config);
        onExport({ front: frontDataUrl, back: backDataUrl });
    }, [config, onExport, frontBackgroundUrl, backBackgroundUrl, viewImages]);
    const handleContainerClick = React.useCallback((e) => {
        // Deselect if clicking on empty area
        if (e.target === containerRef.current) {
            deselectAll();
        }
    }, [deselectAll]);
    // Scale a transform for display (images are stored in original coordinates)
    const scaleTransform = React.useCallback((transform) => {
        const scale = canvasDimensions.scale;
        return {
            position: {
                x: transform.position.x * scale,
                y: transform.position.y * scale
            },
            size: {
                width: transform.size.width * scale,
                height: transform.size.height * scale
            },
            rotation: transform.rotation
        };
    }, [canvasDimensions.scale]);
    const containerStyle = {
        position: "relative",
        width: displayConfig.width,
        height: displayConfig.height,
        backgroundColor: COLORS.LIGHT_GRAY,
        backgroundImage: bgImage ? `url(${currentBackgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden",
        cursor: (isDragging && dragMode !== 'rotate') || isPinching ? "grabbing" : "default",
        userSelect: "none",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
        // Prevent browser touch behaviors during interaction
        touchAction: "none"
    };
    // Wrapper style for responsive layout
    const wrapperStyle = {
        width: '100%',
        overflow: 'hidden',
        fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif"
    };
    // Main layout container style based on layout mode
    const layoutContainerStyle = {
        display: "flex",
        flexDirection: layoutMode === 'vertical' ? 'column' : 'row',
        gap: layoutMode === 'vertical' ? '12px' : '16px',
        alignItems: layoutMode === 'vertical' ? 'center' : 'stretch'
    };
    // Panel container style for mobile drawer
    const panelContainerStyle = layoutMode === 'vertical' ? {
        width: canvasDimensions.width,
        order: 2, // Panel below canvas on mobile
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        borderRadius: '10px'
    } : {
        width: typeof panelWidth === 'number' ? `${panelWidth}px` : panelWidth,
        flexShrink: 0
    };
    // Canvas column style
    const canvasColumnStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: layoutMode === 'vertical' ? 'center' : 'flex-start',
        order: layoutMode === 'vertical' ? 1 : 2,
        // Prevent overflow in horizontal layout
        ...(layoutMode === 'horizontal' ? { flex: 1, minWidth: 0 } : {})
    };
    const dropZoneStyle = {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "12px",
        color: COLORS.GRAY,
        fontSize: "14px",
        pointerEvents: images.length > 0 ? "none" : "auto"
    };
    const [exportButtonHovered, setExportButtonHovered] = React.useState(false);
    const [exportButtonActive, setExportButtonActive] = React.useState(false);
    const [uploadButtonHovered, setUploadButtonHovered] = React.useState(false);
    const [uploadButtonActive, setUploadButtonActive] = React.useState(false);
    const [dropZoneButtonHovered, setDropZoneButtonHovered] = React.useState(false);
    const [dropZoneButtonActive, setDropZoneButtonActive] = React.useState(false);
    const exportButtonStyle = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: canvasDimensions.width,
        padding: "14px 20px",
        marginTop: "12px",
        backgroundColor: COLORS.ACCENT,
        color: COLORS.BLACK,
        border: "none",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "16px",
        fontWeight: 600,
        boxShadow: "0 2px 10px rgba(250, 192, 0, 0.3)",
        transition: "filter 0.1s ease-out, transform 0.1s ease-out",
        ...(exportButtonActive
            ? {
                filter: "brightness(0.9)",
                transform: "scale(0.95)"
            }
            : exportButtonHovered
                ? {
                    filter: "brightness(0.9)"
                }
                : {})
    };
    // Toggle panel collapse (mobile only)
    const togglePanelCollapse = React.useCallback(() => {
        setIsPanelCollapsed(prev => !prev);
    }, []);
    // Collapse panel when selecting/interacting with image on mobile
    const handleMobileImageInteraction = React.useCallback(() => {
        if (layoutMode === 'vertical' && !isPanelCollapsed) {
            setIsPanelCollapsed(true);
        }
    }, [layoutMode, isPanelCollapsed]);
    return (jsxRuntime.jsxs("div", { ref: wrapperRef, className: className, style: { ...wrapperStyle, ...style }, children: [jsxRuntime.jsx("style", { children: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        ` }), jsxRuntime.jsxs("div", { style: layoutContainerStyle, children: [jsxRuntime.jsx("div", { style: panelContainerStyle, children: layoutMode === 'vertical' ? (jsxRuntime.jsxs("div", { style: {
                                backgroundColor: COLORS.WHITE,
                                borderRadius: '10px',
                                overflow: 'hidden'
                            }, children: [backgrounds && backgrounds.length > 1 && (jsxRuntime.jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px',
                                        borderBottom: `1px solid ${COLORS.LIGHT_GRAY}`
                                    }, children: [jsxRuntime.jsx("span", { style: { fontSize: '13px', fontWeight: 600, color: COLORS.DARK_GRAY, marginRight: '4px' }, children: "\u0426\u0432\u044F\u0442:" }), jsxRuntime.jsx("div", { style: { display: 'flex', gap: '6px' }, children: backgrounds.map(bg => (jsxRuntime.jsx("button", { onClick: () => handleBackgroundSelect(bg.id), title: bg.name, style: {
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    border: selectedBackgroundId === bg.id
                                                        ? `3px solid ${COLORS.ACCENT}`
                                                        : `2px solid ${COLORS.GRAY}`,
                                                    backgroundColor: bg.color,
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    transition: 'all 0.2s ease-out',
                                                    boxShadow: selectedBackgroundId === bg.id
                                                        ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                                                        : '0 1px 3px rgba(0, 0, 0, 0.1)'
                                                } }, bg.id))) })] })), jsxRuntime.jsx("div", { style: {
                                        display: 'flex',
                                        padding: '8px',
                                        borderBottom: `1px solid ${COLORS.LIGHT_GRAY}`
                                    }, children: jsxRuntime.jsxs("div", { style: {
                                            display: 'flex',
                                            width: '100%',
                                            backgroundColor: COLORS.LIGHT_GRAY,
                                            borderRadius: '8px',
                                            padding: '4px'
                                        }, children: [jsxRuntime.jsxs("button", { onClick: () => setCurrentView('front'), style: {
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    padding: '10px 12px',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    backgroundColor: currentView === 'front' ? COLORS.WHITE : 'transparent',
                                                    color: currentView === 'front' ? COLORS.DARK_GRAY : COLORS.GRAY,
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease-out',
                                                    boxShadow: currentView === 'front' ? '0 2px 4px rgba(0, 0, 0, 0.08)' : 'none'
                                                }, children: [jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsxRuntime.jsx("path", { d: "M20 21V19a4 4 0 00-4-4H8a4 4 0 00-4 4v2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("circle", { cx: "12", cy: "7", r: "4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }), "\u041E\u0442\u043F\u0440\u0435\u0434"] }), jsxRuntime.jsxs("button", { onClick: () => setCurrentView('back'), style: {
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    padding: '10px 12px',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    backgroundColor: currentView === 'back' ? COLORS.WHITE : 'transparent',
                                                    color: currentView === 'back' ? COLORS.DARK_GRAY : COLORS.GRAY,
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease-out',
                                                    boxShadow: currentView === 'back' ? '0 2px 4px rgba(0, 0, 0, 0.08)' : 'none'
                                                }, children: [jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsxRuntime.jsx("path", { d: "M20 21V19a4 4 0 00-4-4H8a4 4 0 00-4 4v2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("circle", { cx: "12", cy: "7", r: "4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("path", { d: "M3 3l18 18", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })] }), "\u041E\u0442\u0437\u0430\u0434"] })] }) }), jsxRuntime.jsx("div", { style: { padding: '12px 12px 8px' }, children: jsxRuntime.jsxs("button", { onClick: openFilePicker, onMouseEnter: () => setUploadButtonHovered(true), onMouseLeave: () => {
                                            setUploadButtonHovered(false);
                                            setUploadButtonActive(false);
                                        }, onMouseDown: () => setUploadButtonActive(true), onMouseUp: () => setUploadButtonActive(false), style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            padding: '16px 20px',
                                            minHeight: '52px',
                                            backgroundColor: COLORS.ACCENT,
                                            color: COLORS.BLACK,
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            boxShadow: '0 2px 10px rgba(250, 192, 0, 0.3)',
                                            touchAction: 'manipulation',
                                            transition: 'filter 0.1s ease-out, transform 0.1s ease-out',
                                            ...(uploadButtonActive
                                                ? {
                                                    filter: 'brightness(0.9)',
                                                    transform: 'scale(0.95)'
                                                }
                                                : uploadButtonHovered
                                                    ? {
                                                        filter: 'brightness(0.9)'
                                                    }
                                                    : {})
                                        }, children: [jsxRuntime.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsxRuntime.jsx("path", { d: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("circle", { cx: "12", cy: "13", r: "4", stroke: "currentColor", strokeWidth: "2" })] }), "\u041A\u0430\u0447\u0438 \u0441\u043D\u0438\u043C\u043A\u0430"] }) }), jsxRuntime.jsxs("button", { onClick: togglePanelCollapse, style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '14px 16px',
                                        backgroundColor: COLORS.WHITE,
                                        border: 'none',
                                        borderBottom: isPanelCollapsed ? 'none' : `1px solid ${COLORS.LIGHT_GRAY}`,
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: COLORS.DARK_GRAY
                                    }, children: [jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: {
                                                transform: isPanelCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                                                transition: 'transform 0.3s ease-out'
                                            }, children: jsxRuntime.jsx("path", { d: "M4 6l4 4 4-4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }), isPanelCollapsed ? 'Покажи слоевете' : 'Скрий слоевете'] }), jsxRuntime.jsx("div", { style: {
                                        maxHeight: isPanelCollapsed ? '0' : '350px',
                                        overflow: 'hidden',
                                        transition: 'max-height 0.3s ease-out'
                                    }, children: jsxRuntime.jsx(LayerPanel, { images: images, selectedId: selectedId, onSelect: (id) => {
                                            selectImage(id);
                                            handleMobileImageInteraction();
                                        }, onDelete: deleteImage, onReorder: reorderImage, onAddImage: openFilePicker, currentView: currentView, onViewChange: setCurrentView, compact: true, isMobile: true, hideAddButton: true }) })] })) : (jsxRuntime.jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: [backgrounds && backgrounds.length > 1 && (jsxRuntime.jsxs("div", { style: {
                                        backgroundColor: COLORS.WHITE,
                                        borderRadius: '10px',
                                        padding: '12px',
                                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
                                    }, children: [jsxRuntime.jsx("span", { style: { fontSize: '12px', fontWeight: 600, color: COLORS.DARK_GRAY, display: 'block', marginBottom: '10px' }, children: "\u0426\u0432\u044F\u0442" }), jsxRuntime.jsx("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: backgrounds.map(bg => (jsxRuntime.jsx("button", { onClick: () => handleBackgroundSelect(bg.id), title: bg.name, style: {
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    border: selectedBackgroundId === bg.id
                                                        ? `3px solid ${COLORS.ACCENT}`
                                                        : `2px solid ${COLORS.GRAY}`,
                                                    backgroundColor: bg.color,
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    transition: 'all 0.2s ease-out',
                                                    boxShadow: selectedBackgroundId === bg.id
                                                        ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                                                        : '0 1px 3px rgba(0, 0, 0, 0.1)'
                                                } }, bg.id))) })] })), jsxRuntime.jsx(LayerPanel, { images: images, selectedId: selectedId, onSelect: (id) => {
                                        selectImage(id);
                                        handleMobileImageInteraction();
                                    }, onDelete: deleteImage, onReorder: reorderImage, onAddImage: openFilePicker, currentView: currentView, onViewChange: setCurrentView, compact: false, isMobile: false })] })) }), jsxRuntime.jsxs("div", { style: canvasColumnStyle, children: [error && (jsxRuntime.jsxs("div", { style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "12px 16px",
                                    marginBottom: "12px",
                                    backgroundColor: "#FFEBEB",
                                    color: COLORS.RED,
                                    borderRadius: "10px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    boxShadow: "0 2px 10px rgba(255, 0, 0, 0.1)",
                                    width: canvasDimensions.width,
                                    maxWidth: "100%",
                                    boxSizing: "border-box"
                                }, children: [jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: { flexShrink: 0 }, children: jsxRuntime.jsx("path", { d: "M8 5.333V8M8 10.667h.007M14.667 8A6.667 6.667 0 111.333 8a6.667 6.667 0 0113.334 0z", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }), jsxRuntime.jsx("span", { style: { overflow: "hidden", textOverflow: "ellipsis" }, children: error })] })), jsxRuntime.jsxs("div", { ref: containerRef, style: containerStyle, onDrop: handleDrop, onDragOver: handleDragOver, onClick: handleContainerClick, children: [images.length === 0 && (jsxRuntime.jsx("div", { style: {
                                            ...dropZoneStyle,
                                            zIndex: isMobileMode ? 10 : undefined
                                        }, children: jsxRuntime.jsxs("div", { style: {
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                padding: isMobileMode ? "24px 20px" : "32px",
                                                border: `2px dashed ${COLORS.GRAY}`,
                                                borderRadius: "20px",
                                                backgroundColor: COLORS.WHITE,
                                                maxWidth: isMobileMode ? "90%" : "280px",
                                                textAlign: "center",
                                                boxShadow: isMobileMode ? "0 4px 20px rgba(0, 0, 0, 0.1)" : undefined
                                            }, children: [jsxRuntime.jsx("div", { style: {
                                                        width: isMobileMode ? "64px" : "56px",
                                                        height: isMobileMode ? "64px" : "56px",
                                                        borderRadius: "50%",
                                                        backgroundColor: "#FEF9E7",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        marginBottom: "16px",
                                                        boxShadow: "0 2px 10px rgba(250, 192, 0, 0.2)"
                                                    }, children: isMobileMode ? (
                                                    // Camera icon for mobile
                                                    jsxRuntime.jsxs("svg", { width: "28", height: "28", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsxRuntime.jsx("path", { d: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z", stroke: COLORS.ACCENT, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsxRuntime.jsx("circle", { cx: "12", cy: "13", r: "4", stroke: COLORS.ACCENT, strokeWidth: "2" })] })) : (jsxRuntime.jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: jsxRuntime.jsx("path", { d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", stroke: COLORS.ACCENT, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })) }), jsxRuntime.jsx("span", { style: { fontWeight: 600, color: COLORS.DARK_GRAY, marginBottom: "4px", fontSize: isMobileMode ? "15px" : "14px" }, children: isMobileMode ? "Докоснете за качване" : "Пуснете изображение тук" }), jsxRuntime.jsx("span", { style: { color: COLORS.GRAY, fontSize: isMobileMode ? "14px" : "13px", marginBottom: "16px" }, children: isMobileMode ? "от камера или галерия" : "или кликнете за избор" }), jsxRuntime.jsx("button", { onClick: openFilePicker, onMouseEnter: () => setDropZoneButtonHovered(true), onMouseLeave: () => {
                                                        setDropZoneButtonHovered(false);
                                                        setDropZoneButtonActive(false);
                                                    }, onMouseDown: () => setDropZoneButtonActive(true), onMouseUp: () => setDropZoneButtonActive(false), style: {
                                                        padding: isMobileMode ? "16px 32px" : "12px 24px",
                                                        minHeight: isMobileMode ? "52px" : "auto",
                                                        backgroundColor: COLORS.ACCENT,
                                                        color: COLORS.BLACK,
                                                        border: "none",
                                                        borderRadius: "10px",
                                                        cursor: "pointer",
                                                        fontWeight: 600,
                                                        fontSize: isMobileMode ? "16px" : "14px",
                                                        boxShadow: "0 2px 10px rgba(250, 192, 0, 0.3)",
                                                        transition: "filter 0.1s ease-out, transform 0.1s ease-out",
                                                        touchAction: "manipulation",
                                                        ...(dropZoneButtonActive
                                                            ? {
                                                                filter: "brightness(0.9)",
                                                                transform: "scale(0.95)"
                                                            }
                                                            : dropZoneButtonHovered
                                                                ? {
                                                                    filter: "brightness(0.9)"
                                                                }
                                                                : {})
                                                    }, children: isMobileMode ? "Избери снимка" : "Избери файл" }), jsxRuntime.jsx("span", { style: { color: COLORS.GRAY, fontSize: isMobileMode ? "12px" : "11px", marginTop: "12px" }, children: "PNG, JPG, WebP, GIF \u0434\u043E 10MB" })] }) })), uploadState.isUploading && (jsxRuntime.jsxs("div", { style: {
                                            position: "absolute",
                                            inset: 0,
                                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "16px",
                                            zIndex: 200,
                                            borderRadius: "10px"
                                        }, children: [jsxRuntime.jsx("div", { style: {
                                                    width: isMobileMode ? "64px" : "56px",
                                                    height: isMobileMode ? "64px" : "56px",
                                                    borderRadius: "50%",
                                                    backgroundColor: "#FEF9E7",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    boxShadow: "0 2px 10px rgba(250, 192, 0, 0.2)"
                                                }, children: jsxRuntime.jsx("svg", { width: isMobileMode ? "28" : "24", height: isMobileMode ? "28" : "24", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: {
                                                        animation: "spin 1s linear infinite"
                                                    }, children: jsxRuntime.jsx("path", { d: "M12 2v4m0 12v4m-6-10H2m20 0h-4m-1.343-5.657l-2.829 2.829m-5.656 5.656l-2.829 2.829m11.314 0l-2.829-2.829m-5.656-5.656L4.686 6.343", stroke: COLORS.ACCENT, strokeWidth: "2", strokeLinecap: "round" }) }) }), jsxRuntime.jsx("span", { style: { fontWeight: 600, color: COLORS.DARK_GRAY, fontSize: isMobileMode ? "15px" : "14px" }, children: "\u041A\u0430\u0447\u0432\u0430\u043D\u0435..." }), jsxRuntime.jsx("div", { style: {
                                                    width: "80%",
                                                    maxWidth: "200px",
                                                    height: "6px",
                                                    backgroundColor: COLORS.LIGHT_GRAY,
                                                    borderRadius: "3px",
                                                    overflow: "hidden"
                                                }, children: jsxRuntime.jsx("div", { style: {
                                                        width: `${uploadState.progress}%`,
                                                        height: "100%",
                                                        backgroundColor: COLORS.ACCENT,
                                                        borderRadius: "3px",
                                                        transition: "width 0.2s ease-out"
                                                    } }) }), uploadState.fileName && (jsxRuntime.jsx("span", { style: { color: COLORS.GRAY, fontSize: isMobileMode ? "13px" : "12px", maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: uploadState.fileName }))] })), displayConfig.printableArea && (jsxRuntime.jsx("div", { style: {
                                            position: "absolute",
                                            left: displayConfig.printableArea.minX,
                                            top: displayConfig.printableArea.minY,
                                            width: displayConfig.printableArea.maxX - displayConfig.printableArea.minX,
                                            height: displayConfig.printableArea.maxY - displayConfig.printableArea.minY,
                                            overflow: "hidden",
                                            pointerEvents: "none"
                                        }, children: images.map(imageData => {
                                            const scaledTransform = scaleTransform(imageData.transform);
                                            // Adjust position relative to printable area
                                            const imageStyle = {
                                                position: "absolute",
                                                left: scaledTransform.position.x - displayConfig.printableArea.minX,
                                                top: scaledTransform.position.y - displayConfig.printableArea.minY,
                                                width: scaledTransform.size.width,
                                                height: scaledTransform.size.height,
                                                transform: scaledTransform.rotation ? `rotate(${scaledTransform.rotation}deg)` : undefined,
                                                transformOrigin: "center center",
                                                userSelect: "none",
                                                pointerEvents: "none"
                                            };
                                            return (jsxRuntime.jsx("img", { src: imageData.src, alt: "\u041A\u0430\u0447\u0435\u043D \u0434\u0438\u0437\u0430\u0439\u043D", style: imageStyle, draggable: false }, imageData.id));
                                        }) })), images.map(imageData => {
                                        const scaledTransform = scaleTransform(imageData.transform);
                                        const isSelected = imageData.id === selectedId;
                                        const imageStyle = {
                                            position: "absolute",
                                            left: scaledTransform.position.x,
                                            top: scaledTransform.position.y,
                                            width: scaledTransform.size.width,
                                            height: scaledTransform.size.height,
                                            transform: scaledTransform.rotation ? `rotate(${scaledTransform.rotation}deg)` : undefined,
                                            transformOrigin: "center center",
                                            cursor: isDragging ? "grabbing" : "move",
                                            userSelect: "none",
                                            pointerEvents: "auto",
                                            opacity: displayConfig.printableArea ? 0 : 1,
                                            // Prevent touch behaviors on image
                                            touchAction: "none"
                                        };
                                        return (jsxRuntime.jsxs(React.Fragment, { children: [jsxRuntime.jsx("img", { src: imageData.src, alt: "\u041A\u0430\u0447\u0435\u043D \u0434\u0438\u0437\u0430\u0439\u043D", style: imageStyle, draggable: false, onPointerDown: e => {
                                                        handleMobileImageInteraction();
                                                        handlePointerDown(e, imageData.id, "move");
                                                    }, onTouchStart: e => {
                                                        handleMobileImageInteraction();
                                                        handleTouchStart(e, imageData.id);
                                                    }, onClick: e => {
                                                        e.stopPropagation();
                                                        selectImage(imageData.id);
                                                        handleMobileImageInteraction();
                                                    }, onContextMenu: e => e.preventDefault() }), isSelected && (jsxRuntime.jsx(Controls, { transform: scaledTransform, allowRotation: displayConfig.allowRotation || false, onPointerDown: (e, mode, handle) => handlePointerDown(e, imageData.id, mode, handle), isMobile: responsiveConfig.enabled && responsiveState.isMobile }))] }, imageData.id));
                                    }), displayConfig.printableArea && (jsxRuntime.jsx("div", { style: {
                                            position: "absolute",
                                            left: displayConfig.printableArea.minX,
                                            top: displayConfig.printableArea.minY,
                                            width: displayConfig.printableArea.maxX - displayConfig.printableArea.minX,
                                            height: displayConfig.printableArea.maxY - displayConfig.printableArea.minY,
                                            border: `1.5px dashed rgba(74, 74, 74, 0.4)`,
                                            borderRadius: "4px",
                                            boxSizing: "border-box",
                                            pointerEvents: "none"
                                        } }))] }), onExport && (jsxRuntime.jsxs("button", { style: exportButtonStyle, onClick: handleExport, onMouseEnter: () => setExportButtonHovered(true), onMouseLeave: () => {
                                    setExportButtonHovered(false);
                                    setExportButtonActive(false);
                                }, onMouseDown: () => setExportButtonActive(true), onMouseUp: () => setExportButtonActive(false), children: [jsxRuntime.jsx("svg", { width: "18", height: "18", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: jsxRuntime.jsx("path", { d: "M14 10v2.667A1.334 1.334 0 0112.667 14H3.333A1.334 1.334 0 012 12.667V10M4.667 6.667L8 3.333l3.333 3.334M8 3.333V10", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }), "\u0417\u0430\u0432\u044A\u0440\u0448\u0438 \u0434\u0438\u0437\u0430\u0439\u043D"] }))] })] }), jsxRuntime.jsx("input", { ref: inputRef, type: "file", accept: acceptAttribute, onChange: handleFileChange, style: { display: "none" } })] }));
}

exports.Controls = Controls;
exports.LayerPanel = LayerPanel;
exports.TShirtBuilder = TShirtBuilder;
exports.createOffscreenCanvas = createOffscreenCanvas;
exports.exportToDataUrl = exportToDataUrl;
exports.useImageTransform = useImageTransform;
exports.useImageUpload = useImageUpload;
exports.useResponsive = useResponsive;
//# sourceMappingURL=index.cjs.js.map
