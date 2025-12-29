/**
 * Central constants exports
 *
 * Import constants from here for consistency:
 * import { Colors, Spacing, Typography } from '@/src/constants';
 */

// Colors
export { Colors, colors } from './colors';
export type { ColorsType } from './colors';

// Spacing
export { Spacing } from './spacing';
export type { SpacingType } from './spacing';

// Typography
export { Typography } from './typography';
export type { TypographyType } from './typography';

// API
export {
  API_CONFIG,
  API_ENDPOINTS,
  SUPABASE_TABLES,
  SUPABASE_RPC,
  CACHE_CONFIG,
} from './api';
export type { ApiEndpointsType, SupabaseTablesType } from './api';
