/**
 * Inquiries Route - TanStack Router
 *
 * This file defines the route. Page logic is in /pages/inquiries.
 */

import { createFileRoute } from '@tanstack/react-router';

import { InquiriesPage } from '@/pages/inquiries';

export const Route = createFileRoute('/_layout/inquiries')({
  component: InquiriesPage,
});
