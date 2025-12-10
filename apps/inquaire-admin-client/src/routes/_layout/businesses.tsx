/**
 * Businesses Route - TanStack Router
 *
 * This file defines the route. Page logic is in /pages/businesses.
 */

import { createFileRoute } from '@tanstack/react-router';

import { BusinessesPage } from '@/pages/businesses';

export const Route = createFileRoute('/_layout/businesses')({
  component: BusinessesPage,
});
