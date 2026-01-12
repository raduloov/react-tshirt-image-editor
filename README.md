# react-tshirt-image-editor

A React component for uploading, positioning, and resizing images on t-shirt templates (or any background).

## Features

- Drag & drop image upload
- Move images by dragging
- Resize images with corner handles (maintains aspect ratio)
- Optional rotation support
- Configurable printable area boundaries
- Export to data URL
- Fully typed with TypeScript

## Installation

```bash
npm install react-tshirt-image-editor
# or
yarn add react-tshirt-image-editor
```

### Install from GitHub (before npm publish)

```bash
npm install github:yourusername/react-tshirt-image-editor
# or in package.json
"dependencies": {
  "react-tshirt-image-editor": "github:yourusername/react-tshirt-image-editor"
}
```

## Usage

### Basic Usage

```tsx
import { ImageEditor } from 'react-tshirt-image-editor';

function App() {
  return (
    <ImageEditor
      backgroundImage="/path/to/tshirt-template.png"
      onChange={(imageData) => {
        console.log('Image updated:', imageData);
      }}
    />
  );
}
```

### With Configuration

```tsx
import { ImageEditor, ImageData } from 'react-tshirt-image-editor';

function TShirtCustomizer() {
  const handleChange = (imageData: ImageData | null) => {
    if (imageData) {
      console.log('Position:', imageData.transform.position);
      console.log('Size:', imageData.transform.size);
    }
  };

  const handleExport = (dataUrl: string) => {
    // Download or upload the final image
    const link = document.createElement('a');
    link.download = 'custom-tshirt.png';
    link.href = dataUrl;
    link.click();
  };

  return (
    <ImageEditor
      backgroundImage="/tshirt-white.png"
      config={{
        width: 400,
        height: 500,
        printableArea: {
          minX: 100,
          minY: 80,
          maxX: 300,
          maxY: 350,
        },
        allowRotation: true,
        minImageSize: 50,
        maxImageSize: 400,
        acceptedFileTypes: ['image/png', 'image/jpeg'],
        maxFileSize: 5 * 1024 * 1024, // 5MB
      }}
      onChange={handleChange}
      onExport={handleExport}
    />
  );
}
```

### Using Individual Hooks

```tsx
import { useImageUpload, useImageTransform } from 'react-tshirt-image-editor';

function CustomEditor() {
  const [imageData, setImageData] = useState(null);

  const config = {
    width: 400,
    height: 500,
  };

  const { inputRef, handleFileChange, openFilePicker } = useImageUpload({
    config,
    onImageLoad: setImageData,
    onError: console.error,
  });

  const { transform, handleMouseDown } = useImageTransform({
    imageData,
    config,
    onChange: setImageData,
  });

  // Build your own custom UI...
}
```

## Props

### ImageEditorProps

| Prop | Type | Description |
|------|------|-------------|
| `backgroundImage` | `string` | URL of the background image (e.g., t-shirt template) |
| `config` | `Partial<EditorConfig>` | Editor configuration options |
| `onChange` | `(imageData: ImageData \| null) => void` | Callback when image changes |
| `onExport` | `(dataUrl: string) => void` | Callback when export is requested |
| `className` | `string` | Custom class name for the container |
| `style` | `React.CSSProperties` | Custom styles for the container |
| `initialImage` | `ImageData` | Initial image data for controlled mode |

### EditorConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | `number` | `400` | Editor canvas width |
| `height` | `number` | `500` | Editor canvas height |
| `printableArea` | `BoundingBox` | Full canvas | Constrains where images can be placed |
| `minImageSize` | `number` | `20` | Minimum image dimension in pixels |
| `maxImageSize` | `number` | `800` | Maximum image dimension in pixels |
| `allowRotation` | `boolean` | `false` | Enable rotation handle |
| `acceptedFileTypes` | `string[]` | PNG, JPEG, WebP, GIF | Accepted MIME types |
| `maxFileSize` | `number` | `10MB` | Maximum file size in bytes |

## Types

```typescript
interface ImageData {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  transform: ImageTransform;
}

interface ImageTransform {
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Watch mode for development
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
```

## License

MIT
