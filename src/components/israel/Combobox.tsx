import { useEffect, useMemo, useRef, useState } from 'react';
import { matches } from './lib';

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
  /** Extra strings the filter should search — Hebrew name, English name, address… */
  terms?: string[];
}

interface Props {
  options: ComboOption[];
  value: string | null;
  onChange: (value: string | null, option: ComboOption | null) => void;
  placeholder?: string;
  /** Allow a value that isn't in the list — for a shul or town we haven't logged before. */
  allowFreeText?: boolean;
  freeText?: string | null;
  onFreeText?: (value: string | null) => void;
  id?: string;
}

/**
 * A type-ahead picker. There are 1,271 settlements in the list, which is far too many
 * for a <select> and enough that we only ever render the first slice of matches.
 */
export default function Combobox({
  options,
  value,
  onChange,
  placeholder,
  allowFreeText = false,
  freeText = null,
  onFreeText,
  id,
}: Props) {
  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );
  const [query, setQuery] = useState(selected?.label ?? freeText ?? '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selected?.label ?? freeText ?? '');
  }, [selected, freeText]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const filtered = useMemo(() => {
    const typed = query.trim();
    if (!typed || typed === selected?.label) return options.slice(0, 60);
    return options
      .filter((option) => matches([option.label, option.hint ?? '', ...(option.terms ?? [])], typed))
      .slice(0, 60);
  }, [options, query, selected]);

  const commit = (option: ComboOption) => {
    onChange(option.value, option);
    onFreeText?.(null);
    setQuery(option.label);
    setOpen(false);
  };

  const commitFreeText = () => {
    const typed = query.trim();
    if (!allowFreeText || !typed) return;
    onChange(null, null);
    onFreeText?.(typed);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapper}>
      <input
        id={id}
        type="text"
        dir="auto"
        className="il-input"
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlight(0);
          if (!event.target.value.trim()) {
            onChange(null, null);
            onFreeText?.(null);
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            if (open && filtered[highlight]) commit(filtered[highlight]);
            else commitFreeText();
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        onBlur={() => {
          if (selected) return;
          // Keep whatever was typed if free text is allowed…
          if (allowFreeText) commitFreeText();
          // …otherwise don't leave text sitting in a field that selected nothing.
          else setQuery('');
        }}
      />

      {open && (filtered.length > 0 || allowFreeText) && (
        <ul className="il-combo-list" role="listbox">
          {filtered.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                className={`il-combo-option ${index === highlight ? 'is-active' : ''}`}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(option)}
              >
                <span dir="auto">{option.label}</span>
                {option.hint && <span className="il-combo-hint">{option.hint}</span>}
              </button>
            </li>
          ))}
          {allowFreeText && query.trim() && !filtered.some((o) => o.label === query.trim()) && (
            <li>
              <button
                type="button"
                className="il-combo-option il-combo-free"
                onMouseDown={(event) => event.preventDefault()}
                onClick={commitFreeText}
              >
                Use “{query.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
