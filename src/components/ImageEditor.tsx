import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ImageEditorProps, ImageData, EditorConfig } from '../types';
import { useImageUpload } from '../hooks/useImageUpload';
import { useImageTransform } from '../hooks/useImageTransform';
import { Controls } from './Controls';
import { Toolbar } from './Toolbar';
import { LayerPanel } from './LayerPanel';
import { exportToDataUrl, createOffscreenCanvas } from '../utils/canvas';

const DEFAULT_CONFIG: EditorConfig = {
  width: 400,
  height: 500,
  minImageSize: 20,
  maxImageSize: 800,
  allowRotation: false,
  acceptedFileTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  maxFileSize: 10 * 1024 * 1024,
};

export function ImageEditor({
  backgroundImage,
  config: configProp,
  onChange,
  onExport,
  className,
  style,
  initialImages,
}: ImageEditorProps) {
  const config: EditorConfig = { ...DEFAULT_CONFIG, ...configProp };

  const [images, setImages] = useState<ImageData[]>(initialImages || []);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load background image
  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => setBgImage(img);
      img.onerror = () => setError('Failed to load background image');
      img.src = backgroundImage;
    } else {
      setBgImage(null);
    }
  }, [backgroundImage]);

  const handleImagesChange = useCallback(
    (newImages: ImageData[]) => {
      setImages(newImages);
      onChange?.(newImages);
    },
    [onChange]
  );

  const handleImageLoad = useCallback(
    (newImageData: ImageData) => {
      const newImages = [...images, newImageData];
      setImages(newImages);
      setError(null);
      onChange?.(newImages);
    },
    [images, onChange]
  );

  const { inputRef, handleFileChange, handleDrop, handleDragOver, openFilePicker, acceptedTypes } =
    useImageUpload({
      config,
      onImageLoad: handleImageLoad,
      onError: setError,
    });

  const {
    selectedId,
    isDragging,
    handleMouseDown,
    selectImage,
    deselectAll,
    deleteImage,
    deleteSelected,
    reorderImage,
  } = useImageTransform({
    images,
    config,
    onChange: handleImagesChange,
  });

  const handleRemoveAll = useCallback(() => {
    setImages([]);
    onChange?.([]);
  }, [onChange]);

  const handleExport = useCallback(() => {
    if (!onExport) return;

    const canvas = createOffscreenCanvas(config.width, config.height);
    const dataUrl = exportToDataUrl(canvas, bgImage, images, config);
    onExport(dataUrl);
  }, [bgImage, images, config, onExport]);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      // Deselect if clicking on empty area
      if (e.target === containerRef.current) {
        deselectAll();
      }
    },
    [deselectAll]
  );

  const containerStyle: React.CSSProperties = {
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

  const dropZoneStyle: React.CSSProperties = {
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

  return (
    <div className={className} style={style}>
      <Toolbar
        imageCount={images.length}
        hasSelection={selectedId !== null}
        onUploadClick={openFilePicker}
        onRemoveClick={deleteSelected}
        onRemoveAllClick={handleRemoveAll}
        onExportClick={onExport ? handleExport : undefined}
      />

      {error && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '8px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Layer Panel */}
        <LayerPanel
          images={images}
          selectedId={selectedId}
          onSelect={selectImage}
          onDelete={deleteImage}
          onReorder={reorderImage}
        />

        {/* Canvas */}
        <div
          ref={containerRef}
          style={containerStyle}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleContainerClick}
        >
          {/* Drop zone placeholder */}
          {images.length === 0 && (
            <div style={dropZoneStyle}>
              <span>Drag & drop an image here</span>
              <span>or</span>
              <button
                onClick={openFilePicker}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0066ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Browse Files
              </button>
            </div>
          )}

          {/* Clipped area for images - clips to printable area */}
          {config.printableArea && (
            <div
              style={{
                position: 'absolute',
                left: config.printableArea.minX,
                top: config.printableArea.minY,
                width: config.printableArea.maxX - config.printableArea.minX,
                height: config.printableArea.maxY - config.printableArea.minY,
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              {/* Render all images inside clip container */}
              {images.map((imageData) => {
                const { transform } = imageData;

                // Adjust position relative to printable area
                const imageStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: transform.position.x - config.printableArea!.minX,
                  top: transform.position.y - config.printableArea!.minY,
                  width: transform.size.width,
                  height: transform.size.height,
                  transform: transform.rotation ? `rotate(${transform.rotation}deg)` : undefined,
                  transformOrigin: 'center center',
                  userSelect: 'none',
                  pointerEvents: 'none',
                };

                return (
                  <img
                    key={imageData.id}
                    src={imageData.src}
                    alt="Uploaded design"
                    style={imageStyle}
                    draggable={false}
                  />
                );
              })}
            </div>
          )}

          {/* Render all images (interactive layer - invisible but captures events) */}
          {images.map((imageData) => {
            const { transform } = imageData;
            const isSelected = imageData.id === selectedId;

            const imageStyle: React.CSSProperties = {
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

            return (
              <React.Fragment key={imageData.id}>
                <img
                  src={imageData.src}
                  alt="Uploaded design"
                  style={imageStyle}
                  draggable={false}
                  onMouseDown={(e) => handleMouseDown(e, imageData.id, 'move')}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectImage(imageData.id);
                  }}
                />
                {isSelected && (
                  <Controls
                    transform={transform}
                    allowRotation={config.allowRotation || false}
                    onMouseDown={(e, mode, handle) =>
                      handleMouseDown(e, imageData.id, mode, handle)
                    }
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* Printable area indicator */}
          {config.printableArea && (
            <div
              style={{
                position: 'absolute',
                left: config.printableArea.minX,
                top: config.printableArea.minY,
                width: config.printableArea.maxX - config.printableArea.minX,
                height: config.printableArea.maxY - config.printableArea.minY,
                border: '1px dashed rgba(0, 0, 0, 0.3)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
