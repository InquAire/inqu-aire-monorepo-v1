/**
 * Channel Entity - Public API
 * FSD Entities Layer
 */

// Types
export type {
  Channel,
  ChannelStats,
  CreateChannelRequest,
  QueryChannelParams,
  UpdateChannelRequest,
} from './model/types';

export { PlatformType } from './model/types';

// Constants
export { channelKeys } from './model/constants';

// API
export { channelApi } from './api/channelApi';

// Query Hooks
export { useChannel } from './hooks/queries/useChannel';
export { useChannels } from './hooks/queries/useChannels';
export { useChannelStats } from './hooks/queries/useChannelStats';

// Mutation Hooks
export { useCreateChannel } from './hooks/mutations/useCreateChannel';
export { useDeleteChannel } from './hooks/mutations/useDeleteChannel';
export { useRegenerateWebhookUrl } from './hooks/mutations/useRegenerateWebhookUrl';
export { useToggleChannelActive } from './hooks/mutations/useToggleChannelActive';
export { useToggleChannelAutoReply } from './hooks/mutations/useToggleChannelAutoReply';
export { useUpdateChannel } from './hooks/mutations/useUpdateChannel';
