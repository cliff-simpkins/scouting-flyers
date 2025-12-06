/**
 * Reusable Select component
 */
import React from 'react';
import './Select.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`select-group ${className}`}>
      <label htmlFor={selectId} className="select-group__label">
        {label}
        {props.required && <span className="select-group__required">*</span>}
      </label>
      <select
        id={selectId}
        className={`select-group__select ${error ? 'select-group__select--error' : ''}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="select-group__error">{error}</span>}
    </div>
  );
};

export default Select;
