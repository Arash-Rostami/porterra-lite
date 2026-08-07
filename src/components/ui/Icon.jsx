'use client';

// Heroicons-outline style — matches BMS-CM's icon convention
const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function PlusIcon(props) { return <svg {...base} {...props}><path d="M12 5v14M5 12h14" /></svg>; }
export function UploadIcon(props) { return <svg {...base} {...props}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>; }
export function DownloadIcon(props) { return <svg {...base} {...props}><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>; }
export function PencilIcon(props) { return <svg {...base} {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>; }
export function TrashIcon(props) { return <svg {...base} {...props}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>; }
export function XCircleIcon(props) { return <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="m9.5 9.5 5 5m0-5-5 5" /></svg>; }
export function ArrowPathIcon(props) { return <svg {...base} {...props}><path d="M3 12a9 9 0 1 0 2.6-6.4" /><path d="M3 4v4h4" /></svg>; }
export function ArrowsRightLeftIcon(props) { return <svg {...base} {...props}><path d="M3 9h13M12 5l4 4-4 4" /><path d="M8 15h13M12 11l-4 4 4 4" /></svg>; }
export function ArrowsUpDownIcon(props) { return <svg {...base} {...props}><path d="M12 3v18" /><path d="M8 7l4-4 4 4" /><path d="M8 17l4 4 4-4" /></svg>; }
export function XIcon(props) { return <svg {...base} {...props}><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>; }
export function CalendarIcon(props) { return <svg {...base} {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>; }
export function MinusIcon(props) { return <svg {...base} {...props}><path d="M5 12h14" /></svg>; }
export function BellIcon(props) { return <svg {...base} {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>; }
export function CheckIcon(props) { return <svg {...base} {...props}><path d="M20 6 9 17l-5-5" /></svg>; }
export function LogoutIcon(props) { return <svg {...base} {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>; }
export function PowerIcon(props) { return <svg {...base} {...props}><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1 -12.77 0.04" /></svg>; }
export function SearchIcon(props) { return <svg {...base} {...props}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>; }
export function FilterIcon(props) { return <svg {...base} {...props}><path d="M21 4H3l7 8v7l4 2v-9z" /></svg>; }
export function FlagIcon(props) { return <svg {...base} {...props}><path d="M4 22V4" /><path d="M4 4h11l-1.5 3L15 10H4" /></svg>; }
