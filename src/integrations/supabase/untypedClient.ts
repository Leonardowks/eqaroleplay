/**
 * Helper for querying tables that are NOT in the auto-generated types.ts
 * (e.g. branding, feature_flags, api_configurations).
 *
 * Usage:
 *   const { data, error } = await untypedFrom('branding').select('*').single();
 *
 * This avoids scattering `(supabase as any)` across the codebase while keeping
 * a single, auditable call-site for the cast.
 */
import { supabase } from './client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const untypedFrom = (table: string) => (supabase as any).from(table);
