import React, { useState } from 'react';

// teniski-varna color palette
const COLORS = {
  ACCENT: '#FAC000',
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  GRAY: '#9B9B9B',
  LIGHT_GRAY: '#F7F7F7',
  DARK_GRAY: '#4A4A4A',
  RED: '#FF0000',
};

interface ToolbarProps {
  imageCount: number;
  hasSelection: boolean;
  onUploadClick: () => void;
  onRemoveClick: () => void;
  onRemoveAllClick: () => void;
  onExportClick?: () => void;
}

// SVG Icons as components
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ExportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 10v2.667A1.334 1.334 0 0112.667 14H3.333A1.334 1.334 0 012 12.667V10M4.667 6.667L8 3.333l3.333 3.334M8 3.333V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  padding: '14px 16px',
  backgroundColor: COLORS.WHITE,
  borderRadius: '10px',
  marginBottom: '12px',
  flexWrap: 'wrap',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif',
};

const baseButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '12px 20px',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  letterSpacing: '0.01em',
  transition: 'all 0.3s ease-out',
  outline: 'none',
};

// Primary button - gold accent (teniski-varna style)
const primaryStyle: React.CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: COLORS.ACCENT,
  color: COLORS.BLACK,
  boxShadow: '0 2px 10px rgba(250, 192, 0, 0.3)',
};

const primaryHoverStyle: React.CSSProperties = {
  ...primaryStyle,
  filter: 'brightness(1.1)',
  boxShadow: '0 4px 15px rgba(250, 192, 0, 0.4)',
  transform: 'scale(1.02)',
};

// Secondary button - transparent with border (teniski-varna style)
const secondaryStyle: React.CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: 'transparent',
  color: COLORS.DARK_GRAY,
  border: `1px solid ${COLORS.GRAY}`,
  boxShadow: 'none',
};

const secondaryHoverStyle: React.CSSProperties = {
  ...secondaryStyle,
  backgroundColor: COLORS.LIGHT_GRAY,
  borderColor: COLORS.DARK_GRAY,
  transform: 'scale(1.02)',
};

// Danger button - for delete actions
const dangerStyle: React.CSSProperties = {
  ...baseButtonStyle,
  backgroundColor: COLORS.LIGHT_GRAY,
  color: COLORS.RED,
  boxShadow: 'none',
};

const dangerHoverStyle: React.CSSProperties = {
  ...dangerStyle,
  backgroundColor: '#FFEBEB',
  boxShadow: '0 2px 10px rgba(255, 0, 0, 0.15)',
  transform: 'scale(1.02)',
};

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
}

function ToolbarButton({ children, onClick, variant, icon }: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const styles = {
    primary: isHovered ? primaryHoverStyle : primaryStyle,
    secondary: isHovered ? secondaryHoverStyle : secondaryStyle,
    danger: isHovered ? dangerHoverStyle : dangerStyle,
  };

  return (
    <button
      style={styles[variant]}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon}
      {children}
    </button>
  );
}

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
      <ToolbarButton variant="primary" onClick={onUploadClick} icon={<PlusIcon />}>
        Add Image
      </ToolbarButton>

      {hasSelection && (
        <ToolbarButton variant="danger" onClick={onRemoveClick} icon={<TrashIcon />}>
          Remove Selected
        </ToolbarButton>
      )}

      {imageCount > 0 && (
        <>
          <ToolbarButton variant="danger" onClick={onRemoveAllClick} icon={<TrashIcon />}>
            Clear All
          </ToolbarButton>
          {onExportClick && (
            <ToolbarButton variant="secondary" onClick={onExportClick} icon={<ExportIcon />}>
              Export Design
            </ToolbarButton>
          )}
        </>
      )}
    </div>
  );
}
