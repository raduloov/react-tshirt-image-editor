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
  /** Maximum image size in pixels */
  maxImageSize?: number;
  /** Whether to allow rotation */
  allowRotation?: boolean;
  /** Accepted file types for upload */
  acceptedFileTypes?: string[];
  /** Maximum file size in bytes */
  maxFileSize?: number;
}

export interface TShirtBuilderProps {
  /** Background image (e.g., t-shirt template) */
  backgroundImage?: string;
  /** Editor configuration */
  config?: Partial<EditorConfig>;
  /** Callback when images change */
  onChange?: (images: ImageData[]) => void;
  /** Callback when export is requested */
  onExport?: (dataUrl: string) => void;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Initial images for controlled mode */
  initialImages?: ImageData[];
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
