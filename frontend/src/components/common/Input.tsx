/**
 * Reusable Input component with label and error display
 */
import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, id, className = '', ...props }) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`input-group ${className}`}>
      <label htmlFor={inputId} className="input-group__label">
        {label}
        {props.required && <span className="input-group__required">*</span>}
      </label>
      <input
        id={inputId}
        className={`input-group__input ${error ? 'input-group__input--error' : ''}`}
        {...props}
      />
      {error && <span className="input-group__error">{error}</span>}
    </div>
  );
};

export default Input;
