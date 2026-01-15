export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ImageTransform {
  position: Position;
  size: Size;
  rotation: number;
}

export interface ImageData {
  id: string;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  transform: ImageTransform;
}

export type TShirtView = 'front' | 'back';

export interface ViewImages {
  front: ImageData[];
  back: ImageData[];
}

export interface BackgroundOption {
  /** Unique identifier for this background color option */
  id: string;
  /** Display name for the color (e.g., "White", "Blue") */
  name: string;
  /** Color value for the selector button (hex, rgb, etc.) */
  color: string;
  /** Background image URL for front view */
  frontImage: string;
  /** Background image URL for back view */
  backImage: string;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface EditorConfig {
  /** Width of the editor canvas */
  width: number;
  /** Height of the editor canvas */
  height: number;
  /** Printable area boundaries (where images can be placed) */
  printableArea?: BoundingBox;
  /** Minimum image size in pixels */
  minImageSize?: number;
  /** Whether to allow rotation */
  allowRotation?: boolean;
  /** Export scale multiplier for higher quality (e.g., 2 = 2x resolution) */
  exportScale?: number;
  /** Accepted file types for upload */
  acceptedFileTypes?: string[];
  /** Maximum file size in bytes */
  maxFileSize?: number;
}

export type LayoutMode = 'horizontal' | 'vertical';

export interface ResponsiveConfig {
  /** Enable responsive behavior that adapts to viewport size */
  enabled?: boolean;
  /** Mobile breakpoint max width in pixels (default: 639) */
  mobileBreakpoint?: number;
  /** Tablet breakpoint max width in pixels (default: 1024) */
  tabletBreakpoint?: number;
  /** Force a specific layout mode regardless of viewport */
  forceLayout?: LayoutMode;
  /** Panel width for tablet layout in pixels (default: 180) */
  tabletPanelWidth?: number;
  /** Panel width for desktop layout in pixels (default: 220) */
  desktopPanelWidth?: number;
  /** Panel collapsed by default on mobile (default: true) */
  mobileCollapsedByDefault?: boolean;
}

export interface TShirtBuilderProps {
  /** Background image for front view (e.g., t-shirt template) - used when backgrounds is not provided */
  frontBgImage?: string;
  /** Background image for back view - used when backgrounds is not provided */
  backBgImage?: string;
  /** Multiple background options with different colors */
  backgrounds?: BackgroundOption[];
  /** Initial selected background id (defaults to first background) */
  initialBackgroundId?: string;
  /** Callback when background color is changed */
  onBackgroundChange?: (backgroundId: string) => void;
  /** Editor configuration */
  config?: Partial<EditorConfig>;
  /** Responsive configuration for mobile/tablet adaptation */
  responsive?: ResponsiveConfig;
  /** Callback when images change (includes both views) */
  onChange?: (images: ViewImages, currentView: TShirtView) => void;
  /** Callback when export is requested (returns both front and back) */
  onExport?: (images: { front: string; back: string }) => void;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Initial images for controlled mode */
  initialImages?: ViewImages;
}

export interface ControlHandle {
  position: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'rotate';
  cursor: string;
}

export type DragMode = 'move' | 'resize' | 'rotate' | null;

export interface DragState {
  mode: DragMode;
  imageId: string;
  startPosition: Position;
  startTransform: ImageTransform;
  handle?: ControlHandle['position'];
}
