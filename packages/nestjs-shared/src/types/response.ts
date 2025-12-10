export interface ResponseEnvelope<T> {
  success: true;
  data: T;
  error: null;
  meta: {
    requestId?: string;
    display_locale?: string;
    fallback?: boolean;
  } & Record<string, unknown>;
}
