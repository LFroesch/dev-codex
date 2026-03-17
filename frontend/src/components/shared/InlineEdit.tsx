import React, { useState, useRef, useEffect } from 'react';

// Convert Date to YYYY-MM-DD for input[type=date]
export const toDateInputValue = (d: Date | string | undefined): string => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

// Convert YYYY-MM-DD to M-D-YYYY for the backend command
export const toCommandDate = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-');
  return `${parseInt(m)}-${parseInt(d)}-${y}`;
};

// Inline editable text field
export const InlineEdit: React.FC<{
  value: string;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  placeholder?: string;
}> = ({ value, onSave, className = '', inputClassName = '', multiline = false, placeholder }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    const sharedClass = `w-full bg-base-100 border-2 border-primary/50 rounded-md px-2 py-1 focus:outline-none focus:border-primary ${inputClassName}`;
    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={`${sharedClass} resize-none min-h-[3rem]`}
        rows={2}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={sharedClass}
      />
    );
  }

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={`cursor-text hover:bg-base-content/10 rounded px-1 -mx-1 transition-colors ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-base-content/30 italic">{placeholder || 'Click to add...'}</span>}
    </span>
  );
};

// Inline date picker
export const InlineDate: React.FC<{
  value?: Date | string;
  onSave: (isoDate: string) => void;
  onClear?: () => void;
  placeholder?: string;
}> = ({ value, onSave, onClear, placeholder = 'Set date' }) => {
  const [editing, setEditing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      onSave(val);
    }
    setEditing(false);
  };

  const display = value ? new Date(value).toLocaleDateString() : null;

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <input
          type="date"
          autoFocus
          value={toDateInputValue(value)}
          onChange={handleChange}
          onBlur={() => setEditing(false)}
          className="text-sm bg-base-100 border-2 border-primary/50 rounded-md px-2 py-0.5 focus:outline-none focus:border-primary font-mono"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="text-sm font-medium text-base-content/50 font-mono cursor-pointer hover:bg-base-content/10 rounded px-1.5 py-0.5 -mx-0.5 transition-colors"
        title="Click to change date"
      >
        {display || <span className="text-base-content/30 italic text-xs">{placeholder}</span>}
      </button>
      {value && onClear && (
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="text-base-content/30 hover:text-error transition-colors"
          title="Remove due date"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

// Inline select dropdown — auto-flips upward when near bottom
export const InlineSelect: React.FC<{
  value: string;
  options: { value: string; label: string; className?: string }[];
  onSelect: (val: string) => void;
  className?: string;
}> = ({ value, options, onSelect, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 200);
    }
    setOpen(!open);
  };

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`text-sm font-medium cursor-pointer hover:bg-base-content/10 rounded px-1.5 py-0.5 -mx-0.5 transition-colors ${current?.className || ''} ${className}`}
        title="Click to change"
      >
        {current?.label || value}
        <svg className="w-2.5 h-2.5 inline-block ml-0.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className={`absolute z-50 left-0 bg-base-100 border-2 border-base-content/20 rounded-lg shadow-lg overflow-hidden min-w-[8rem] ${
          dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                if (opt.value !== value) onSelect(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm font-medium hover:bg-base-200 transition-colors ${
                opt.value === value ? 'bg-base-200/60' : ''
              } ${opt.className || ''}`}
            >
              {opt.label}
              {opt.value === value && (
                <svg className="w-3 h-3 inline-block ml-1 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
