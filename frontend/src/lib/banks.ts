// Provisional list of commercial banks in Rwanda (UI-only). Update via HR service when available.
// Source: Publicly known institutions; may change over time. Include an "Other" fallback.
export interface BankOption { code?: string; name: string }

export const RWANDA_BANKS: BankOption[] = [
  { code: 'BK', name: 'Bank of Kigali (BK)' },
  { code: 'BPR', name: 'BPR Bank Rwanda' },
  { code: 'IM', name: 'I&M Bank (Rwanda)' },
  { code: 'EQTY', name: 'Equity Bank Rwanda' },
  { code: 'ACCESS', name: 'Access Bank Rwanda' },
  { code: 'ECO', name: 'Ecobank Rwanda' },
  { code: 'COGE', name: 'Cogebanque' },
  { code: 'BOA', name: 'Bank of Africa Rwanda' },
  { code: 'OTHER', name: 'Other' },
]
