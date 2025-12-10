/**
 * Create New Organization Page - Redirect to main organization page with modal open
 * 조직 생성은 /organization 페이지의 모달에서 처리됩니다.
 */
import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/organization/new')({
  component: NewOrganizationRedirect,
});

function NewOrganizationRedirect() {
  return <Navigate to="/organization" search={{ create: true }} />;
}
