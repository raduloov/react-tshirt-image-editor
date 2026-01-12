import React from 'react';

interface ToolbarProps {
  imageCount: number;
  hasSelection: boolean;
  onUploadClick: () => void;
  onRemoveClick: () => void;
  onRemoveAllClick: () => void;
  onExportClick?: () => void;
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '8px',
  backgroundColor: '#f5f5f5',
  borderRadius: '4px',
  marginBottom: '8px',
  flexWrap: 'wrap',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'background-color 0.2s',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#0066ff',
  color: '#fff',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#e0e0e0',
  color: '#333',
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#ff4444',
  color: '#fff',
};

export function Toolbar({
  imageCount,
  hasSelection,
  onUploadClick,
  onRemoveClick,
  onRemoveAllClick,
  onExportClick,
}: ToolbarProps) {
  return (
    <div style={toolbarStyle}>
      <button style={primaryButtonStyle} onClick={onUploadClick}>
        Add Image
      </button>

      {hasSelection && (
        <button style={dangerButtonStyle} onClick={onRemoveClick}>
          Remove Selected
        </button>
      )}

      {imageCount > 0 && (
        <>
          <button style={dangerButtonStyle} onClick={onRemoveAllClick}>
            Remove All
          </button>
          {onExportClick && (
            <button style={secondaryButtonStyle} onClick={onExportClick}>
              Export
            </button>
          )}
        </>
      )}
    </div>
  );
}
