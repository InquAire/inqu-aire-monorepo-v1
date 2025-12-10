import { useNavigate } from '@tanstack/react-router';
import { Command } from 'cmdk';
import {
  Activity,
  Building2,
  CreditCard,
  FileCode,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Users,
  Webhook,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useBusinesses, type Business } from '@/entities/business';
import { useCustomers } from '@/entities/customer';
import { useInquiries } from '@/entities/inquiry';
import { useOrganizationSafe } from '@/shared/lib/organization';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const pages = [
  {
    id: 'dashboard',
    name: '대시보드',
    path: '/dashboard',
    icon: LayoutDashboard,
    keywords: ['dashboard', 'home', '홈', '대시보드'],
  },
  {
    id: 'customers',
    name: '고객 관리',
    path: '/customers',
    icon: Users,
    keywords: ['customers', 'users', '고객', '사용자'],
  },
  {
    id: 'businesses',
    name: '사업체 관리',
    path: '/businesses',
    icon: Building2,
    keywords: ['businesses', 'companies', '사업체', '업체'],
  },
  {
    id: 'inquiries',
    name: '문의 관리',
    path: '/inquiries',
    icon: MessageSquare,
    keywords: ['inquiries', 'messages', '문의', '메시지'],
  },
  {
    id: 'channels',
    name: '채널 관리',
    path: '/channels',
    icon: Webhook,
    keywords: ['channels', 'integrations', '채널', '연동'],
  },
  {
    id: 'reply-templates',
    name: '답변 템플릿',
    path: '/reply-templates',
    icon: FileText,
    keywords: ['templates', 'replies', '템플릿', '답변'],
  },
  {
    id: 'industry-configs',
    name: '업종 설정',
    path: '/industry-configs',
    icon: FileCode,
    keywords: ['industry', 'config', '업종', '설정'],
  },
  {
    id: 'users',
    name: '사용자 관리',
    path: '/users',
    icon: Users,
    keywords: ['users', 'admin', '사용자', '관리자'],
  },
  {
    id: 'subscriptions',
    name: '구독 & 결제',
    path: '/subscriptions',
    icon: CreditCard,
    keywords: ['subscriptions', 'billing', 'payments', '구독', '결제'],
  },
  {
    id: 'monitoring',
    name: '시스템 모니터링',
    path: '/monitoring',
    icon: Activity,
    keywords: ['monitoring', 'logs', 'errors', '모니터링', '로그', '에러'],
  },
  {
    id: 'settings',
    name: '설정',
    path: '/settings',
    icon: Settings,
    keywords: ['settings', 'preferences', '설정', '환경설정'],
  },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const orgContext = useOrganizationSafe();
  const currentOrganization = orgContext?.currentOrganization ?? null;

  // 검색어가 있을 때만 데이터 로드
  const { data: customersData } = useCustomers(
    search.length > 0 ? { limit: 5, search } : undefined
  );
  const { data: inquiriesData } = useInquiries(
    search.length > 0 ? { limit: 5, search } : undefined
  );
  const { data: businessesData } = useBusinesses(
    currentOrganization?.id ?? '',
    search.length > 0 ? { limit: 5, search } : undefined
  );

  const customers = customersData?.data ?? [];
  const inquiries = inquiriesData?.data ?? [];
  const businesses = (businessesData ?? []) as Business[];

  const handleSelect = useCallback(
    (value: string) => {
      onOpenChange(false);
      setSearch('');

      // 페이지 네비게이션
      const page = pages.find(p => p.id === value);
      if (page) {
        navigate({ to: page.path });
        return;
      }

      // 고객 상세
      if (value.startsWith('customer-')) {
        const customerId = value.replace('customer-', '');
        navigate({ to: '/customers', search: { customerId } });
        return;
      }

      // 문의 상세
      if (value.startsWith('inquiry-')) {
        const inquiryId = value.replace('inquiry-', '');
        navigate({ to: '/inquiries', search: { inquiryId } });
        return;
      }

      // 사업체 상세
      if (value.startsWith('business-')) {
        const businessId = value.replace('business-', '');
        navigate({ to: '/businesses', search: { businessId } });
        return;
      }
    },
    [navigate, onOpenChange]
  );

  // ESC 키로 닫기
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
        setSearch('');
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenChange]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Global Command Menu"
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      {/* Command Palette */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl">
        <Command className="rounded-lg border shadow-lg bg-white">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="페이지, 고객, 문의 검색... (Cmd+K)"
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다
            </Command.Empty>

            {/* Pages */}
            <Command.Group
              heading="페이지"
              className="text-xs font-medium text-muted-foreground px-2 py-1.5"
            >
              {pages.map(page => {
                const Icon = page.icon;
                return (
                  <Command.Item
                    key={page.id}
                    value={page.id}
                    onSelect={handleSelect}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{page.name}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Customers */}
            {customers.length > 0 && (
              <Command.Group
                heading="고객"
                className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2"
              >
                {customers.map(customer => (
                  <Command.Item
                    key={customer.id}
                    value={`customer-${customer.id}`}
                    onSelect={handleSelect}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{customer.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {customer.email || customer.phone}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Inquiries */}
            {inquiries.length > 0 && (
              <Command.Group
                heading="문의"
                className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2"
              >
                {inquiries.map(inquiry => (
                  <Command.Item
                    key={inquiry.id}
                    value={`inquiry-${inquiry.id}`}
                    onSelect={handleSelect}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="truncate max-w-md">{inquiry.message_text}</span>
                      <span className="text-xs text-muted-foreground">
                        {inquiry.customer?.name} ·{' '}
                        {new Date(inquiry.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Businesses */}
            {businesses.length > 0 && (
              <Command.Group
                heading="사업체"
                className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2"
              >
                {businesses.map(business => (
                  <Command.Item
                    key={business.id}
                    value={`business-${business.id}`}
                    onSelect={handleSelect}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{business.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {business.industry_type}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Help */}
            <Command.Group
              heading="도움말"
              className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2"
            >
              <Command.Item className="relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50 cursor-default">
                <HelpCircle className="mr-2 h-4 w-4" />
                <span className="text-xs">
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ↑↓
                  </kbd>{' '}
                  탐색{' '}
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    Enter
                  </kbd>{' '}
                  선택{' '}
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    Esc
                  </kbd>{' '}
                  닫기
                </span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </Command.Dialog>
  );
}
