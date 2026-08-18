const I = ({ children, className = 'h-5 w-5', ...p }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...p}>{children}</svg>
)
export const Search = p => <I {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></I>
export const Gift = p => <I {...p}><rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M5 12v9h14v-9M12 8c-1.5 0-4-1-4-3a2 2 0 0 1 4 0c0-1.1.9-2 2-2s2 .9 2 2c0 2-2.5 3-4 3z"/></I>
export const Phone = p => <I {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7a2 2 0 0 1 1.7 2.05z"/></I>
export const Mail = p => <I {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></I>
export const Globe = p => <I {...p}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></I>
export const Pin = p => <I {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></I>
export const ArrowBack = p => <I {...p}><path d="M19 12H5m0 0 6 6m-6-6 6-6"/></I>
export const Menu = p => <I {...p}><path d="M4 7h16M4 12h16M4 17h16"/></I>
export const Close = p => <I {...p}><path d="M6 18 18 6M6 6l12 12"/></I>
export const Whatsapp = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.42.25-.7.25-1.29.18-1.42-.08-.12-.27-.2-.57-.35zM12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.6 5.95L.07 24l6.3-1.65a11.87 11.87 0 0 0 5.68 1.45c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.16-3.49-8.41A11.82 11.82 0 0 0 12.05 0zm0 21.79a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.27c0-5.45 4.43-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.89-9.89 9.89z"/></svg>
)
export const Facebook = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"/></svg>
)
export const Instagram = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.8" cy="6.2" r="1.2" fill="currentColor" stroke="none"/></svg>
)
