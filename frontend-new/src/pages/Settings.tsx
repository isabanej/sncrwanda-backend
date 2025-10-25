import { useState } from 'react';
import { useSettings, currencies, type Currency } from '../context/SettingsContext';
import './Settings.css';

export const Settings = () => {
  const { currency, theme, setCurrency, setTheme } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const filteredCurrencies = currencies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCurrencySelect = (curr: Currency) => {
    setCurrency(curr);
    setShowCurrencyDropdown(false);
    setSearchTerm('');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Customize your application preferences</p>
      </div>

      <div className="settings-container">
        {/* Theme Settings */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2>🎨 Appearance</h2>
            <p>Choose your preferred theme</p>
          </div>
          
          <div className="settings-card">
            <label className="settings-label">Theme Mode</label>
            <div className="theme-selector">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <div className="theme-icon">☀️</div>
                <div className="theme-name">Light Mode</div>
                <div className="theme-description">Bright and clean interface</div>
              </button>
              
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <div className="theme-icon">🌙</div>
                <div className="theme-name">Dark Mode</div>
                <div className="theme-description">Easy on the eyes</div>
              </button>
            </div>
          </div>
        </div>

        {/* Currency Settings */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h2>💰 Currency</h2>
            <p>Select your preferred currency for monetary values</p>
          </div>
          
          <div className="settings-card">
            <label className="settings-label">Default Currency</label>
            
            <div className="currency-selector">
              <div 
                className="currency-current"
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              >
                <div className="currency-info">
                  <span className="currency-symbol">{currency.symbol}</span>
                  <div className="currency-details">
                    <div className="currency-code">{currency.code}</div>
                    <div className="currency-name">{currency.name}</div>
                  </div>
                </div>
                <span className="dropdown-arrow">{showCurrencyDropdown ? '▲' : '▼'}</span>
              </div>

              {showCurrencyDropdown && (
                <div className="currency-dropdown">
                  <div className="currency-search">
                    <input
                      type="text"
                      placeholder="Search currencies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>
                  
                  <div className="currency-list">
                    {filteredCurrencies.length > 0 ? (
                      filteredCurrencies.map((curr) => (
                        <div
                          key={curr.code}
                          className={`currency-item ${curr.code === currency.code ? 'selected' : ''}`}
                          onClick={() => handleCurrencySelect(curr)}
                        >
                          <span className="currency-symbol">{curr.symbol}</span>
                          <div className="currency-details">
                            <div className="currency-code">{curr.code}</div>
                            <div className="currency-name">{curr.name}</div>
                          </div>
                          {curr.code === currency.code && (
                            <span className="check-mark">✓</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="currency-item-empty">
                        No currencies found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="currency-preview">
              <span className="preview-label">Preview:</span>
              <span className="preview-value">
                {currency.symbol} 1,000,000 = One million {currency.name}
              </span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="settings-section">
          <div className="settings-info">
            <div className="info-icon">ℹ️</div>
            <div className="info-content">
              <strong>Note:</strong> Your preferences are saved locally and will persist across sessions.
              Theme and currency settings apply to all monetary values displayed in the application.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
