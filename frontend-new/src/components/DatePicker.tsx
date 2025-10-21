import { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  min?: string;
  max?: string;
}

export const DatePicker = ({
  value,
  onChange,
  required = false,
  disabled = false,
  label,
  min,
  max
}: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowMonthPicker(false);
        setShowYearPicker(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handleDateClick = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Check min/max constraints
    if (min && dateStr < min) return;
    if (max && dateStr > max) return;
    
    onChange(dateStr);
    setIsOpen(false);
    setShowMonthPicker(false);
    setShowYearPicker(false);
  };

  const isDateDisabled = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    handleDateClick(today);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
    setShowMonthPicker(false);
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
    setShowYearPicker(false);
  };

  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];

  // Generate year range (from 1900 to current year + 10)
  const startYear = 1900;
  const endYear = new Date().getFullYear() + 10;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  return (
    <div className="date-picker-wrapper" ref={dropdownRef}>
      {label && <label className="date-picker-label">{label}</label>}
      
      <button
        type="button"
        className={`date-picker-button ${isOpen ? 'open' : ''} ${!value ? 'placeholder' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-required={required}
      >
        <span className="calendar-icon">📅</span>
        <span className="date-value">{formatDisplayDate(value)}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="date-picker-dropdown compact">
          <div className="calendar-header">
            <button type="button" onClick={goToPreviousMonth} className="nav-button" title="Previous month">
              ◀
            </button>
            
            <div className="month-year-selectors">
              <button 
                type="button" 
                className="month-selector"
                onClick={() => {
                  setShowMonthPicker(!showMonthPicker);
                  setShowYearPicker(false);
                }}
              >
                {months[currentMonthIndex]} ▼
              </button>
              <button 
                type="button" 
                className="year-selector"
                onClick={() => {
                  setShowYearPicker(!showYearPicker);
                  setShowMonthPicker(false);
                }}
              >
                {currentYear} ▼
              </button>
            </div>

            <button type="button" onClick={goToNextMonth} className="nav-button" title="Next month">
              ▶
            </button>
          </div>

          {/* Month Picker */}
          {showMonthPicker && (
            <div className="picker-grid month-grid">
              {months.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  className={`picker-item ${index === currentMonthIndex ? 'selected' : ''}`}
                  onClick={() => handleMonthSelect(index)}
                >
                  {month.substring(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* Year Picker */}
          {showYearPicker && (
            <div className="picker-scroll year-scroll">
              {years.reverse().map((year) => (
                <button
                  key={year}
                  type="button"
                  className={`picker-item ${year === currentYear ? 'selected' : ''}`}
                  onClick={() => handleYearSelect(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* Calendar Grid */}
          {!showMonthPicker && !showYearPicker && (
            <>
              <div className="calendar-weekdays compact">
                {weekDays.map(day => (
                  <div key={day} className="weekday">{day}</div>
                ))}
              </div>

              <div className="calendar-days compact">
                {days.map((date, index) => (
                  <div key={index} className="day-cell">
                    {date && (
                      <button
                        type="button"
                        className={`day-button ${isSelected(date) ? 'selected' : ''} ${isToday(date) ? 'today' : ''} ${isDateDisabled(date) ? 'disabled' : ''}`}
                        onClick={() => !isDateDisabled(date) && handleDateClick(date)}
                        disabled={isDateDisabled(date)}
                      >
                        {date.getDate()}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="calendar-footer">
                <button type="button" onClick={goToToday} className="today-button">
                  Today
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
