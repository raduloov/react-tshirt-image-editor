import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import React, { useRef, useCallback, useState, useEffect } from 'react';

const DEFAULT_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
function generateId() {
    return Math.random().toString(36).substring(2, 11);
}
function useImageUpload({ config, onImageLoad, onError }) {
    const inputRef = useRef(null);
    const acceptedTypes = config.acceptedFileTypes || DEFAULT_ACCEPTED_TYPES;
    const maxFileSize = config.maxFileSize || DEFAULT_MAX_FILE_SIZE;
    const processFile = useCallback((file) => {
        // Validate file type
        if (!acceptedTypes.includes(file.type)) {
            onError === null || onError === void 0 ? void 0 : onError(`Невалиден тип файл. Позволени: ${acceptedTypes.join(', ')}`);
            return;
        }
        // Validate file size
        if (file.size > maxFileSize) {
            onError === null || onError === void 0 ? void 0 : onError(`Файлът е твърде голям. Максимален размер: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            var _a;
            const src = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
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
                onImageLoad({
                    id: generateId(),
                    src,
                    naturalWidth,
                    naturalHeight,
                    transform,
                });
            };
            img.onerror = () => {
                onError === null || onError === void 0 ? void 0 : onError('Грешка при зареждане на изображението');
            };
            img.src = src;
        };
        reader.onerror = () => {
            onError === null || onError === void 0 ? void 0 : onError('Грешка при четене на файла');
        };
        reader.readAsDataURL(file);
    }, [acceptedTypes, maxFileSize, config, onImageLoad, onError]);
    const handleFileChange = useCallback((event) => {
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
    const handleDrop = useCallback((event) => {
        var _a;
        event.preventDefault();
        event.stopPropagation();
        const file = (_a = event.dataTransfer.files) === null || _a === void 0 ? void 0 : _a[0];
        if (file) {
            processFile(file);
        }
    }, [processFile]);
    const handleDragOver = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);
    const openFilePicker = useCallback(() => {
        var _a;
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.click();
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

function useImageTransform({ images, config, containerRef, onChange }) {
    const [selectedId, setSelectedId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState(null);
    const dragStateRef = useRef(null);
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
        }
        else if (images.length === 0) {
            setSelectedId(null);
        }
        else if (selectedId && !images.find((img) => img.id === selectedId)) {
            // Selected image was removed, select the last one
            setSelectedId(images.length > 0 ? images[images.length - 1].id : null);
        }
    }, [images, selectedId]);
    const clampTransform = useCallback((newTransform) => {
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
    }, []);
    const updateImageTransform = useCallback((imageId, newTransform) => {
        var _a;
        const clamped = clampTransform(newTransform);
        const updatedImages = imagesRef.current.map((img) => img.id === imageId ? { ...img, transform: clamped } : img);
        (_a = onChangeRef.current) === null || _a === void 0 ? void 0 : _a.call(onChangeRef, updatedImages);
    }, [clampTransform]);
    const handleMouseDown = useCallback((event, imageId, mode, handle) => {
        const image = imagesRef.current.find((img) => img.id === imageId);
        if (!image)
            return;
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
    }, []);
    const handleMouseMove = useCallback((event) => {
        const dragState = dragStateRef.current;
        if (!dragState)
            return;
        const image = imagesRef.current.find((img) => img.id === dragState.imageId);
        if (!image)
            return;
        const deltaX = event.clientX - dragState.startPosition.x;
        const deltaY = event.clientY - dragState.startPosition.y;
        let newTransform;
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
                if (!container)
                    return;
                const rect = container.getBoundingClientRect();
                // Image center in local (canvas) coordinates
                const centerX = dragState.startTransform.position.x +
                    dragState.startTransform.size.width / 2;
                const centerY = dragState.startTransform.position.y +
                    dragState.startTransform.size.height / 2;
                // Convert mouse positions to local coordinates
                const startLocalX = dragState.startPosition.x - rect.left;
                const startLocalY = dragState.startPosition.y - rect.top;
                const currentLocalX = event.clientX - rect.left;
                const currentLocalY = event.clientY - rect.top;
                const startAngle = Math.atan2(startLocalY - centerY, startLocalX - centerX);
                const currentAngle = Math.atan2(currentLocalY - centerY, currentLocalX - centerX);
                const rotation = dragState.startTransform.rotation +
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
    }, [containerRef, updateImageTransform]);
    const handleMouseUp = useCallback(() => {
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
    const selectImage = useCallback((imageId) => {
        setSelectedId(imageId);
    }, []);
    const deselectAll = useCallback(() => {
        setSelectedId(null);
    }, []);
    const deleteImage = useCallback((imageId) => {
        var _a;
        const updatedImages = imagesRef.current.filter((img) => img.id !== imageId);
        (_a = onChangeRef.current) === null || _a === void 0 ? void 0 : _a.call(onChangeRef, updatedImages);
    }, []);
    const deleteSelected = useCallback(() => {
        if (selectedId) {
            deleteImage(selectedId);
        }
    }, [selectedId, deleteImage]);
    const bringToFront = useCallback((imageId) => {
        var _a;
        const images = imagesRef.current;
        const image = images.find((img) => img.id === imageId);
        if (!image)
            return;
        const others = images.filter((img) => img.id !== imageId);
        (_a = onChangeRef.current) === null || _a === void 0 ? void 0 : _a.call(onChangeRef, [...others, image]);
    }, []);
    const sendToBack = useCallback((imageId) => {
        var _a;
        const images = imagesRef.current;
        const image = images.find((img) => img.id === imageId);
        if (!image)
            return;
        const others = images.filter((img) => img.id !== imageId);
        (_a = onChangeRef.current) === null || _a === void 0 ? void 0 : _a.call(onChangeRef, [image, ...others]);
    }, []);
    const reorderImage = useCallback((fromIndex, toIndex) => {
        var _a;
        const images = imagesRef.current;
        if (fromIndex < 0 || fromIndex >= images.length)
            return;
        if (toIndex < 0 || toIndex >= images.length)
            return;
        if (fromIndex === toIndex)
            return;
        const newImages = [...images];
        const [moved] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, moved);
        (_a = onChangeRef.current) === null || _a === void 0 ? void 0 : _a.call(onChangeRef, newImages);
    }, []);
    return {
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
    };
}

const HANDLE_SIZE = 10;
const ACCENT_COLOR = '#4A4A4A'; // dark gray - subtle and professional
// SVG rotate cursor icon encoded as data URI
const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/%3E%3Cpath d='M21 3v5h-5'/%3E%3C/svg%3E") 12 12, crosshair`;
const handleStyle = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: '#ffffff',
    border: `2px solid ${ACCENT_COLOR}`,
    borderRadius: '50%',
    boxSizing: 'border-box',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
};
const rotateHandleStyle = {
    position: 'absolute',
    width: HANDLE_SIZE + 2,
    height: HANDLE_SIZE + 2,
    backgroundColor: ACCENT_COLOR,
    border: '2px solid #fff',
    borderRadius: '50%',
    boxSizing: 'border-box',
    cursor: ROTATE_CURSOR,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
};
function Controls({ transform, allowRotation, onMouseDown }) {
    const { position, size, rotation } = transform;
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
    const borderStyle = {
        position: 'absolute',
        inset: -1,
        border: `2px solid ${ACCENT_COLOR}`,
        borderRadius: '4px',
        pointerEvents: 'none',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    };
    const handles = [
        {
            position: 'nw',
            style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nwse-resize' },
        },
        {
            position: 'ne',
            style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'nesw-resize' },
        },
        {
            position: 'sw',
            style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nesw-resize' },
        },
        {
            position: 'se',
            style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'nwse-resize' },
        },
    ];
    return (jsxs("div", { style: containerStyle, children: [jsx("div", { style: borderStyle }), handles.map(({ position: pos, style }) => (jsx("div", { style: { ...handleStyle, ...style, pointerEvents: 'auto' }, onMouseDown: (e) => onMouseDown(e, 'resize', pos) }, pos))), allowRotation && (jsxs(Fragment, { children: [jsx("div", { style: {
                            position: 'absolute',
                            top: -28,
                            left: '50%',
                            width: 1.5,
                            height: 18,
                            backgroundColor: ACCENT_COLOR,
                            transform: 'translateX(-50%)',
                            opacity: 0.8,
                        } }), jsx("div", { style: {
                            ...rotateHandleStyle,
                            top: -34 - HANDLE_SIZE / 2,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'auto',
                        }, onMouseDown: (e) => onMouseDown(e, 'rotate') })] }))] }));
}

const ITEM_HEIGHT = 56; // Height of each layer item in pixels
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
    width: "220px",
    backgroundColor: COLORS$1.WHITE,
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif"
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
    maxHeight: "320px",
    overflowY: "auto",
    position: "relative"
};
const emptyStyle = {
    padding: "32px 20px",
    textAlign: "center",
    color: COLORS$1.GRAY,
    fontSize: "13px"
};
const dragHandleStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    cursor: "grab",
    padding: "6px 4px",
    borderRadius: "4px",
    transition: "background-color 0.3s ease-out"
};
const dragLineStyle = {
    width: "10px",
    height: "2px",
    backgroundColor: COLORS$1.GRAY,
    borderRadius: "1px"
};
// Plus icon for add button
const PlusIcon = () => (jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: jsx("path", { d: "M8 3v10M3 8h10", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }) }));
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
function LayerPanel({ images, selectedId, onSelect, onDelete, onReorder, onAddImage, currentView, onViewChange }) {
    const [dragState, setDragState] = useState(null);
    const listRef = useRef(null);
    // Reverse to show top layer first (last in array = top = first in list)
    const reversedImages = [...images].reverse();
    const handleMouseDown = useCallback((e, reversedIndex) => {
        e.preventDefault();
        e.stopPropagation();
        setDragState({
            draggingIndex: reversedIndex,
            startY: e.clientY,
            currentY: e.clientY
        });
    }, []);
    const handleMouseMove = useCallback((e) => {
        if (!dragState)
            return;
        setDragState(prev => prev
            ? {
                ...prev,
                currentY: e.clientY
            }
            : null);
    }, [dragState]);
    const handleMouseUp = useCallback(() => {
        if (!dragState)
            return;
        const deltaY = dragState.currentY - dragState.startY;
        const indexDelta = Math.round(deltaY / ITEM_HEIGHT);
        const newReversedIndex = Math.max(0, Math.min(reversedImages.length - 1, dragState.draggingIndex + indexDelta));
        if (newReversedIndex !== dragState.draggingIndex) {
            // Convert reversed indices to original indices
            const fromOriginal = images.length - 1 - dragState.draggingIndex;
            const toOriginal = images.length - 1 - newReversedIndex;
            onReorder(fromOriginal, toOriginal);
        }
        setDragState(null);
    }, [dragState, reversedImages.length, images.length, onReorder]);
    useEffect(() => {
        if (dragState) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };
        }
    }, [dragState, handleMouseMove, handleMouseUp]);
    const handleDelete = (e, id) => {
        e.stopPropagation();
        onDelete(id);
    };
    // Calculate visual positions during drag
    const getItemStyle = (reversedIndex, isSelected) => {
        const isDragging = (dragState === null || dragState === void 0 ? void 0 : dragState.draggingIndex) === reversedIndex;
        let transform = "translateY(0)";
        let zIndex = 1;
        let boxShadow = isSelected
            ? `0 0 0 2px ${COLORS$1.ACCENT}, 0 2px 10px rgba(250, 192, 0, 0.15)`
            : "0 1px 3px rgba(0, 0, 0, 0.05)";
        let transition = "transform 0.3s ease-out, background-color 0.3s ease-out, box-shadow 0.3s ease-out, border-color 0.3s ease-out";
        if (dragState) {
            if (isDragging) {
                // The dragged item follows the mouse
                const deltaY = dragState.currentY - dragState.startY;
                transform = `translateY(${deltaY}px) scale(1.02)`;
                zIndex = 100;
                boxShadow = "0 8px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0, 0, 0, 0.1)";
                transition = "box-shadow 0.3s ease-out";
            }
            else {
                // Other items shift to make room
                const draggedIndex = dragState.draggingIndex;
                const deltaY = dragState.currentY - dragState.startY;
                const targetIndex = Math.round(deltaY / ITEM_HEIGHT) + draggedIndex;
                const clampedTarget = Math.max(0, Math.min(reversedImages.length - 1, targetIndex));
                if (draggedIndex < reversedIndex && clampedTarget >= reversedIndex) {
                    // Dragged item moved down past this item - shift up
                    transform = `translateY(-${ITEM_HEIGHT}px)`;
                }
                else if (draggedIndex > reversedIndex && clampedTarget <= reversedIndex) {
                    // Dragged item moved up past this item - shift down
                    transform = `translateY(${ITEM_HEIGHT}px)`;
                }
            }
        }
        return {
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            marginBottom: "6px",
            borderRadius: "10px",
            border: `1px solid ${isSelected ? COLORS$1.ACCENT : COLORS$1.LIGHT_GRAY}`,
            backgroundColor: isDragging ? COLORS$1.WHITE : isSelected ? "#FEF9E7" : COLORS$1.WHITE,
            cursor: "pointer",
            position: "relative",
            zIndex,
            transform,
            transition,
            boxShadow,
            height: `${ITEM_HEIGHT}px`,
            boxSizing: "border-box"
        };
    };
    const thumbnailStyle = {
        width: "36px",
        height: "36px",
        objectFit: "contain",
        backgroundColor: COLORS$1.LIGHT_GRAY,
        borderRadius: "8px",
        border: `1px solid ${COLORS$1.LIGHT_GRAY}`,
        padding: "2px"
    };
    const labelStyle = {
        flex: 1,
        fontSize: "13px",
        fontWeight: 500,
        color: COLORS$1.DARK_GRAY,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
    };
    const deleteButtonStyle = {
        width: "28px",
        height: "28px",
        padding: 0,
        border: "none",
        borderRadius: "50%",
        backgroundColor: "transparent",
        color: COLORS$1.GRAY,
        cursor: "pointer",
        fontSize: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease-out"
    };
    const deleteButtonHoverStyle = {
        ...deleteButtonStyle,
        backgroundColor: "#FFEBEB",
        color: COLORS$1.RED,
        transform: "scale(1.1)"
    };
    // Delete button with hover state
    const [hoveredDeleteId, setHoveredDeleteId] = useState(null);
    const [addButtonHovered, setAddButtonHovered] = useState(false);
    const [addButtonActive, setAddButtonActive] = useState(false);
    // Front icon
    const FrontIcon = () => (jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsx("path", { d: "M20 21V19a4 4 0 00-4-4H8a4 4 0 00-4 4v2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsx("circle", { cx: "12", cy: "7", r: "4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
    // Back icon
    const BackIcon = () => (jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsx("path", { d: "M20 21V19a4 4 0 00-4-4H8a4 4 0 00-4 4v2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsx("circle", { cx: "12", cy: "7", r: "4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), jsx("path", { d: "M3 3l18 18", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })] }));
    return (jsxs("div", { style: panelStyle, children: [jsx("div", { style: headerStyle, children: jsxs("div", { style: viewToggleContainerStyle, children: [jsxs("button", { style: getViewButtonStyle(currentView === "front"), onClick: () => onViewChange("front"), children: [jsx(FrontIcon, {}), "\u041E\u0442\u043F\u0440\u0435\u0434"] }), jsxs("button", { style: getViewButtonStyle(currentView === "back"), onClick: () => onViewChange("back"), children: [jsx(BackIcon, {}), "\u041E\u0442\u0437\u0430\u0434"] })] }) }), jsx("div", { style: { padding: "12px 12px 4px" }, children: jsxs("button", { style: {
                        ...addButtonStyle,
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
                    }, onMouseDown: () => setAddButtonActive(true), onMouseUp: () => setAddButtonActive(false), children: [jsx(PlusIcon, {}), "\u0414\u043E\u0431\u0430\u0432\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435"] }) }), images.length === 0 ? (jsxs("div", { style: emptyStyle, children: [jsx("div", { style: { marginBottom: "4px", opacity: 0.6 }, children: jsxs("svg", { width: "24", height: "24", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [jsx("path", { d: "M8 1L1 4.5L8 8L15 4.5L8 1Z", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }), jsx("path", { d: "M1 11.5L8 15L15 11.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }), jsx("path", { d: "M1 8L8 11.5L15 8", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })] }) }), "\u041D\u044F\u043C\u0430 \u0441\u043B\u043E\u0435\u0432\u0435"] })) : (jsx("ul", { ref: listRef, style: listStyle, children: reversedImages.map((image, reversedIndex) => {
                    const originalIndex = images.length - 1 - reversedIndex;
                    const isSelected = image.id === selectedId;
                    const isDragging = (dragState === null || dragState === void 0 ? void 0 : dragState.draggingIndex) === reversedIndex;
                    return (jsxs("li", { style: getItemStyle(reversedIndex, isSelected), onClick: () => !dragState && onSelect(image.id), children: [jsxs("div", { style: {
                                    ...dragHandleStyle,
                                    cursor: isDragging ? "grabbing" : "grab",
                                    backgroundColor: isDragging ? "#e2e8f0" : "transparent"
                                }, onMouseDown: e => handleMouseDown(e, reversedIndex), children: [jsx("div", { style: dragLineStyle }), jsx("div", { style: dragLineStyle }), jsx("div", { style: dragLineStyle })] }), jsx("img", { src: image.src, alt: `Layer ${originalIndex + 1}`, style: thumbnailStyle, draggable: false }), jsxs("span", { style: labelStyle, children: ["\u0421\u043B\u043E\u0439 ", originalIndex + 1] }), jsx("button", { style: hoveredDeleteId === image.id ? deleteButtonHoverStyle : deleteButtonStyle, onClick: e => handleDelete(e, image.id), onMouseEnter: () => setHoveredDeleteId(image.id), onMouseLeave: () => setHoveredDeleteId(null), title: "\u0418\u0437\u0442\u0440\u0438\u0439 \u0441\u043B\u043E\u0439", children: jsx("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: jsx("path", { d: "M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) })] }, image.id));
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
function TShirtBuilder({ frontBgImage, backBgImage, config: configProp, onChange, onExport, className, style, initialImages }) {
    const config = { ...DEFAULT_CONFIG, ...configProp };
    const [currentView, setCurrentView] = useState("front");
    const [viewImages, setViewImages] = useState(initialImages || { front: [], back: [] });
    const [bgImage, setBgImage] = useState(null);
    const [error, setError] = useState(null);
    const containerRef = useRef(null);
    // Get current images based on view
    const images = viewImages[currentView];
    // Get current background image URL based on view
    const currentBackgroundUrl = currentView === "front" ? frontBgImage : backBgImage;
    // Load background image based on current view
    useEffect(() => {
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
    const handleImagesChange = useCallback((newImages) => {
        setViewImages(prev => {
            const updated = { ...prev, [currentView]: newImages };
            onChange === null || onChange === void 0 ? void 0 : onChange(updated, currentView);
            return updated;
        });
    }, [onChange, currentView]);
    const handleImageLoad = useCallback((newImageData) => {
        setViewImages(prev => {
            const newImages = [...prev[currentView], newImageData];
            const updated = { ...prev, [currentView]: newImages };
            onChange === null || onChange === void 0 ? void 0 : onChange(updated, currentView);
            return updated;
        });
        setError(null);
    }, [currentView, onChange]);
    const { inputRef, handleFileChange, handleDrop, handleDragOver, openFilePicker, acceptedTypes } = useImageUpload({
        config,
        onImageLoad: handleImageLoad,
        onError: setError
    });
    const { selectedId, isDragging, dragMode, handleMouseDown, selectImage, deselectAll, deleteImage, deleteSelected, reorderImage } = useImageTransform({
        images,
        config,
        containerRef,
        onChange: handleImagesChange
    });
    // SVG rotate cursor - same as in Controls.tsx
    const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/%3E%3Cpath d='M21 3v5h-5'/%3E%3C/svg%3E") 12 12, crosshair`;
    // Set cursor on body during rotation to ensure it persists outside the handle
    useEffect(() => {
        if (isDragging && dragMode === 'rotate') {
            document.body.style.cursor = ROTATE_CURSOR;
            return () => {
                document.body.style.cursor = '';
            };
        }
    }, [isDragging, dragMode]);
    const handleExport = useCallback(async () => {
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
        // Load both background images
        const [frontBg, backBg] = await Promise.all([
            loadImage(frontBgImage),
            loadImage(backBgImage)
        ]);
        // Export front
        const frontDataUrl = await exportToDataUrl(canvas, frontBg, viewImages.front, config);
        // Export back
        const backDataUrl = await exportToDataUrl(canvas, backBg, viewImages.back, config);
        onExport({ front: frontDataUrl, back: backDataUrl });
    }, [config, onExport, frontBgImage, backBgImage, viewImages]);
    const handleContainerClick = useCallback((e) => {
        // Deselect if clicking on empty area
        if (e.target === containerRef.current) {
            deselectAll();
        }
    }, [deselectAll]);
    const containerStyle = {
        position: "relative",
        width: config.width,
        height: config.height,
        backgroundColor: COLORS.LIGHT_GRAY,
        backgroundImage: bgImage ? `url(${currentBackgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden",
        cursor: isDragging && dragMode !== 'rotate' ? "grabbing" : "default",
        userSelect: "none",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif"
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
    const [exportButtonHovered, setExportButtonHovered] = useState(false);
    const [exportButtonActive, setExportButtonActive] = useState(false);
    const exportButtonStyle = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "100%",
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
    return (jsxs("div", { className: className, style: style, children: [error && (jsxs("div", { style: {
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
                    boxShadow: "0 2px 10px rgba(255, 0, 0, 0.1)"
                }, children: [jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: jsx("path", { d: "M8 5.333V8M8 10.667h.007M14.667 8A6.667 6.667 0 111.333 8a6.667 6.667 0 0113.334 0z", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }), error] })), jsxs("div", { style: { display: "flex", gap: "16px" }, children: [jsx(LayerPanel, { images: images, selectedId: selectedId, onSelect: selectImage, onDelete: deleteImage, onReorder: reorderImage, onAddImage: openFilePicker, currentView: currentView, onViewChange: setCurrentView }), jsxs("div", { style: { display: "flex", flexDirection: "column" }, children: [jsxs("div", { ref: containerRef, style: containerStyle, onDrop: handleDrop, onDragOver: handleDragOver, onClick: handleContainerClick, children: [images.length === 0 && (jsx("div", { style: dropZoneStyle, children: jsxs("div", { style: {
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                padding: "32px",
                                                border: `2px dashed ${COLORS.GRAY}`,
                                                borderRadius: "20px",
                                                backgroundColor: "rgba(255, 255, 255, 0.8)",
                                                maxWidth: "280px",
                                                textAlign: "center"
                                            }, children: [jsx("div", { style: {
                                                        width: "56px",
                                                        height: "56px",
                                                        borderRadius: "50%",
                                                        backgroundColor: "#FEF9E7",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        marginBottom: "16px",
                                                        boxShadow: "0 2px 10px rgba(250, 192, 0, 0.2)"
                                                    }, children: jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: jsx("path", { d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", stroke: COLORS.ACCENT, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), jsx("span", { style: { fontWeight: 600, color: COLORS.DARK_GRAY, marginBottom: "4px" }, children: "\u041F\u0443\u0441\u043D\u0435\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0442\u0443\u043A" }), jsx("span", { style: { color: COLORS.GRAY, fontSize: "13px", marginBottom: "16px" }, children: "\u0438\u043B\u0438 \u043A\u043B\u0438\u043A\u043D\u0435\u0442\u0435 \u0437\u0430 \u0438\u0437\u0431\u043E\u0440" }), jsx("button", { onClick: openFilePicker, style: {
                                                        padding: "12px 24px",
                                                        backgroundColor: COLORS.ACCENT,
                                                        color: COLORS.BLACK,
                                                        border: "none",
                                                        borderRadius: "10px",
                                                        cursor: "pointer",
                                                        fontWeight: 600,
                                                        fontSize: "14px",
                                                        boxShadow: "0 2px 10px rgba(250, 192, 0, 0.3)",
                                                        transition: "all 0.3s ease-out"
                                                    }, children: "\u0418\u0437\u0431\u0435\u0440\u0438 \u0444\u0430\u0439\u043B" }), jsx("span", { style: { color: COLORS.GRAY, fontSize: "11px", marginTop: "12px" }, children: "PNG, JPG, WebP, GIF \u0434\u043E 10MB" })] }) })), config.printableArea && (jsx("div", { style: {
                                            position: "absolute",
                                            left: config.printableArea.minX,
                                            top: config.printableArea.minY,
                                            width: config.printableArea.maxX - config.printableArea.minX,
                                            height: config.printableArea.maxY - config.printableArea.minY,
                                            overflow: "hidden",
                                            pointerEvents: "none"
                                        }, children: images.map(imageData => {
                                            const { transform } = imageData;
                                            // Adjust position relative to printable area
                                            const imageStyle = {
                                                position: "absolute",
                                                left: transform.position.x - config.printableArea.minX,
                                                top: transform.position.y - config.printableArea.minY,
                                                width: transform.size.width,
                                                height: transform.size.height,
                                                transform: transform.rotation ? `rotate(${transform.rotation}deg)` : undefined,
                                                transformOrigin: "center center",
                                                userSelect: "none",
                                                pointerEvents: "none"
                                            };
                                            return (jsx("img", { src: imageData.src, alt: "\u041A\u0430\u0447\u0435\u043D \u0434\u0438\u0437\u0430\u0439\u043D", style: imageStyle, draggable: false }, imageData.id));
                                        }) })), images.map(imageData => {
                                        const { transform } = imageData;
                                        const isSelected = imageData.id === selectedId;
                                        const imageStyle = {
                                            position: "absolute",
                                            left: transform.position.x,
                                            top: transform.position.y,
                                            width: transform.size.width,
                                            height: transform.size.height,
                                            transform: transform.rotation ? `rotate(${transform.rotation}deg)` : undefined,
                                            transformOrigin: "center center",
                                            cursor: isDragging ? "grabbing" : "move",
                                            userSelect: "none",
                                            pointerEvents: "auto",
                                            opacity: config.printableArea ? 0 : 1
                                        };
                                        return (jsxs(React.Fragment, { children: [jsx("img", { src: imageData.src, alt: "\u041A\u0430\u0447\u0435\u043D \u0434\u0438\u0437\u0430\u0439\u043D", style: imageStyle, draggable: false, onMouseDown: e => handleMouseDown(e, imageData.id, "move"), onClick: e => {
                                                        e.stopPropagation();
                                                        selectImage(imageData.id);
                                                    } }), isSelected && (jsx(Controls, { transform: transform, allowRotation: config.allowRotation || false, onMouseDown: (e, mode, handle) => handleMouseDown(e, imageData.id, mode, handle) }))] }, imageData.id));
                                    }), config.printableArea && (jsx("div", { style: {
                                            position: "absolute",
                                            left: config.printableArea.minX,
                                            top: config.printableArea.minY,
                                            width: config.printableArea.maxX - config.printableArea.minX,
                                            height: config.printableArea.maxY - config.printableArea.minY,
                                            border: `1.5px dashed rgba(74, 74, 74, 0.4)`,
                                            borderRadius: "4px",
                                            boxSizing: "border-box",
                                            pointerEvents: "none"
                                        } }))] }), onExport && (jsxs("button", { style: exportButtonStyle, onClick: handleExport, onMouseEnter: () => setExportButtonHovered(true), onMouseLeave: () => {
                                    setExportButtonHovered(false);
                                    setExportButtonActive(false);
                                }, onMouseDown: () => setExportButtonActive(true), onMouseUp: () => setExportButtonActive(false), children: [jsx("svg", { width: "18", height: "18", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: jsx("path", { d: "M14 10v2.667A1.334 1.334 0 0112.667 14H3.333A1.334 1.334 0 012 12.667V10M4.667 6.667L8 3.333l3.333 3.334M8 3.333V10", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }), "\u0417\u0430\u0432\u044A\u0440\u0448\u0438 \u0434\u0438\u0437\u0430\u0439\u043D"] }))] })] }), jsx("input", { ref: inputRef, type: "file", accept: acceptedTypes.join(","), onChange: handleFileChange, style: { display: "none" } })] }));
}

export { Controls, LayerPanel, TShirtBuilder, createOffscreenCanvas, exportToDataUrl, useImageTransform, useImageUpload };
//# sourceMappingURL=index.esm.js.map
