/**
 * Validates email address format
 * Checks for:
 * - Valid characters before @
 * - @ symbol present
 * - Valid domain name
 * - Valid TLD (at least 2 characters)
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  
  // RFC 5322 Official Standard regex (simplified version)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }
  
  // Additional checks
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [localPart, domain] = parts;
  
  // Check local part (before @)
  if (localPart.length === 0 || localPart.length > 64) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.includes('..')) return false;
  
  // Check domain part (after @)
  if (domain.length === 0 || domain.length > 255) return false;
  if (domain.startsWith('-') || domain.endsWith('-')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  
  // Check for valid TLD (must have at least one dot and 2+ chars after last dot)
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  
  // Check for common invalid patterns
  const invalidPatterns = [
    '@gma',     // gmail typo
    '@gmai',    // gmail typo
    '@yaho',    // yahoo typo
    '@hotmai',  // hotmail typo
    '@outloo',  // outlook typo
    '@gmial',   // gmail typo
    '@gmali',   // gmail typo
  ];
  
  for (const pattern of invalidPatterns) {
    if (email.toLowerCase().endsWith(pattern)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Gets email validation error message
 */
export const getEmailError = (email: string): string | null => {
  if (!email) return 'Email is required';
  
  if (!email.includes('@')) {
    return 'Email must contain @ symbol';
  }
  
  const parts = email.split('@');
  if (parts.length !== 2) {
    return 'Email format is invalid';
  }
  
  const [localPart, domain] = parts;
  
  if (localPart.length === 0) {
    return 'Email must have characters before @';
  }
  
  if (domain.length === 0) {
    return 'Email must have a domain after @';
  }
  
  if (!domain.includes('.')) {
    return 'Email domain must contain a dot (e.g., gmail.com)';
  }
  
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  
  if (tld.length < 2) {
    return 'Email domain extension must be at least 2 characters (e.g., .com, .org)';
  }
  
  // Check for common typos
  if (email.toLowerCase().includes('@gma') && !email.toLowerCase().includes('@gmail.')) {
    return 'Did you mean @gmail.com?';
  }
  
  if (email.toLowerCase().includes('@yaho') && !email.toLowerCase().includes('@yahoo.')) {
    return 'Did you mean @yahoo.com?';
  }
  
  if (email.toLowerCase().includes('@hotmai') && !email.toLowerCase().includes('@hotmail.')) {
    return 'Did you mean @hotmail.com?';
  }
  
  if (!validateEmail(email)) {
    return 'Please enter a valid email address';
  }
  
  return null;
};

/**
 * Formats phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // If it has country code, return as is
  if (phone.startsWith('+')) return phone;
  
  // Default to Rwanda format
  return `+250${phone}`;
};

/**
 * Validates phone number
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Should have at least 10 digits (most countries)
  return digits.length >= 9 && digits.length <= 15;
};
