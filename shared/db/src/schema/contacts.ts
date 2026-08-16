// Contacts table is defined in the canonical shared schema (public.ts).
// This module re-exports it so the domain can import it from './contacts'
// as well as via '@lifehub/db' (which re-exports the full public schema).
export { contacts } from './public.js';
