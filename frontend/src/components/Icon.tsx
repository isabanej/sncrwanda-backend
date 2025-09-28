import React from 'react'

export type IconName =
  | 'x'
  | 'refresh'
  | 'pencil'
  | 'trash'
  | 'restore'
  | 'info'
  // placeholders you can switch to later (currently mapped to existing shapes)
  | 'download'
  | 'floppy'
  | 'sort'
  | 'sortAsc'
  | 'sortDesc'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

const paths: Record<Exclude<IconName, never>, React.ReactNode> = {
  x: (<path d="M6.22 6.22a.75.75 0 0 1 1.06 0L10 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L11.06 10l2.72 2.72a.75.75 0 1 1-1.06 1.06L10 11.06l-2.72 2.72a.75.75 0 1 1-1.06-1.06L8.94 10 6.22 7.28a.75.75 0 0 1 0-1.06Z"/>),
  refresh: (<path d="M4 2a1 1 0 0 1 1 1v1.05a7 7 0 1 1-2.95 9.2.75.75 0 1 1 1.3-.75A5.5 5.5 0 1 0 6.5 5.2V6a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1H4Z"/>),
  pencil: (<path d="M13.44 2.94a1.5 1.5 0 0 1 2.12 0l1.5 1.5a1.5 1.5 0 0 1 0 2.12l-9.5 9.5-3.54.59a.75.75 0 0 1-.87-.87l.59-3.54 9.5-9.5Zm-1.41 1.41-8.3 8.3-.3 1.78 1.78-.3 8.3-8.3-1.48-1.48Z"/>),
  trash: (<path d="M7 4h6l-.5-1h-5L7 4Zm8 2H5l.8 9.2a2 2 0 0 0 2 1.8h4.4a2 2 0 0 0 2-1.8L15 6Zm-7 2h2v7H8V8Zm4 0h-2v7h2V8Z"/>),
  restore: (<path d="M5 9.5V6.8L2.5 9.3 5 11.8V9.5h5.5a4.5 4.5 0 1 1-4 6.7h2.3A2.8 2.8 0 1 0 10.5 9.5H5Z"/>),
  info: (
    <path d="M10 2a8 8 0 1 0 0 16a8 8 0 0 0 0-16Zm0 3a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 10 5Zm1.25 9.5h-2.5a.75.75 0 0 1 0-1.5h.5V9.75h-.5a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 .75.75v3.5h.25a.75.75 0 0 1 0 1.5Z"/>
  ),
  // download: arrow down to tray
  download: (
    <path d="M9.25 3.75a.75.75 0 0 1 1.5 0v6.19l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L6.22 9.03a.75.75 0 1 1 1.06-1.06l1.97 1.97V3.75ZM4 14.5a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5H4Z"/>
  ),
  // floppy disk (save)
  floppy: (
    <path d="M4 2h9l3 3v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 2a0 0 0 0 0 0 0v10h12V6.5L12.5 4H4Zm3 8a1 1 0 0 0-1 1v3h8v-3a1 1 0 0 0-1-1H7Zm0-6h5v3H7V6Z"/>
  ),
  sort: (
    <path d="M6 4h8a1 1 0 1 1 0 2H6a1 1 0 0 1 0-2Zm-2 5h12a1 1 0 1 1 0 2H4a1 1 0 0 1 0-2Zm4 5h8a1 1 0 1 1 0 2H8a1 1 0 0 1 0-2Z"/>
  ),
  sortAsc: (
    <path d="M7 4h7a1 1 0 1 1 0 2H7a1 1 0 0 1 0-2Zm0 5h5a1 1 0 1 1 0 2H7a1 1 0 0 1 0-2Zm0 5h3a1 1 0 1 1 0 2H7a1 1 0 0 1 0-2Zm8.5-8.5a.75.75 0 0 1 1.06 0l2 2a.75.75 0 1 1-1.06 1.06l-.72-.72V16a.75.75 0 0 1-1.5 0V7.34l-.72.72A.75.75 0 1 1 14.44 7l2-2Z"/>
  ),
  sortDesc: (
    <path d="M7 4h3a1 1 0 1 1 0 2H7a1 1 0 0 1 0-2Zm0 5h5a1 1 0 1 1 0 2H7a1 1 0 0 1 0-2Zm0 5h7a1 1 0 1 1 0 2H7a1 1 0 0 1 0-2Zm8.5 4.5a.75.75 0 0 1-1.06 0l-2-2A.75.75 0 1 1 13.5 11l.72.72V8a.75.75 0 0 1 1.5 0v3.72l.72-.72A.75.75 0 1 1 18.5 12.5l-2 2Z"/>
  ),
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, ...svgProps }) => {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width={size} height={size} aria-hidden="true" {...svgProps}>
      {paths[name]}
    </svg>
  )
}

export default Icon
