import { useState, useRef, useEffect } from 'react';
import './SearchableSelect.css';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  name?: string;
}

export const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  emptyMessage = 'No options available',
  name
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get visible options (with virtual scrolling)
  const visibleOptions = filteredOptions.slice(0, visibleCount);

  // Get selected option label
  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setVisibleCount(10);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setVisibleCount(10);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    
    if (isAtBottom && visibleCount < filteredOptions.length) {
      setVisibleCount(prev => Math.min(prev + 10, filteredOptions.length));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      setVisibleCount(10);
    }
  };

  return (
    <div className="searchable-select" ref={dropdownRef}>
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value} />}
      
      <button
        type="button"
        className={`select-button ${isOpen ? 'open' : ''} ${!value ? 'placeholder' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-required={required}
      >
        <span className="select-value">{selectedLabel}</span>
        <span className="select-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="select-dropdown" onKeyDown={handleKeyDown}>
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="🔍 Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(10); // Reset visible count on search
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="options-container" onScroll={handleScroll}>
            {visibleOptions.length === 0 ? (
              <div className="empty-message">
                {searchTerm ? `No results for "${searchTerm}"` : emptyMessage}
              </div>
            ) : (
              <>
                {visibleOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`option-item ${value === option.value ? 'selected' : ''}`}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                    {value === option.value && <span className="check-mark">✓</span>}
                  </div>
                ))}
                {visibleCount < filteredOptions.length && (
                  <div className="load-more-indicator">
                    Showing {visibleCount} of {filteredOptions.length} • Scroll for more...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
