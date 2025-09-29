import React, { useState } from 'react';

interface FlagIconProps {
  code: string; // ISO alpha-2 (e.g. 'FR')
  alt?: string;
  size?: number; // height in px (width auto for 4:3 ratio)
  className?: string;
  style?: React.CSSProperties;
  fallbackEmoji?: string;
}

// Lightweight flag icon loader using flagcdn. Falls back to emoji if load fails.
// We deliberately keep it small; can be swapped later for local sprite sheet if needed.
const FlagIcon: React.FC<FlagIconProps> = ({ code, alt, size=18, className, style, fallbackEmoji }) => {
  const [errored, setErrored] = useState(false);
  const lower = code.toLowerCase();
  const width = Math.round(size * 4 / 3); // flagcdn 4:3
  if(errored){
    return <span className={className} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:size*0.9,lineHeight:1,width,height:size,...style}} aria-label={alt||code}>{fallbackEmoji || '🏳️'}</span>
  }
  return <img
    src={`https://flagcdn.com/${width}x${size}/${lower}.png`}
    width={width}
    height={size}
    loading="lazy"
    decoding="async"
    alt={alt||code}
    className={className}
    style={{display:'inline-block',borderRadius:2,boxShadow:'0 0 0 1px rgba(0,0,0,0.08)',background:'#f8f8f8',...style}}
    onError={()=> setErrored(true)}
  />
}

export default FlagIcon;
