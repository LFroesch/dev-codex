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
    
    // Format in local timezone for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    onChange(selectedDate ? new Date(selectedDate).toISOString() : '');
  };

  const getTimezoneAbbreviation = (): string => {
    const date = new Date();
    const timeZoneName = date.toLocaleDateString(undefined, {
      day: '2-digit',
      timeZoneName: 'short'
    }).substring(4);
    return timeZoneName;
  };

  return (
    <div className={`form-control ${className}`}>
      <label className="label">
        <span className="label-text font-medium">
          {label}
          {required && <span className="text-error ml-1">*</span>}
          <span className="text-xs text-base-content/80 ml-2">({getTimezoneAbbreviation()})</span>
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
    </div>
  );
};

export default DatePicker;