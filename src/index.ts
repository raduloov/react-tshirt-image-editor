// Components
export { TShirtBuilder } from "./components/TShirtBuilder";
export { Controls } from "./components/Controls";
export { LayerPanel } from "./components/LayerPanel";

// Hooks
export { useImageUpload } from "./hooks/useImageUpload";
export type { UploadState } from "./hooks/useImageUpload";
export { useImageTransform } from "./hooks/useImageTransform";
export { useResponsive } from "./hooks/useResponsive";
export type { ResponsiveState, Breakpoint } from "./hooks/useResponsive";

// Utils
export { exportToDataUrl, createOffscreenCanvas } from "./utils/canvas";

// Types
export type {
  Position,
  Size,
  ImageTransform,
  ImageData,
  TShirtView,
  ViewImages,
  BackgroundOption,
  BoundingBox,
  EditorConfig,
  TShirtBuilderProps,
  ControlHandle,
  DragMode,
  DragState
} from "./types";
