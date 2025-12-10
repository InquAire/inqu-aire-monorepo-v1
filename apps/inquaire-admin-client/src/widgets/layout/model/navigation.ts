/**
 * Navigation Model - Layout Widget
 *
 * Navigation configuration and role-based access control.
 */

import {
  BarChart3,
  Building,
  Building2,
  CreditCard,
  FileText,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
  type LucideIcon,
} from 'lucide-react';

import { UserRole } from '@/entities/user';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const allNavigationGroups: NavGroup[] = [
  {
    id: 'overview',
    label: '개요',
    items: [{ name: '대시보드', href: '/dashboard', icon: BarChart3 }],
  },
  {
    id: 'inquiry',
    label: '문의 관리',
    items: [
      { name: '문의 관리', href: '/inquiries', icon: MessageSquare },
      { name: '고객 관리', href: '/customers', icon: Users },
      { name: '답변 템플릿', href: '/reply-templates', icon: FileText },
    ],
  },
  {
    id: 'channel',
    label: '채널',
    items: [{ name: '채널 관리', href: '/channels', icon: Webhook }],
  },
  {
    id: 'organization',
    label: '조직',
    items: [
      { name: '조직 관리', href: '/organization', icon: Building },
      {
        name: '사업체 관리',
        href: '/businesses',
        icon: Building2,
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      {
        name: '사용자 관리',
        href: '/users',
        icon: ShieldCheck,
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
    ],
  },
  {
    id: 'settings',
    label: '설정',
    items: [
      {
        name: '구독 관리',
        href: '/subscription',
        icon: CreditCard,
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
      { name: '설정', href: '/settings', icon: Settings },
    ],
  },
];

export function getNavigationGroupsForRole(role: UserRole): NavGroup[] {
  return allNavigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(role);
      }),
    }))
    .filter(group => group.items.length > 0);
}

export function getNavigationForRole(role: UserRole): NavItem[] {
  return getNavigationGroupsForRole(role).flatMap(group => group.items);
}
