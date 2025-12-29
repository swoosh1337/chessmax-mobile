/**
 * API-related type definitions
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  success: boolean;
}

/**
 * API error object
 */
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * API request config
 */
export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

/**
 * Chess API endpoints response types
 */

/**
 * Get openings response
 */
export interface GetOpeningsResponse {
  openings: import('./opening').Opening[];
}

/**
 * Get statistics response
 */
export interface GetStatisticsResponse {
  total_attempts: number;
  perfect_completions: number;
  average_time: number;
  average_errors: number;
  best_time: number;
  total_xp: number;
}

/**
 * Get recent attempts response
 */
export interface GetRecentAttemptsResponse {
  attempts: import('./training').RecentAttempt[];
}

/**
 * Submit attempt request body
 */
export interface SubmitAttemptRequest {
  userId: string;
  openingId: string;
  variationId: string;
  result: {
    success: boolean;
    xpEarned: number;
    errors: number;
    hintsUsed: number;
    timeSeconds: number;
    perfect: boolean;
  };
}

/**
 * Submit attempt response
 */
export interface SubmitAttemptResponse {
  success: boolean;
  attemptId: string;
  xpAwarded: number;
}

/**
 * Get wiki notes response
 */
export interface GetWikiNotesResponse {
  notes: string;
  source?: string;
}

/**
 * Supabase query error
 */
export interface SupabaseError {
  message: string;
  code: string;
  details?: string;
  hint?: string;
}

/**
 * Type guard for ApiError
 */
export function isApiError(obj: unknown): obj is ApiError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    typeof (obj as ApiError).message === 'string'
  );
}

/**
 * Type guard for SupabaseError
 */
export function isSupabaseError(obj: unknown): obj is SupabaseError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    'code' in obj
  );
}

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    error: null,
    success: true,
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse<T>(error: ApiError): ApiResponse<T> {
  return {
    data: null,
    error,
    success: false,
  };
}
