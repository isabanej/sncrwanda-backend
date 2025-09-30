// Expanded country dialing data (subset; can be further extended)
// Note: Ordered by common regional usage first then alphabetically.
export interface CountryDial {
  code: string; // ISO alpha-2
  name: string;
  dial: string; // +CCC
  flag: string; // emoji
  region?: string; // broad grouping (Africa, Europe, Americas, Asia-Pacific)
}
export const COUNTRY_DIALS: CountryDial[] = [
  // Africa
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dial: '+250', region: 'Africa' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', dial: '+256', region: 'Africa' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '+254', region: 'Africa' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dial: '+255', region: 'Africa' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', dial: '+257', region: 'Africa' },
  { code: 'CD', name: 'DR Congo', flag: '🇨🇩', dial: '+243', region: 'Africa' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', dial: '+251', region: 'Africa' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial: '+27', region: 'Africa' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234', region: 'Africa' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', dial: '+237', region: 'Africa' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '+233', region: 'Africa' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226', region: 'Africa' },
  { code: 'CI', name: 'Côte d’Ivoire', flag: '🇨🇮', dial: '+225', region: 'Africa' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', dial: '+221', region: 'Africa' },
  // Americas
  { code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1', region: 'Americas' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1', region: 'Americas' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', dial: '+55', region: 'Americas' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial: '+54', region: 'Americas' },
  // Europe
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44', region: 'Europe' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33', region: 'Europe' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49', region: 'Europe' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dial: '+34', region: 'Europe' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dial: '+39', region: 'Europe' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', dial: '+32', region: 'Europe' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dial: '+31', region: 'Europe' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', dial: '+46', region: 'Europe' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', dial: '+47', region: 'Europe' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', dial: '+358', region: 'Europe' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', dial: '+45', region: 'Europe' },
  // Asia-Pacific
  { code: 'CN', name: 'China', flag: '🇨🇳', dial: '+86', region: 'Asia-Pacific' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dial: '+91', region: 'Asia-Pacific' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', dial: '+81', region: 'Asia-Pacific' },
  { code: 'AU', name: 'Australia', flag: '🇦�', dial: '+61', region: 'Asia-Pacific' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dial: '+64', region: 'Asia-Pacific' },
];

// For dynamic import demonstration we still export default
export default COUNTRY_DIALS;
