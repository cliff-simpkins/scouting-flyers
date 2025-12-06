/**
 * Modal for handling duplicate zone conflicts during KML import
 */
import React from 'react';
import Button from '../common/Button';
import './DuplicateZoneModal.css';

export type DuplicateAction = 'yes' | 'no' | 'yes_all' | 'no_all';

interface DuplicateZoneModalProps {
  isOpen: boolean;
  zoneName: string;
  onAction: (action: DuplicateAction) => void;
}

const DuplicateZoneModal: React.FC<DuplicateZoneModalProps> = ({
  isOpen,
  zoneName,
  onAction,
}) => {
  if (!isOpen) return null;

  return (
    <div className="duplicate-zone-modal-overlay">
      <div className="duplicate-zone-modal">
        <div className="duplicate-zone-modal__header">
          <h2 className="duplicate-zone-modal__title">Duplicate Zone Found</h2>
        </div>

        <div className="duplicate-zone-modal__body">
          <p className="duplicate-zone-modal__message">
            A zone named <strong>"{zoneName}"</strong> already exists in this project.
          </p>
          <p className="duplicate-zone-modal__question">
            Do you want to replace it with the new zone from the KML file?
          </p>
        </div>

        <div className="duplicate-zone-modal__actions">
          <Button
            variant="primary"
            onClick={() => onAction('yes')}
            className="duplicate-zone-modal__button"
          >
            Yes
          </Button>
          <Button
            variant="secondary"
            onClick={() => onAction('no')}
            className="duplicate-zone-modal__button"
          >
            No
          </Button>
          <Button
            variant="primary"
            onClick={() => onAction('yes_all')}
            className="duplicate-zone-modal__button"
          >
            Yes to All
          </Button>
          <Button
            variant="secondary"
            onClick={() => onAction('no_all')}
            className="duplicate-zone-modal__button"
          >
            No to All
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateZoneModal;
