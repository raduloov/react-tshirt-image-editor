import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { TShirtBuilderProps, ImageData, EditorConfig, TShirtView, ViewImages, ResponsiveConfig, LayoutMode, BoundingBox, BackgroundOption } from "../types";
import { useImageUpload } from "../hooks/useImageUpload";
import { useImageTransform } from "../hooks/useImageTransform";
import { useResponsive } from "../hooks/useResponsive";
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
  allowRotation: false,
  acceptedFileTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  maxFileSize: 10 * 1024 * 1024
};

const DEFAULT_RESPONSIVE_CONFIG: Required<ResponsiveConfig> = {
  enabled: false,
  mobileBreakpoint: 639,
  tabletBreakpoint: 1024,
  forceLayout: undefined as unknown as LayoutMode,
  tabletPanelWidth: 180,
  desktopPanelWidth: 220,
  mobileCollapsedByDefault: true
};

// Helper to calculate scaled dimensions for responsive canvas
function calculateScaledDimensions(
  originalWidth: number,
  originalHeight: number,
  containerWidth: number,
  maxHeight: number
): { width: number; height: number; scale: number } {
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
function scalePrintableArea(
  printableArea: BoundingBox | undefined,
  scale: number
): BoundingBox | undefined {
  if (!printableArea) return undefined;
  return {
    minX: Math.round(printableArea.minX * scale),
    minY: Math.round(printableArea.minY * scale),
    maxX: Math.round(printableArea.maxX * scale),
    maxY: Math.round(printableArea.maxY * scale)
  };
}

export function TShirtBuilder({
  frontBgImage,
  backBgImage,
  backgrounds,
  initialBackgroundId,
  onBackgroundChange,
  config: configProp,
  responsive: responsiveProp,
  onChange,
  onExport,
  className,
  style,
  initialImages
}: TShirtBuilderProps) {
  const config: EditorConfig = { ...DEFAULT_CONFIG, ...configProp };
  const responsiveConfig: ResponsiveConfig = { ...DEFAULT_RESPONSIVE_CONFIG, ...responsiveProp };

  // Responsive state detection
  const responsiveState = useResponsive({
    mobileBreakpoint: responsiveConfig.mobileBreakpoint,
    tabletBreakpoint: responsiveConfig.tabletBreakpoint,
    enabled: responsiveConfig.enabled
  });

  // Container ref for measuring available space
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Mobile drawer state
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(
    responsiveConfig.mobileCollapsedByDefault ?? true
  );

  // Measure container width for responsive scaling
  useEffect(() => {
    if (!responsiveConfig.enabled || !wrapperRef.current) return;

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
  const layoutMode: LayoutMode = useMemo(() => {
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
  const panelWidth = useMemo(() => {
    if (!responsiveConfig.enabled) {
      return responsiveConfig.desktopPanelWidth ?? 220;
    }
    if (responsiveState.isMobile) {
      return '100%'; // Full width for mobile drawer
    }
    if (responsiveState.isTablet) {
      return responsiveConfig.tabletPanelWidth ?? 180;
    }
    return responsiveConfig.desktopPanelWidth ?? 220;
  }, [responsiveConfig.enabled, responsiveConfig.tabletPanelWidth, responsiveConfig.desktopPanelWidth, responsiveState.isMobile, responsiveState.isTablet]);

  // Calculate canvas dimensions based on responsive state
  const canvasDimensions = useMemo(() => {
    if (!responsiveConfig.enabled || !containerWidth) {
      return { width: config.width, height: config.height, scale: 1 };
    }

    // Calculate available width for canvas
    let availableWidth = containerWidth;
    if (layoutMode === 'horizontal') {
      const gap = 16;
      const numericPanelWidth = typeof panelWidth === 'number' ? panelWidth : 220;
      availableWidth = containerWidth - numericPanelWidth - gap;
    } else {
      // Vertical layout - full width with some padding
      availableWidth = containerWidth - 32; // 16px padding on each side
    }

    // Calculate max height (leave room for buttons and panel in vertical layout)
    const maxHeight = layoutMode === 'vertical'
      ? responsiveState.viewportHeight * 0.5 // Half of viewport height in vertical layout
      : responsiveState.viewportHeight - 200; // Leave room for buttons in horizontal

    return calculateScaledDimensions(
      config.width,
      config.height,
      availableWidth,
      maxHeight
    );
  }, [responsiveConfig.enabled, containerWidth, config.width, config.height, layoutMode, panelWidth, responsiveState.viewportHeight]);

  // Calculate scaled printable area
  const scaledPrintableArea = useMemo(() => {
    return scalePrintableArea(config.printableArea, canvasDimensions.scale);
  }, [config.printableArea, canvasDimensions.scale]);

  // Create a scaled config for rendering (keeps original for export)
  const displayConfig: EditorConfig = useMemo(() => ({
    ...config,
    width: canvasDimensions.width,
    height: canvasDimensions.height,
    printableArea: scaledPrintableArea
  }), [config, canvasDimensions.width, canvasDimensions.height, scaledPrintableArea]);

  const [currentView, setCurrentView] = useState<TShirtView>("front");
  const [viewImages, setViewImages] = useState<ViewImages>(initialImages || { front: [], back: [] });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selected background for multi-background support
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | undefined>(
    initialBackgroundId || (backgrounds && backgrounds.length > 0 ? backgrounds[0].id : undefined)
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Get current images based on view
  const images = viewImages[currentView];

  // Get the selected background option
  const selectedBackground: BackgroundOption | undefined = useMemo(() => {
    if (!backgrounds || backgrounds.length === 0) return undefined;
    return backgrounds.find(bg => bg.id === selectedBackgroundId) || backgrounds[0];
  }, [backgrounds, selectedBackgroundId]);

  // Get current background image URL based on view (supports both single and multi-background modes)
  const currentBackgroundUrl = useMemo(() => {
    if (selectedBackground) {
      return currentView === "front" ? selectedBackground.frontImage : selectedBackground.backImage;
    }
    return currentView === "front" ? frontBgImage : backBgImage;
  }, [selectedBackground, currentView, frontBgImage, backBgImage]);

  // Get front/back background URLs for export (supports both single and multi-background modes)
  const frontBackgroundUrl = selectedBackground ? selectedBackground.frontImage : frontBgImage;
  const backBackgroundUrl = selectedBackground ? selectedBackground.backImage : backBgImage;

  // Handle background selection change
  const handleBackgroundSelect = useCallback((backgroundId: string) => {
    setSelectedBackgroundId(backgroundId);
    onBackgroundChange?.(backgroundId);
  }, [onBackgroundChange]);

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

  const isMobileMode = responsiveConfig.enabled && responsiveState.isMobile;

  const {
    inputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    openFilePicker,
    handlePaste,
    acceptAttribute,
    uploadState
  } = useImageUpload({
    config,
    onImageLoad: handleImageLoad,
    onError: setError,
    isMobile: isMobileMode
  });

  // Listen for clipboard paste events
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => handlePaste(e);
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [handlePaste]);

  const {
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
    reorderImage
  } = useImageTransform({
    images,
    config,
    containerRef,
    onChange: handleImagesChange,
    displayScale: canvasDimensions.scale
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
    if (!onExport) return;

    const scale = config.exportScale || 1;
    const canvas = createOffscreenCanvas(config.width * scale, config.height * scale);

    // Helper to load an image
    const loadImage = (src: string | undefined): Promise<HTMLImageElement | null> => {
      if (!src) return Promise.resolve(null);
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

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      // Deselect if clicking on empty area
      if (e.target === containerRef.current) {
        deselectAll();
      }
    },
    [deselectAll]
  );

  // Scale a transform for display (images are stored in original coordinates)
  const scaleTransform = useCallback((transform: ImageData['transform']) => {
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

  const containerStyle: React.CSSProperties = {
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
  const wrapperStyle: React.CSSProperties = {
    width: '100%',
    overflow: 'hidden',
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif"
  };

  // Main layout container style based on layout mode
  const layoutContainerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: layoutMode === 'vertical' ? 'column' : 'row',
    gap: layoutMode === 'vertical' ? '12px' : '16px',
    alignItems: layoutMode === 'vertical' ? 'center' : 'stretch'
  };

  // Panel container style for mobile drawer
  const panelContainerStyle: React.CSSProperties = layoutMode === 'vertical' ? {
    width: canvasDimensions.width,
    order: 2, // Panel below canvas on mobile
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    borderRadius: '10px'
  } : {
    width: typeof panelWidth === 'number' ? `${panelWidth}px` : panelWidth,
    flexShrink: 0
  };

  // Canvas column style
  const canvasColumnStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: layoutMode === 'vertical' ? 'center' : 'flex-start',
    order: layoutMode === 'vertical' ? 1 : 2,
    // Prevent overflow in horizontal layout
    ...(layoutMode === 'horizontal' ? { flex: 1, minWidth: 0 } : {})
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
  const [uploadButtonHovered, setUploadButtonHovered] = useState(false);
  const [uploadButtonActive, setUploadButtonActive] = useState(false);
  const [dropZoneButtonHovered, setDropZoneButtonHovered] = useState(false);
  const [dropZoneButtonActive, setDropZoneButtonActive] = useState(false);

  const exportButtonStyle: React.CSSProperties = {
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
  const togglePanelCollapse = useCallback(() => {
    setIsPanelCollapsed(prev => !prev);
  }, []);

  // Collapse panel when selecting/interacting with image on mobile
  const handleMobileImageInteraction = useCallback(() => {
    if (layoutMode === 'vertical' && !isPanelCollapsed) {
      setIsPanelCollapsed(true);
    }
  }, [layoutMode, isPanelCollapsed]);

  return (
    <div ref={wrapperRef} className={className} style={{ ...wrapperStyle, ...style }}>
      {/* Keyframes for spinner animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={layoutContainerStyle}>
        {/* Layer Panel - with mobile drawer support */}
        <div style={panelContainerStyle}>
          {/* Mobile layout with front/back toggle + collapsible layers */}
          {layoutMode === 'vertical' ? (
            <div
              style={{
                backgroundColor: COLORS.WHITE,
                borderRadius: '10px',
                overflow: 'hidden'
              }}
            >
              {/* Background color selector - always visible when backgrounds provided */}
              {backgrounds && backgrounds.length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderBottom: `1px solid ${COLORS.LIGHT_GRAY}`
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: COLORS.DARK_GRAY, marginRight: '4px' }}>
                    Цвят:
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {backgrounds.map(bg => (
                      <button
                        key={bg.id}
                        onClick={() => handleBackgroundSelect(bg.id)}
                        title={bg.name}
                        style={{
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
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {/* Front/Back toggle - always visible */}
              <div
                style={{
                  display: 'flex',
                  padding: '8px',
                  borderBottom: `1px solid ${COLORS.LIGHT_GRAY}`
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    backgroundColor: COLORS.LIGHT_GRAY,
                    borderRadius: '8px',
                    padding: '4px'
                  }}
                >
                  <button
                    onClick={() => setCurrentView('front')}
                    style={{
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
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21V19a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Отпред
                  </button>
                  <button
                    onClick={() => setCurrentView('back')}
                    style={{
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
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21V19a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Отзад
                  </button>
                </div>
              </div>
              {/* Add image button - always visible outside collapsible */}
              <div style={{ padding: '12px 12px 8px' }}>
                <button
                  onClick={openFilePicker}
                  onMouseEnter={() => setUploadButtonHovered(true)}
                  onMouseLeave={() => {
                    setUploadButtonHovered(false);
                    setUploadButtonActive(false);
                  }}
                  onMouseDown={() => setUploadButtonActive(true)}
                  onMouseUp={() => setUploadButtonActive(false)}
                  style={{
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
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  Качи снимка
                </button>
              </div>
              {/* Show/Hide layers toggle */}
              <button
                onClick={togglePanelCollapse}
                style={{
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
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    transform: isPanelCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.3s ease-out'
                  }}
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {isPanelCollapsed ? 'Покажи слоевете' : 'Скрий слоевете'}
              </button>
              {/* Collapsible layers content */}
              <div
                style={{
                  maxHeight: isPanelCollapsed ? '0' : '350px',
                  overflow: 'hidden',
                  transition: 'max-height 0.3s ease-out'
                }}
              >
                <LayerPanel
                  images={images}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    selectImage(id);
                    handleMobileImageInteraction();
                  }}
                  onDelete={deleteImage}
                  onReorder={reorderImage}
                  onAddImage={openFilePicker}
                  currentView={currentView}
                  onViewChange={setCurrentView}
                  compact={true}
                  isMobile={true}
                  hideAddButton={true}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Background color selector for desktop */}
              {backgrounds && backgrounds.length > 1 && (
                <div
                  style={{
                    backgroundColor: COLORS.WHITE,
                    borderRadius: '10px',
                    padding: '12px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: COLORS.DARK_GRAY, display: 'block', marginBottom: '10px' }}>
                    Цвят
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {backgrounds.map(bg => (
                      <button
                        key={bg.id}
                        onClick={() => handleBackgroundSelect(bg.id)}
                        title={bg.name}
                        style={{
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
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <LayerPanel
                images={images}
                selectedId={selectedId}
                onSelect={(id) => {
                  selectImage(id);
                  handleMobileImageInteraction();
                }}
                onDelete={deleteImage}
                onReorder={reorderImage}
                onAddImage={openFilePicker}
                currentView={currentView}
                onViewChange={setCurrentView}
                compact={false}
                isMobile={false}
              />
            </div>
          )}
        </div>

        {/* Canvas and Export */}
        <div style={canvasColumnStyle}>
          {/* Error message */}
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
                boxShadow: "0 2px 10px rgba(255, 0, 0, 0.1)",
                width: canvasDimensions.width,
                maxWidth: "100%",
                boxSizing: "border-box"
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path
                  d="M8 5.333V8M8 10.667h.007M14.667 8A6.667 6.667 0 111.333 8a6.667 6.667 0 0113.334 0z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{error}</span>
            </div>
          )}

          <div
            ref={containerRef}
            style={containerStyle}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleContainerClick}
          >
            {/* Drop zone placeholder */}
            {images.length === 0 && (
              <div style={{
                ...dropZoneStyle,
                zIndex: isMobileMode ? 10 : undefined
              }}>
                <div
                  style={{
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
                  }}
                >
                  <div
                    style={{
                      width: isMobileMode ? "64px" : "56px",
                      height: isMobileMode ? "64px" : "56px",
                      borderRadius: "50%",
                      backgroundColor: "#FEF9E7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                      boxShadow: "0 2px 10px rgba(250, 192, 0, 0.2)"
                    }}
                  >
                    {isMobileMode ? (
                      // Camera icon for mobile
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
                          stroke={COLORS.ACCENT}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="13" r="4" stroke={COLORS.ACCENT} strokeWidth="2" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          stroke={COLORS.ACCENT}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontWeight: 600, color: COLORS.DARK_GRAY, marginBottom: "4px", fontSize: isMobileMode ? "15px" : "14px" }}>
                    {isMobileMode ? "Докоснете за качване" : "Пуснете изображение тук"}
                  </span>
                  <span style={{ color: COLORS.GRAY, fontSize: isMobileMode ? "14px" : "13px", marginBottom: "16px" }}>
                    {isMobileMode ? "от камера или галерия" : "или кликнете за избор"}
                  </span>
                  <button
                    onClick={openFilePicker}
                    onMouseEnter={() => setDropZoneButtonHovered(true)}
                    onMouseLeave={() => {
                      setDropZoneButtonHovered(false);
                      setDropZoneButtonActive(false);
                    }}
                    onMouseDown={() => setDropZoneButtonActive(true)}
                    onMouseUp={() => setDropZoneButtonActive(false)}
                    style={{
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
                    }}
                  >
                    {isMobileMode ? "Избери снимка" : "Избери файл"}
                  </button>
                  <span style={{ color: COLORS.GRAY, fontSize: isMobileMode ? "12px" : "11px", marginTop: "12px" }}>
                    PNG, JPG, WebP, GIF до 10MB
                  </span>
                </div>
              </div>
            )}

            {/* Upload progress overlay */}
            {uploadState.isUploading && (
              <div
                style={{
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
                }}
              >
                <div
                  style={{
                    width: isMobileMode ? "64px" : "56px",
                    height: isMobileMode ? "64px" : "56px",
                    borderRadius: "50%",
                    backgroundColor: "#FEF9E7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 10px rgba(250, 192, 0, 0.2)"
                  }}
                >
                  {/* Spinning loader */}
                  <svg
                    width={isMobileMode ? "28" : "24"}
                    height={isMobileMode ? "28" : "24"}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      animation: "spin 1s linear infinite"
                    }}
                  >
                    <path
                      d="M12 2v4m0 12v4m-6-10H2m20 0h-4m-1.343-5.657l-2.829 2.829m-5.656 5.656l-2.829 2.829m11.314 0l-2.829-2.829m-5.656-5.656L4.686 6.343"
                      stroke={COLORS.ACCENT}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span style={{ fontWeight: 600, color: COLORS.DARK_GRAY, fontSize: isMobileMode ? "15px" : "14px" }}>
                  Качване...
                </span>
                {/* Progress bar */}
                <div
                  style={{
                    width: "80%",
                    maxWidth: "200px",
                    height: "6px",
                    backgroundColor: COLORS.LIGHT_GRAY,
                    borderRadius: "3px",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      width: `${uploadState.progress}%`,
                      height: "100%",
                      backgroundColor: COLORS.ACCENT,
                      borderRadius: "3px",
                      transition: "width 0.2s ease-out"
                    }}
                  />
                </div>
                {uploadState.fileName && (
                  <span style={{ color: COLORS.GRAY, fontSize: isMobileMode ? "13px" : "12px", maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {uploadState.fileName}
                  </span>
                )}
              </div>
            )}

            {/* Clipped area for images - clips to printable area */}
            {displayConfig.printableArea && (
              <div
                style={{
                  position: "absolute",
                  left: displayConfig.printableArea.minX,
                  top: displayConfig.printableArea.minY,
                  width: displayConfig.printableArea.maxX - displayConfig.printableArea.minX,
                  height: displayConfig.printableArea.maxY - displayConfig.printableArea.minY,
                  overflow: "hidden",
                  pointerEvents: "none"
                }}
              >
                {/* Render all images inside clip container */}
                {images.map(imageData => {
                  const scaledTransform = scaleTransform(imageData.transform);

                  // Adjust position relative to printable area
                  const imageStyle: React.CSSProperties = {
                    position: "absolute",
                    left: scaledTransform.position.x - displayConfig.printableArea!.minX,
                    top: scaledTransform.position.y - displayConfig.printableArea!.minY,
                    width: scaledTransform.size.width,
                    height: scaledTransform.size.height,
                    transform: scaledTransform.rotation ? `rotate(${scaledTransform.rotation}deg)` : undefined,
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
              const scaledTransform = scaleTransform(imageData.transform);
              const isSelected = imageData.id === selectedId;

              const imageStyle: React.CSSProperties = {
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

              return (
                <React.Fragment key={imageData.id}>
                  <img
                    src={imageData.src}
                    alt="Качен дизайн"
                    style={imageStyle}
                    draggable={false}
                    onPointerDown={e => {
                      handleMobileImageInteraction();
                      handlePointerDown(e, imageData.id, "move");
                    }}
                    onTouchStart={e => {
                      handleMobileImageInteraction();
                      handleTouchStart(e, imageData.id);
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      selectImage(imageData.id);
                      handleMobileImageInteraction();
                    }}
                    onContextMenu={e => e.preventDefault()}
                  />
                  {isSelected && (
                    <Controls
                      transform={scaledTransform}
                      allowRotation={displayConfig.allowRotation || false}
                      onPointerDown={(e, mode, handle) => handlePointerDown(e, imageData.id, mode, handle)}
                      isMobile={responsiveConfig.enabled && responsiveState.isMobile}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Printable area indicator */}
            {displayConfig.printableArea && (
              <div
                style={{
                  position: "absolute",
                  left: displayConfig.printableArea.minX,
                  top: displayConfig.printableArea.minY,
                  width: displayConfig.printableArea.maxX - displayConfig.printableArea.minX,
                  height: displayConfig.printableArea.maxY - displayConfig.printableArea.minY,
                  border: `1.5px dashed rgba(74, 74, 74, 0.4)`,
                  borderRadius: "4px",
                  boxSizing: "border-box",
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
        accept={acceptAttribute}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
