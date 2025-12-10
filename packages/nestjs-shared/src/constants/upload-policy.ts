export const UploadPolicy = {
  size: {
    image: 5 * 1024 * 1024,
    audio: 20 * 1024 * 1024,
    video: 100 * 1024 * 1024,
    other: 10 * 1024 * 1024,
  },
  mimeWhitelist: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/webm',
    'video/mp4',
    'video/webm',
    'application/octet-stream',
  ] as const,
};
export type AllowedMime = (typeof UploadPolicy.mimeWhitelist)[number];
