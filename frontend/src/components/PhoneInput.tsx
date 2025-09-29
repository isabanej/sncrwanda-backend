import React, { useEffect, useRef, useState } from 'react';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  enforceRwandaLength?: boolean; // ensure Rwanda number strict length
  persistKey?: string; // localStorage key to remember last country
  enableSearch?: boolean; // show search box in dropdown
  noInlineValidation?: boolean; // suppress internal inline validation messages
}

import type { CountryDial } from '../data/countries';
import { COUNTRY_DIALS } from '../data/countries';
import FlagIcon from './FlagIcon';

// We keep list stable but allow dynamic future loading hook if needed
const COUNTRIES: CountryDial[] = COUNTRY_DIALS;

const DEFAULT = 'RW';

const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, id, required, persistKey, enableSearch, enforceRwandaLength, noInlineValidation, ...rest }) => {
  const [open, setOpen] = useState(false);
  const initialCountry = (()=>{
    if(value){ const m = COUNTRIES.find(c=> value.startsWith(c.dial)); if(m) return m }
    if(persistKey){ const saved = localStorage.getItem(`phoneInput.country.${persistKey}`); if(saved){ const found = COUNTRIES.find(c=> c.code===saved); if(found) return found } }
    return COUNTRIES.find(c=> c.code===DEFAULT)!;
  })();
  const [country, setCountry] = useState<CountryDial>(initialCountry);
  const [focusIndex, setFocusIndex] = useState<number>(-1);
  const [internalError, setInternalError] = useState<string|undefined>();
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement|null>(null);

  useEffect(()=>{
    function handle(e:MouseEvent){ if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return ()=> document.removeEventListener('mousedown', handle);
  },[]);

  function onSelect(c: CountryDial){
    setCountry(c);
    if(persistKey) localStorage.setItem(`phoneInput.country.${persistKey}`, c.code);
    const digits = value.replace(/[^0-9]/g,'');
    let local = '';
    if(value.startsWith(c.dial)) local = digits.replace(/^[0-9]{0,3}/,'');
    onChange(c.dial + local);
    setOpen(false); setFocusIndex(-1); setQuery('');
  }

  function formatForCountry(_c: CountryDial, raw: string){ return raw; }

  function onValueChange(e:React.ChangeEvent<HTMLInputElement>){
    let v = e.target.value;
    if(!v.startsWith(country.dial)) v = country.dial + v.replace(/^[+0-9\s]*/,'');
    v = formatForCountry(country, v);
    validate(v, country);
    onChange(v);
  }
  function validate(v: string, c: CountryDial){
    if(noInlineValidation){
      setInternalError(undefined);
      return;
    }
    if(c.code==='RW'){
      const digits = v.replace(/\D/g,'');
      if(digits.startsWith('2507')){
        const local = digits.slice(3); // 7 plus 8 others => total 9 local digits
        if(local.length!==9){
          setInternalError('Rwanda format: +2507XXXXXXXX (9 digits)');
          return;
        }
      } else {
        setInternalError('Rwanda numbers start with +2507');
        return;
      }
    }
    setInternalError(undefined);
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>){
    const text = e.clipboardData.getData('text');
    if(/^\+?\d{4,15}$/.test(text.replace(/\s+/g,''))){
      e.preventDefault();
      const cleaned = text.replace(/\s+/g,'');
      // find matching country by prefix
      const plusPref = cleaned.startsWith('+') ? cleaned : '+'+cleaned;
      const match = COUNTRIES.find(c=> plusPref.startsWith(c.dial));
      if(match){
        setCountry(match);
        let withPlus = plusPref;
        // insert space after dial
        const dialDigits = match.dial.replace('+','');
        const rest = withPlus.replace('+','').slice(dialDigits.length);
  let formatted = '+'+dialDigits + rest;
        formatted = formatForCountry(match, formatted);
        validate(formatted, match);
        onChange(formatted);
  if(persistKey) localStorage.setItem(`phoneInput.country.${persistKey}`, match.code);
      } else {
        onChange(text);
      }
    }
  }

  function onKeyDownList(e: React.KeyboardEvent<HTMLDivElement>){
    if(!open) return;
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)) e.preventDefault();
    if(e.key==='ArrowDown') setFocusIndex(i=> Math.min(COUNTRIES.length-1, i+1));
    if(e.key==='ArrowUp') setFocusIndex(i=> Math.max(0, i-1));
    if(e.key==='Home') setFocusIndex(0);
    if(e.key==='End') setFocusIndex(COUNTRIES.length-1);
    if(e.key==='Enter' && focusIndex>=0){ e.preventDefault(); onSelect(COUNTRIES[focusIndex]); }
    if(e.key==='Escape') { setOpen(false); setFocusIndex(-1); }
  }

  const filteredCountries = query ? COUNTRIES.filter(c=> (c.name.toLowerCase().includes(query.toLowerCase()) || c.dial.includes(query) || c.code.toLowerCase().includes(query.toLowerCase()))) : COUNTRIES;
  const visibleList = filteredCountries;
  const grouped = visibleList.reduce<Record<string, CountryDial[]>>((acc,c)=>{ const g=c.region||'Other'; (acc[g]=acc[g]||[]).push(c); return acc; },{});
  const regionOrder = ['Africa','Americas','Europe','Asia-Pacific','Other'];

  return (
    <div className="phone-input" ref={ref} style={{position:'relative'}} onKeyDown={onKeyDownList}>
      <div className={`phone-control ${open?'open':''} ${internalError? 'error':''}`}>
        <button type="button" aria-label="Select country" onClick={()=> setOpen(o=>!o)} className="phone-country-btn">
          <FlagIcon code={country.code} fallbackEmoji={country.flag} size={18} />
          <span style={{fontSize:12,fontWeight:600,letterSpacing:.5,opacity:.75}}>{country.dial}</span>
          <span style={{lineHeight:1,marginLeft:2,fontSize:14,opacity:.65}}>▾</span>
        </button>
        <input id={id} required={required} {...rest} value={value} onChange={onValueChange} onPaste={onPaste} placeholder={country.code==='RW'? '+2507XXXXXXXX' : `${country.dial} number`} aria-invalid={(!!internalError && !noInlineValidation) || rest['aria-invalid']} aria-describedby={(internalError && !noInlineValidation)? `${id}-err` : rest['aria-describedby']} className="phone-input-field" />
      </div>
      {open && <div className="dropdown" role="listbox" style={{position:'absolute',zIndex:20,top:'100%',left:0,width:320,maxHeight:320,display:'flex',flexDirection:'column',background:'#fff',border:'1px solid var(--border-color,#d0d7de)',borderRadius:6,boxShadow:'0 4px 12px rgba(0,0,0,.12)'}}>
        {enableSearch && <div style={{padding:6,borderBottom:'1px solid #eee'}}><input autoFocus value={query} onChange={e=>{ setQuery(e.target.value); setFocusIndex(-1); }} placeholder="Search country or code" style={{width:'100%',padding:'6px 8px',fontSize:13}} /></div>}
        <div style={{overflowY:'auto'}}>
          {regionOrder.flatMap(region => grouped[region]? [<div key={region} style={{padding:'4px 10px',fontSize:11,fontWeight:600,letterSpacing:.5,opacity:.6,textTransform:'uppercase',background:'#f8f9fa',borderTop:'1px solid #eee'}}>{region}</div>, ...grouped[region].map((c)=>{
            const idx = visibleList.indexOf(c);
            const selected = c.code===country.code;
            const focused = idx===focusIndex;
            const bg = selected ? '#0d6efd' : focused ? '#e8f2ff' : 'transparent';
            const color = selected ? '#fff' : '#111';
            return <button key={c.code} type="button" role="option" aria-selected={selected} onClick={()=> onSelect(c)} onMouseEnter={()=> setFocusIndex(idx)} style={{display:'flex',width:'100%',alignItems:'center',gap:10,padding:'6px 12px',background:bg,color,border:0,textAlign:'left',cursor:'pointer',fontSize:13}}>
              <FlagIcon code={c.code} fallbackEmoji={c.flag} size={18} />
              <span style={{width:54,display:'inline-flex',alignItems:'center',gap:4}}><span style={{fontSize:11,fontWeight:600,letterSpacing:.5,opacity:selected? .9:.55}}>{c.code}</span><span>{c.dial}</span></span>
              <span style={{flex:1}}>{c.name}</span>
              {selected && <span aria-hidden="true" style={{fontWeight:600}}>✓</span>}
            </button>
          })] : [])}
          {visibleList.length===0 && <div className="helper" style={{padding:'8px 10px'}}>No matches</div>}
        </div>
      </div>}
  {internalError && !noInlineValidation && <div id={`${id}-err`} className="error" style={{marginTop:4,lineHeight:1.3}} role="alert">{internalError}</div>}
    </div>
  );
};

export default PhoneInput;
