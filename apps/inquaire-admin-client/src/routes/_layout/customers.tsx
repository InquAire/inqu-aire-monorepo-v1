/**
 * Customers Route - TanStack Router
 *
 * This file defines the route. Page logic is in /pages/customers.
 */

import { createFileRoute } from '@tanstack/react-router';

import { CustomersPage } from '@/pages/customers';

export const Route = createFileRoute('/_layout/customers')({
  component: CustomersPage,
});
