// =============================================================================
// CONTEXT MENU - Menu contextuel pour les noeuds
// =============================================================================

import React, { useEffect, useRef, useCallback } from 'react';
import type { CodeNode } from '../../../types';
import { CONTEXT_MENU_OPTIONS } from '../../../types';

interface ContextMenuProps {
  isVisible: boolean;
  x: number;
  y: number;
  node: CodeNode | null;
  isNodeLocked: boolean;
  onAction: (action: string, node: CodeNode) => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isVisible,
  x,
  y,
  node,
  isNodeLocked,
  onAction,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  // Ajuster la position pour rester dans la fenêtre
  const adjustedPosition = useCallback(() => {
    if (!menuRef.current) return { x, y };

    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }

    if (y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }

    return { x: adjustedX, y: adjustedY };
  }, [x, y]);

  const handleItemClick = (action: string) => {
    if (node) {
      onAction(action, node);
    }
    onClose();
  };

  if (!isVisible || !node) return null;

  const pos = adjustedPosition();

  return (
    <div
      ref={menuRef}
      className="context-menu visible"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`
      }}
    >
      {/* Header */}
      <div className="context-menu-header">
        {node.name}
        <span className="context-menu-type">{node.type}</span>
      </div>

      {/* Menu Items */}
      {CONTEXT_MENU_OPTIONS.map((option, index) => (
        <React.Fragment key={option.id}>
          {option.dividerBefore && <div className="context-menu-divider" />}
          <div
            className={`context-menu-item ${option.isDanger ? 'danger' : ''}`}
            onClick={() => handleItemClick(option.action)}
          >
            <span className="icon">{option.icon}</span>
            <span className="label">
              {option.action === 'lock'
                ? (isNodeLocked ? 'Déverrouiller' : option.label)
                : option.label
              }
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default ContextMenu;
