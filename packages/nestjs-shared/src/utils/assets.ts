export type BuildAssetUrlParams = {
  endpoint?: string | null;
  bucket?: string | null;
  key?: string | null;
};

const ENDPOINT_MAP: Record<string, string> = {
  'inqu-aire-development-media': 'http://localhost:4566',
  'inqu-aire-staging-images': 'https://~~~~.cloudfront.net',
  'inqu-aire-prod-media': 'https://static.inqu-aire.com',
};

function encodePathSegment(segment: string): string {
  return segment
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

export function buildAssetUrl({ endpoint, bucket, key }: BuildAssetUrlParams): string | null {
  if (!endpoint || !bucket || !key) {
    return null;
  }
  const endpointTrimmed = endpoint.trim();
  if (!endpointTrimmed) {
    return null;
  }
  const normalizedEndpoint = endpointTrimmed.replace(/\/+$/, '');
  if (!normalizedEndpoint) {
    return null;
  }
  const bucketTrimmed = bucket.trim();
  if (!bucketTrimmed) {
    return null;
  }
  const keyTrimmed = key.trim().replace(/^\/+/, '');
  if (!keyTrimmed) {
    return null;
  }
  const bucketSegment = encodeURIComponent(bucketTrimmed);
  const keySegment = encodePathSegment(keyTrimmed);
  const mappedEndpoint = ENDPOINT_MAP[bucket];
  if (mappedEndpoint) {
    return `${mappedEndpoint}/${keySegment}`;
  }

  return `${normalizedEndpoint}/${bucketSegment}/${keySegment}`;
}
