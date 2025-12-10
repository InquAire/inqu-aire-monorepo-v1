/**
 * Channels Route - TanStack Router
 *
 * This file defines the route. Page logic is in /pages/channels.
 */

import { createFileRoute } from '@tanstack/react-router';

import { ChannelsPage } from '@/pages/channels';

export const Route = createFileRoute('/_layout/channels')({
  component: ChannelsPage,
});
