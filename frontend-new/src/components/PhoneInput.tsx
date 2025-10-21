import React from 'react';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  format: string;
}

const countries: Country[] = [
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼', format: 'XXX XXX XXX' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬', format: 'XXX XXX XXX' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', format: 'XXX XXX XXX' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿', format: 'XXX XXX XXX' },
  { code: 'BI', name: 'Burundi', dialCode: '+257', flag: '🇧🇮', format: 'XX XX XX XX' },
  { code: 'CD', name: 'DR Congo', dialCode: '+243', flag: '🇨🇩', format: 'XXX XXX XXX' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', format: '(XXX) XXX-XXXX' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', format: 'XXXX XXX XXX' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  onValidityChange?: (isValid: boolean) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, required = false, onValidityChange }) => {
  // Parse the phone value
  const parsePhone = (phone: string) => {
    if (!phone) return { countryCode: 'RW', number: '' };
    
    const country = countries.find(c => phone.startsWith(c.dialCode));
    if (country) {
      return {
        countryCode: country.code,
        number: phone.substring(country.dialCode.length).trim()
      };
    }
    
    return { countryCode: 'RW', number: phone };
  };

  const parsed = parsePhone(value);
  const [selectedCountry, setSelectedCountry] = React.useState(parsed.countryCode);
  const [phoneNumber, setPhoneNumber] = React.useState(parsed.number);

  // Check if phone number is valid
  const selectedCountryData = countries.find(c => c.code === selectedCountry) || countries[0];
  const expectedLength = selectedCountryData.format.replace(/[^X]/g, '').length;
  const isValidLength = phoneNumber.length === expectedLength || phoneNumber.length === 0;

  React.useEffect(() => {
    if (onValidityChange) {
      onValidityChange(isValidLength && phoneNumber.length > 0);
    }
  }, [isValidLength, phoneNumber, onValidityChange]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    setSelectedCountry(newCountry);
    
    const country = countries.find(c => c.code === newCountry)!;
    onChange(`${country.dialCode}${phoneNumber}`);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits
    const digits = e.target.value.replace(/\D/g, '');
    
    // Get expected length from format (count X characters)
    const country = countries.find(c => c.code === selectedCountry)!;
    const expectedLength = country.format.replace(/[^X]/g, '').length;
    
    // Only allow input up to the expected length
    if (digits.length <= expectedLength) {
      setPhoneNumber(digits);
      onChange(`${country.dialCode}${digits}`);
    }
  };

  const formatPhoneDisplay = (number: string, format: string) => {
    const digits = number.replace(/\D/g, '');
    let formatted = format;
    let digitIndex = 0;
    
    for (let i = 0; i < formatted.length && digitIndex < digits.length; i++) {
      if (formatted[i] === 'X') {
        formatted = formatted.substring(0, i) + digits[digitIndex] + formatted.substring(i + 1);
        digitIndex++;
      }
    }
    
    return formatted.replace(/X/g, '');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <select
          value={selectedCountry}
          onChange={handleCountryChange}
          style={{
            width: '140px',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
          }}
        >
          {countries.map(country => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.dialCode}
            </option>
          ))}
        </select>
        
        <input
          type="tel"
          value={phoneNumber}
          onChange={handleNumberChange}
          placeholder={selectedCountryData.format}
          required={required}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: `1px solid ${!isValidLength && phoneNumber.length > 0 ? '#ef4444' : '#d1d5db'}`,
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
        
        {phoneNumber && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: isValidLength ? '#f3f4f6' : '#fee2e2',
            borderRadius: '6px',
            fontSize: '14px',
            color: isValidLength ? '#6b7280' : '#dc2626',
            minWidth: '150px',
          }}>
            {selectedCountryData.flag} {selectedCountryData.dialCode} {formatPhoneDisplay(phoneNumber, selectedCountryData.format)}
          </div>
        )}
      </div>
      
      {!isValidLength && phoneNumber.length > 0 && (
        <div style={{ 
          marginTop: '4px', 
          fontSize: '12px', 
          color: '#dc2626' 
        }}>
          Phone number must be exactly {expectedLength} digits for {selectedCountryData.name}
        </div>
      )}
    </div>
  );
};

export default PhoneInput;
