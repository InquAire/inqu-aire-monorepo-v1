/**
 * Error Log Entity - Public API
 * FSD Entities Layer
 */

// API
export { errorLogApi } from './api/errorLogApi';

// Types
export { ErrorTypeLabels } from './model/types';
export type {
  ErrorLog,
  ErrorLogStats,
  QueryErrorLogParams,
  ResolveErrorLogRequest,
} from './model/types';
