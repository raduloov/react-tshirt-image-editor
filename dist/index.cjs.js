'use strict';

var jsxRuntime = require('react/jsx-runtime');
var React = require('react');

const DEFAULT_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
function generateId() {
    return Math.random().toString(36).substring(2, 11);
}
function useImageUpload({ config, onImageLoad, onError }) {
    const inputRef = React.useRef(null);
    const acceptedTypes = config.acceptedFileTypes || DEFAULT_ACCEPTED_TYPES;
    const maxFileSize = config.maxFileSize || DEFAULT_MAX_FILE_SIZE;
    const processFile = React.useCallback((file) => {
        // Validate file type
        if (!acceptedTypes.includes(file.type)) {
            onError === null || onError === void 0 ? void 0 : onError(`Invalid file type. Accepted: ${acceptedTypes.join(', ')}`);
            return;
        }
        // Validate file size
        if (file.size > maxFileSize) {
            onError === null || onError === void 0 ? void 0 : onError(`File too large. Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
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
                onError === null || onError === void 0 ? void 0 : onError('Failed to load image');
            };
            img.src = src;
        };
        reader.onerror = () => {
            onError === null || onError === void 0 ? void 0 : onError('Failed to read file');
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
    return {
        inputRef,
        handleFileChange,
        handleDrop,
        handleDragOver,
        openFilePicker,
        acceptedTypes,
    };
}

function useImageTransform({ images, config, onChange }) {
    const [selectedId, setSelectedId] = React.useState(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const dragStateRef = React.useRef(null);
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
    }, [config]);
    const updateImageTransform = React.useCallback((imageId, newTransform) => {
        const clamped = clampTransform(newTransform);
        const updatedImages = images.map((img) => img.id === imageId ? { ...img, transform: clamped } : img);
        onChange === null || onChange === void 0 ? void 0 : onChange(updatedImages);
    }, [clampTransform, images, onChange]);
    const handleMouseDown = React.useCallback((event, imageId, mode, handle) => {
        const image = images.find((img) => img.id === imageId);
        if (!image)
            return;
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
    }, [images]);
    const handleMouseMove = React.useCallback((event) => {
        const dragState = dragStateRef.current;
        if (!dragState)
            return;
        const image = images.find((img) => img.id === dragState.imageId);
        if (!image)
            return;
        const deltaX = event.clientX - dragState.startPosition.x;
        const deltaY = event.clientY - dragState.startPosition.y;
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
                const centerX = dragState.startTransform.position.x +
                    dragState.startTransform.size.width / 2;
                const centerY = dragState.startTransform.position.y +
                    dragState.startTransform.size.height / 2;
                const startAngle = Math.atan2(dragState.startPosition.y - centerY, dragState.startPosition.x - centerX);
                const currentAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
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
        updateImageTransform(dragState.imageId, newTransform);
    }, [images, config.allowRotation, updateImageTransform]);
    const handleMouseUp = React.useCallback(() => {
        setIsDragging(false);
        dragStateRef.current = null;
    }, []);
    // Attach global mouse events when dragging
    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);
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

const HANDLE_SIZE = 12;
const handleStyle = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: '#fff',
    border: '2px solid #0066ff',
    borderRadius: '2px',
    boxSizing: 'border-box',
};
const rotateHandleStyle = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: '#0066ff',
    border: '2px solid #fff',
    borderRadius: '50%',
    boxSizing: 'border-box',
    cursor: 'grab',
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
        inset: 0,
        border: '2px dashed #0066ff',
        pointerEvents: 'none',
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
    return (jsxRuntime.jsxs("div", { style: containerStyle, children: [jsxRuntime.jsx("div", { style: borderStyle }), handles.map(({ position: pos, style }) => (jsxRuntime.jsx("div", { style: { ...handleStyle, ...style, pointerEvents: 'auto' }, onMouseDown: (e) => onMouseDown(e, 'resize', pos) }, pos))), allowRotation && (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx("div", { style: {
                            position: 'absolute',
                            top: -30,
                            left: '50%',
                            width: 2,
                            height: 20,
                            backgroundColor: '#0066ff',
                            transform: 'translateX(-50%)',
                        } }), jsxRuntime.jsx("div", { style: {
                            ...rotateHandleStyle,
                            top: -36 - HANDLE_SIZE / 2,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'auto',
                        }, onMouseDown: (e) => onMouseDown(e, 'rotate') })] }))] }));
}

const toolbarStyle = {
    display: 'flex',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '8px',
    flexWrap: 'wrap',
};
const buttonStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
};
const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#0066ff',
    color: '#fff',
};
const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e0e0e0',
    color: '#333',
};
const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#ff4444',
    color: '#fff',
};
function Toolbar({ imageCount, hasSelection, onUploadClick, onRemoveClick, onRemoveAllClick, onExportClick, }) {
    return (jsxRuntime.jsxs("div", { style: toolbarStyle, children: [jsxRuntime.jsx("button", { style: primaryButtonStyle, onClick: onUploadClick, children: "Add Image" }), hasSelection && (jsxRuntime.jsx("button", { style: dangerButtonStyle, onClick: onRemoveClick, children: "Remove Selected" })), imageCount > 0 && (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [jsxRuntime.jsx("button", { style: dangerButtonStyle, onClick: onRemoveAllClick, children: "Remove All" }), onExportClick && (jsxRuntime.jsx("button", { style: secondaryButtonStyle, onClick: onExportClick, children: "Export" }))] }))] }));
}

const ITEM_HEIGHT = 52; // Height of each layer item in pixels
const panelStyle = {
    width: '200px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
};
const headerStyle = {
    padding: '8px 12px',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #e0e0e0',
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
};
const listStyle = {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    maxHeight: '300px',
    overflowY: 'auto',
    position: 'relative',
};
const emptyStyle = {
    padding: '20px',
    textAlign: 'center',
    color: '#999',
    fontSize: '13px',
};
const dragHandleStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    cursor: 'grab',
    padding: '4px',
    borderRadius: '2px',
};
const dragLineStyle = {
    width: '12px',
    height: '2px',
    backgroundColor: '#999',
    borderRadius: '1px',
};
function LayerPanel({ images, selectedId, onSelect, onDelete, onReorder, }) {
    const [dragState, setDragState] = React.useState(null);
    const listRef = React.useRef(null);
    // Reverse to show top layer first (last in array = top = first in list)
    const reversedImages = [...images].reverse();
    const handleMouseDown = React.useCallback((e, reversedIndex) => {
        e.preventDefault();
        e.stopPropagation();
        setDragState({
            draggingIndex: reversedIndex,
            startY: e.clientY,
            currentY: e.clientY,
        });
    }, []);
    const handleMouseMove = React.useCallback((e) => {
        if (!dragState)
            return;
        setDragState(prev => prev ? {
            ...prev,
            currentY: e.clientY,
        } : null);
    }, [dragState]);
    const handleMouseUp = React.useCallback(() => {
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
    React.useEffect(() => {
        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
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
        let transform = 'translateY(0)';
        let zIndex = 1;
        let boxShadow = 'none';
        let transition = 'transform 0.2s ease, background-color 0.15s, box-shadow 0.2s ease';
        if (dragState) {
            if (isDragging) {
                // The dragged item follows the mouse
                const deltaY = dragState.currentY - dragState.startY;
                transform = `translateY(${deltaY}px)`;
                zIndex = 100;
                boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                transition = 'box-shadow 0.2s ease';
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
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: '1px solid #eee',
            backgroundColor: isDragging ? '#fff' : isSelected ? '#e3f2fd' : 'transparent',
            cursor: 'pointer',
            position: 'relative',
            zIndex,
            transform,
            transition,
            boxShadow,
            height: `${ITEM_HEIGHT}px`,
            boxSizing: 'border-box',
        };
    };
    const thumbnailStyle = {
        width: '32px',
        height: '32px',
        objectFit: 'contain',
        backgroundColor: '#f5f5f5',
        borderRadius: '2px',
        border: '1px solid #ddd',
    };
    const labelStyle = {
        flex: 1,
        fontSize: '13px',
        color: '#333',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };
    const deleteButtonStyle = {
        width: '20px',
        height: '20px',
        padding: 0,
        border: 'none',
        borderRadius: '2px',
        backgroundColor: '#ffcdd2',
        color: '#c62828',
        cursor: 'pointer',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };
    return (jsxRuntime.jsxs("div", { style: panelStyle, children: [jsxRuntime.jsx("div", { style: headerStyle, children: "Layers" }), images.length === 0 ? (jsxRuntime.jsx("div", { style: emptyStyle, children: "No images added" })) : (jsxRuntime.jsx("ul", { ref: listRef, style: listStyle, children: reversedImages.map((image, reversedIndex) => {
                    const originalIndex = images.length - 1 - reversedIndex;
                    const isSelected = image.id === selectedId;
                    const isDragging = (dragState === null || dragState === void 0 ? void 0 : dragState.draggingIndex) === reversedIndex;
                    return (jsxRuntime.jsxs("li", { style: getItemStyle(reversedIndex, isSelected), onClick: () => !dragState && onSelect(image.id), children: [jsxRuntime.jsxs("div", { style: {
                                    ...dragHandleStyle,
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                }, onMouseDown: (e) => handleMouseDown(e, reversedIndex), children: [jsxRuntime.jsx("div", { style: dragLineStyle }), jsxRuntime.jsx("div", { style: dragLineStyle }), jsxRuntime.jsx("div", { style: dragLineStyle })] }), jsxRuntime.jsx("img", { src: image.src, alt: `Layer ${originalIndex + 1}`, style: thumbnailStyle, draggable: false }), jsxRuntime.jsxs("span", { style: labelStyle, children: ["Layer ", originalIndex + 1] }), jsxRuntime.jsx("button", { style: deleteButtonStyle, onClick: (e) => handleDelete(e, image.id), title: "Delete", children: "\u00D7" })] }, image.id));
                }) }))] }));
}

function exportToDataUrl(canvas, backgroundImage, images, config, format = 'image/png', quality = 0.92) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }
    // Clear canvas
    ctx.clearRect(0, 0, config.width, config.height);
    // Draw background if exists
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, config.width, config.height);
    }
    // Draw all user images in order (first = bottom, last = top)
    // Clip to printable area if defined
    if (config.printableArea) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(config.printableArea.minX, config.printableArea.minY, config.printableArea.maxX - config.printableArea.minX, config.printableArea.maxY - config.printableArea.minY);
        ctx.clip();
    }
    for (const imageData of images) {
        const { transform, src } = imageData;
        const img = new Image();
        img.src = src;
        ctx.save();
        // Apply rotation around image center
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
    // Restore from clip
    if (config.printableArea) {
        ctx.restore();
    }
    return canvas.toDataURL(format, quality);
}
function createOffscreenCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

const DEFAULT_CONFIG = {
    width: 400,
    height: 500,
    minImageSize: 20,
    maxImageSize: 800,
    allowRotation: false,
    acceptedFileTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    maxFileSize: 10 * 1024 * 1024,
};
function TShirtBuilder({ backgroundImage, config: configProp, onChange, onExport, className, style, initialImages, }) {
    const config = { ...DEFAULT_CONFIG, ...configProp };
    const [images, setImages] = React.useState(initialImages || []);
    const [bgImage, setBgImage] = React.useState(null);
    const [error, setError] = React.useState(null);
    const containerRef = React.useRef(null);
    // Load background image
    React.useEffect(() => {
        if (backgroundImage) {
            const img = new Image();
            img.onload = () => setBgImage(img);
            img.onerror = () => setError('Failed to load background image');
            img.src = backgroundImage;
        }
        else {
            setBgImage(null);
        }
    }, [backgroundImage]);
    const handleImagesChange = React.useCallback((newImages) => {
        setImages(newImages);
        onChange === null || onChange === void 0 ? void 0 : onChange(newImages);
    }, [onChange]);
    const handleImageLoad = React.useCallback((newImageData) => {
        const newImages = [...images, newImageData];
        setImages(newImages);
        setError(null);
        onChange === null || onChange === void 0 ? void 0 : onChange(newImages);
    }, [images, onChange]);
    const { inputRef, handleFileChange, handleDrop, handleDragOver, openFilePicker, acceptedTypes } = useImageUpload({
        config,
        onImageLoad: handleImageLoad,
        onError: setError,
    });
    const { selectedId, isDragging, handleMouseDown, selectImage, deselectAll, deleteImage, deleteSelected, reorderImage, } = useImageTransform({
        images,
        config,
        onChange: handleImagesChange,
    });
    const handleRemoveAll = React.useCallback(() => {
        setImages([]);
        onChange === null || onChange === void 0 ? void 0 : onChange([]);
    }, [onChange]);
    const handleExport = React.useCallback(() => {
        if (!onExport)
            return;
        const canvas = createOffscreenCanvas(config.width, config.height);
        const dataUrl = exportToDataUrl(canvas, bgImage, images, config);
        onExport(dataUrl);
    }, [bgImage, images, config, onExport]);
    const handleContainerClick = React.useCallback((e) => {
        // Deselect if clicking on empty area
        if (e.target === containerRef.current) {
            deselectAll();
        }
    }, [deselectAll]);
    const containerStyle = {
        position: 'relative',
        width: config.width,
        height: config.height,
        backgroundColor: '#f0f0f0',
        backgroundImage: bgImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
    };
    const dropZoneStyle = {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '8px',
        color: '#666',
        fontSize: '14px',
        pointerEvents: images.length > 0 ? 'none' : 'auto',
    };
    return (jsxRuntime.jsxs("div", { className: className, style: style, children: [jsxRuntime.jsx(Toolbar, { imageCount: images.length, hasSelection: selectedId !== null, onUploadClick: openFilePicker, onRemoveClick: deleteSelected, onRemoveAllClick: handleRemoveAll, onExportClick: onExport ? handleExport : undefined }), error && (jsxRuntime.jsx("div", { style: {
                    padding: '8px 12px',
                    marginBottom: '8px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px',
                    fontSize: '14px',
                }, children: error })), jsxRuntime.jsxs("div", { style: { display: 'flex', gap: '16px' }, children: [jsxRuntime.jsx(LayerPanel, { images: images, selectedId: selectedId, onSelect: selectImage, onDelete: deleteImage, onReorder: reorderImage }), jsxRuntime.jsxs("div", { ref: containerRef, style: containerStyle, onDrop: handleDrop, onDragOver: handleDragOver, onClick: handleContainerClick, children: [images.length === 0 && (jsxRuntime.jsxs("div", { style: dropZoneStyle, children: [jsxRuntime.jsx("span", { children: "Drag & drop an image here" }), jsxRuntime.jsx("span", { children: "or" }), jsxRuntime.jsx("button", { onClick: openFilePicker, style: {
                                            padding: '8px 16px',
                                            backgroundColor: '#0066ff',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }, children: "Browse Files" })] })), config.printableArea && (jsxRuntime.jsx("div", { style: {
                                    position: 'absolute',
                                    left: config.printableArea.minX,
                                    top: config.printableArea.minY,
                                    width: config.printableArea.maxX - config.printableArea.minX,
                                    height: config.printableArea.maxY - config.printableArea.minY,
                                    overflow: 'hidden',
                                    pointerEvents: 'none',
                                }, children: images.map((imageData) => {
                                    const { transform } = imageData;
                                    // Adjust position relative to printable area
                                    const imageStyle = {
                                        position: 'absolute',
                                        left: transform.position.x - config.printableArea.minX,
                                        top: transform.position.y - config.printableArea.minY,
                                        width: transform.size.width,
                                        height: transform.size.height,
                                        transform: transform.rotation ? `rotate(${transform.rotation}deg)` : undefined,
                                        transformOrigin: 'center center',
                                        userSelect: 'none',
                                        pointerEvents: 'none',
                                    };
                                    return (jsxRuntime.jsx("img", { src: imageData.src, alt: "Uploaded design", style: imageStyle, draggable: false }, imageData.id));
                                }) })), images.map((imageData) => {
                                const { transform } = imageData;
                                const isSelected = imageData.id === selectedId;
                                const imageStyle = {
                                    position: 'absolute',
                                    left: transform.position.x,
                                    top: transform.position.y,
                                    width: transform.size.width,
                                    height: transform.size.height,
                                    transform: transform.rotation ? `rotate(${transform.rotation}deg)` : undefined,
                                    transformOrigin: 'center center',
                                    cursor: isDragging ? 'grabbing' : 'move',
                                    userSelect: 'none',
                                    pointerEvents: 'auto',
                                    opacity: config.printableArea ? 0 : 1,
                                };
                                return (jsxRuntime.jsxs(React.Fragment, { children: [jsxRuntime.jsx("img", { src: imageData.src, alt: "Uploaded design", style: imageStyle, draggable: false, onMouseDown: (e) => handleMouseDown(e, imageData.id, 'move'), onClick: (e) => {
                                                e.stopPropagation();
                                                selectImage(imageData.id);
                                            } }), isSelected && (jsxRuntime.jsx(Controls, { transform: transform, allowRotation: config.allowRotation || false, onMouseDown: (e, mode, handle) => handleMouseDown(e, imageData.id, mode, handle) }))] }, imageData.id));
                            }), config.printableArea && (jsxRuntime.jsx("div", { style: {
                                    position: 'absolute',
                                    left: config.printableArea.minX,
                                    top: config.printableArea.minY,
                                    width: config.printableArea.maxX - config.printableArea.minX,
                                    height: config.printableArea.maxY - config.printableArea.minY,
                                    border: '1px dashed rgba(0, 0, 0, 0.3)',
                                    pointerEvents: 'none',
                                } }))] })] }), jsxRuntime.jsx("input", { ref: inputRef, type: "file", accept: acceptedTypes.join(','), onChange: handleFileChange, style: { display: 'none' } })] }));
}

exports.Controls = Controls;
exports.LayerPanel = LayerPanel;
exports.TShirtBuilder = TShirtBuilder;
exports.Toolbar = Toolbar;
exports.createOffscreenCanvas = createOffscreenCanvas;
exports.exportToDataUrl = exportToDataUrl;
exports.useImageTransform = useImageTransform;
exports.useImageUpload = useImageUpload;
//# sourceMappingURL=index.cjs.js.map
