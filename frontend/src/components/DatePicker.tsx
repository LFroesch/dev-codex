import React from 'react';

interface DatePickerProps {
  label: string;
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  className?: string;
  required?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = "Select date...",
  minDate,
  className = "",
  required = false
}) => {
  const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    onChange(selectedDate ? new Date(selectedDate).toISOString() : '');
  };

  const formatDisplayDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString();
  };

  return (
    <div className={`form-control ${className}`}>
      <label className="label">
        <span className="label-text font-medium">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </span>
      </label>
      <input
        type="datetime-local"
        value={formatDateForInput(value)}
        onChange={handleDateChange}
        min={minDate ? formatDateForInput(minDate) : undefined}
        className="input input-bordered input-sm"
        placeholder={placeholder}
        required={required}
      />
      {value && (
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            {formatDisplayDate(value)}
          </span>
        </label>
      )}
    </div>
  );
};

export default DatePicker;