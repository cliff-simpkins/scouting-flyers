/**
 * Empty state component for when no data is available
 */
import React from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, action }) => {
  return (
    <div className="empty-state">
      <p className="empty-state__message">{message}</p>
      {action && (
        <button className="empty-state__action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
