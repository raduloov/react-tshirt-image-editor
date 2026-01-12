import React, { useState, useRef, useCallback, useEffect } from "react";
import type { TShirtBuilderProps, ImageData, EditorConfig, TShirtView, ViewImages } from "../types";
import { useImageUpload } from "../hooks/useImageUpload";
import { useImageTransform } from "../hooks/useImageTransform";
import { Controls } from "./Controls";
import { LayerPanel } from "./LayerPanel";
import { exportToDataUrl, createOffscreenCanvas } from "../utils/canvas";

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

const DEFAULT_CONFIG: EditorConfig = {
  width: 400,
  height: 500,
  minImageSize: 20,
  maxImageSize: 800,
  allowRotation: false,
  acceptedFileTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  maxFileSize: 10 * 1024 * 1024
};

export function TShirtBuilder({
  frontBgImage,
  backBgImage,
  config: configProp,
  onChange,
  onExport,
  className,
  style,
  initialImages
}: TShirtBuilderProps) {
  const config: EditorConfig = { ...DEFAULT_CONFIG, ...configProp };

  const [currentView, setCurrentView] = useState<TShirtView>("front");
  const [viewImages, setViewImages] = useState<ViewImages>(initialImages || { front: [], back: [] });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

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
    } else {
      setBgImage(null);
    }
  }, [currentBackgroundUrl]);

  const handleImagesChange = useCallback(
    (newImages: ImageData[]) => {
      setViewImages(prev => {
        const updated = { ...prev, [currentView]: newImages };
        onChange?.(updated, currentView);
        return updated;
      });
    },
    [onChange, currentView]
  );

  const handleImageLoad = useCallback(
    (newImageData: ImageData) => {
      setViewImages(prev => {
        const newImages = [...prev[currentView], newImageData];
        const updated = { ...prev, [currentView]: newImages };
        onChange?.(updated, currentView);
        return updated;
      });
      setError(null);
    },
    [currentView, onChange]
  );

  const { inputRef, handleFileChange, handleDrop, handleDragOver, openFilePicker, acceptedTypes } = useImageUpload({
    config,
    onImageLoad: handleImageLoad,
    onError: setError
  });

  const {
    selectedId,
    isDragging,
    handleMouseDown,
    selectImage,
    deselectAll,
    deleteImage,
    deleteSelected,
    reorderImage
  } = useImageTransform({
    images,
    config,
    onChange: handleImagesChange
  });

  const handleExport = useCallback(() => {
    if (!onExport) return;

    const canvas = createOffscreenCanvas(config.width, config.height);
    const dataUrl = exportToDataUrl(canvas, bgImage, images, config);
    onExport(dataUrl, currentView);
  }, [bgImage, images, config, onExport, currentView]);

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
    position: "relative",
    width: config.width,
    height: config.height,
    backgroundColor: COLORS.LIGHT_GRAY,
    backgroundImage: bgImage ? `url(${currentBackgroundUrl})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    overflow: "hidden",
    cursor: isDragging ? "grabbing" : "default",
    userSelect: "none",
    borderRadius: "10px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif"
  };

  const dropZoneStyle: React.CSSProperties = {
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

  const exportButtonStyle: React.CSSProperties = {
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

  return (
    <div className={className} style={style}>
      {error && (
        <div
          style={{
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
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8 5.333V8M8 10.667h.007M14.667 8A6.667 6.667 0 111.333 8a6.667 6.667 0 0113.334 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "16px" }}>
        {/* Layer Panel */}
        <LayerPanel
          images={images}
          selectedId={selectedId}
          onSelect={selectImage}
          onDelete={deleteImage}
          onReorder={reorderImage}
          onAddImage={openFilePicker}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {/* Canvas and Export */}
        <div style={{ display: "flex", flexDirection: "column" }}>
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "32px",
                    border: `2px dashed ${COLORS.GRAY}`,
                    borderRadius: "20px",
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    maxWidth: "280px",
                    textAlign: "center"
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      backgroundColor: "#FEF9E7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                      boxShadow: "0 2px 10px rgba(250, 192, 0, 0.2)"
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        stroke={COLORS.ACCENT}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span style={{ fontWeight: 600, color: COLORS.DARK_GRAY, marginBottom: "4px" }}>
                    Пуснете изображение тук
                  </span>
                  <span style={{ color: COLORS.GRAY, fontSize: "13px", marginBottom: "16px" }}>или кликнете за избор</span>
                  <button
                    onClick={openFilePicker}
                    style={{
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
                    }}
                  >
                    Избери файл
                  </button>
                  <span style={{ color: COLORS.GRAY, fontSize: "11px", marginTop: "12px" }}>
                    PNG, JPG, WebP, GIF до 10MB
                  </span>
                </div>
              </div>
            )}

            {/* Clipped area for images - clips to printable area */}
            {config.printableArea && (
              <div
                style={{
                  position: "absolute",
                  left: config.printableArea.minX,
                  top: config.printableArea.minY,
                  width: config.printableArea.maxX - config.printableArea.minX,
                  height: config.printableArea.maxY - config.printableArea.minY,
                  overflow: "hidden",
                  pointerEvents: "none"
                }}
              >
                {/* Render all images inside clip container */}
                {images.map(imageData => {
                  const { transform } = imageData;

                  // Adjust position relative to printable area
                  const imageStyle: React.CSSProperties = {
                    position: "absolute",
                    left: transform.position.x - config.printableArea!.minX,
                    top: transform.position.y - config.printableArea!.minY,
                    width: transform.size.width,
                    height: transform.size.height,
                    transform: transform.rotation ? `rotate(${transform.rotation}deg)` : undefined,
                    transformOrigin: "center center",
                    userSelect: "none",
                    pointerEvents: "none"
                  };

                  return (
                    <img
                      key={imageData.id}
                      src={imageData.src}
                      alt="Качен дизайн"
                      style={imageStyle}
                      draggable={false}
                    />
                  );
                })}
              </div>
            )}

            {/* Render all images (interactive layer - invisible but captures events) */}
            {images.map(imageData => {
              const { transform } = imageData;
              const isSelected = imageData.id === selectedId;

              const imageStyle: React.CSSProperties = {
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

              return (
                <React.Fragment key={imageData.id}>
                  <img
                    src={imageData.src}
                    alt="Качен дизайн"
                    style={imageStyle}
                    draggable={false}
                    onMouseDown={e => handleMouseDown(e, imageData.id, "move")}
                    onClick={e => {
                      e.stopPropagation();
                      selectImage(imageData.id);
                    }}
                  />
                  {isSelected && (
                    <Controls
                      transform={transform}
                      allowRotation={config.allowRotation || false}
                      onMouseDown={(e, mode, handle) => handleMouseDown(e, imageData.id, mode, handle)}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Printable area indicator */}
            {config.printableArea && (
              <div
                style={{
                  position: "absolute",
                  left: config.printableArea.minX,
                  top: config.printableArea.minY,
                  width: config.printableArea.maxX - config.printableArea.minX,
                  height: config.printableArea.maxY - config.printableArea.minY,
                  border: `1.5px dashed rgba(74, 74, 74, 0.4)`,
                  borderRadius: "4px",
                  pointerEvents: "none"
                }}
              />
            )}
          </div>

          {/* Export Button */}
          {onExport && (
            <button
              style={exportButtonStyle}
              onClick={handleExport}
              onMouseEnter={() => setExportButtonHovered(true)}
              onMouseLeave={() => {
                setExportButtonHovered(false);
                setExportButtonActive(false);
              }}
              onMouseDown={() => setExportButtonActive(true)}
              onMouseUp={() => setExportButtonActive(false)}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14 10v2.667A1.334 1.334 0 0112.667 14H3.333A1.334 1.334 0 012 12.667V10M4.667 6.667L8 3.333l3.333 3.334M8 3.333V10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Завърши дизайн
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
