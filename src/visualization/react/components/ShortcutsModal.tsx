// =============================================================================
// SHORTCUTS MODAL - Modal des raccourcis clavier
// =============================================================================

import React, { useEffect, useCallback } from 'react';
import { KEYBOARD_SHORTCUTS } from '../../../types';

interface ShortcutsModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isVisible,
  onClose
}) => {
  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose]);

  // Empêcher le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="shortcuts-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Raccourcis clavier</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="shortcuts-section">
            <h4>Navigation</h4>
            <div className="shortcut-row">
              <span className="shortcut-key">1-7</span>
              <span className="shortcut-desc">Changer de niveau (L1-L7)</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Escape</span>
              <span className="shortcut-desc">Réinitialiser la vue</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Backspace</span>
              <span className="shortcut-desc">Remonter d'un niveau</span>
            </div>
          </div>

          <div className="shortcuts-section">
            <h4>Actions sur les noeuds</h4>
            <div className="shortcut-row">
              <span className="shortcut-key">F</span>
              <span className="shortcut-desc">Focus sur le noeud sélectionné</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">R</span>
              <span className="shortcut-desc">Réinitialiser toutes les positions</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">H</span>
              <span className="shortcut-desc">Masquer le noeud sélectionné</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">A</span>
              <span className="shortcut-desc">Afficher tous les noeuds</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">I</span>
              <span className="shortcut-desc">Isoler le noeud sélectionné</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">L</span>
              <span className="shortcut-desc">Verrouiller/déverrouiller la position</span>
            </div>
          </div>

          <div className="shortcuts-section">
            <h4>Interface</h4>
            <div className="shortcut-row">
              <span className="shortcut-key">?</span>
              <span className="shortcut-desc">Afficher ce modal</span>
            </div>
          </div>

          <div className="shortcuts-section">
            <h4>Souris</h4>
            <div className="shortcut-row">
              <span className="shortcut-key">Clic</span>
              <span className="shortcut-desc">Sélectionner un noeud</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Double-clic</span>
              <span className="shortcut-desc">Drill-down dans le noeud</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Clic droit</span>
              <span className="shortcut-desc">Menu contextuel</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Glisser</span>
              <span className="shortcut-desc">Déplacer un noeud</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Molette</span>
              <span className="shortcut-desc">Zoom avant/arrière</span>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-key">Clic molette</span>
              <span className="shortcut-desc">Rotation de la caméra</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="close-modal-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
