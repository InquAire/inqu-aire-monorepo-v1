/**
 * Inquiry List Widget - Feature UI Component
 */

import { type ColumnDef } from '@tanstack/react-table';
import { Eye, MoreVertical } from 'lucide-react';
import { useMemo, useState } from 'react';

import { InquiryStatus, type Inquiry } from '@/entities/inquiry';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FilterBar,
  type FilterConfig,
} from '@/shared/ui';
import type { DateRange } from '@/shared/ui/filter-bar/date-range-filter';
import { DataTable, DataTableColumnHeader } from '@/shared/ui/data-table';

import { sentimentLabels, statusLabels, urgencyLabels } from '../model/constants';

interface InquiryListWidgetProps {
  inquiries: Inquiry[];
  isLoading: boolean;
  onViewDetails: (inquiry: Inquiry) => void;
}

export function InquiryListWidget({ inquiries, isLoading, onViewDetails }: InquiryListWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setSentimentFilter('');
    setDateRange({ from: null, to: null });
  };

  // Filter inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter(inquiry => {
      const matchesSearch =
        !searchQuery ||
        inquiry.message_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inquiry.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || inquiry.status === statusFilter;
      const matchesSentiment = !sentimentFilter || inquiry.sentiment === sentimentFilter;
      const matchesDate =
        (!dateRange.from || new Date(inquiry.received_at) >= new Date(dateRange.from)) &&
        (!dateRange.to || new Date(inquiry.received_at) <= new Date(dateRange.to + 'T23:59:59'));
      return matchesSearch && matchesStatus && matchesSentiment && matchesDate;
    });
  }, [inquiries, searchQuery, statusFilter, sentimentFilter, dateRange]);

  const columns = useMemo<ColumnDef<Inquiry>[]>(
    () => [
      {
        accessorKey: 'customer',
        header: ({ column }) => <DataTableColumnHeader column={column} title="고객" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">
                {row.original.customer?.name?.[0]?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">
                {row.original.customer?.name ?? '익명'}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.original.customer?.phone ?? row.original.customer?.email ?? '-'}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'message_text',
        header: ({ column }) => <DataTableColumnHeader column={column} title="문의 내용" />,
        cell: ({ row }) => (
          <div>
            <p className="text-sm text-foreground line-clamp-2 max-w-md">
              {row.original.message_text}
            </p>
            {row.original.type && (
              <p className="text-xs text-muted-foreground mt-1">유형: {row.original.type}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="상태" />,
        cell: ({ row }) => (
          <Badge variant={statusLabels[row.original.status].variant}>
            {statusLabels[row.original.status].label}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: 'sentiment',
        header: ({ column }) => <DataTableColumnHeader column={column} title="감정" />,
        cell: ({ row }) => {
          const sentiment = row.original.sentiment;
          return sentiment ? (
            <span className="text-sm text-muted-foreground">
              {sentimentLabels[sentiment] ?? sentiment}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: 'urgency',
        header: ({ column }) => <DataTableColumnHeader column={column} title="긴급도" />,
        cell: ({ row }) => {
          const urgency = row.original.urgency;
          return urgency ? (
            <span
              className={`text-sm font-medium ${urgencyLabels[urgency]?.color ?? 'text-muted-foreground'}`}
            >
              {urgencyLabels[urgency]?.label ?? urgency}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: 'received_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="수신 시간" />,
        cell: ({ row }) => (
          <p className="text-sm text-foreground">
            {new Date(row.original.received_at).toLocaleString('ko-KR')}
          </p>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">작업</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">작업 메뉴 열기</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>작업</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onViewDetails(row.original);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  상세 보기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [onViewDetails]
  );

  return (
    <div className="space-y-6">
      {/* FilterBar */}
      <Card className="p-4 border-0 shadow-none">
        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="문의 내용, 고객명으로 검색..."
          filters={
            [
              {
                key: 'status',
                label: '상태',
                type: 'select',
                options: Object.entries(statusLabels).map(([value, { label }]) => ({
                  value,
                  label,
                })),
              },
              {
                key: 'sentiment',
                label: '감정',
                type: 'select',
                options: Object.entries(sentimentLabels).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
              {
                key: 'date',
                label: '수신일',
                type: 'date-range',
              },
            ] as FilterConfig[]
          }
          filterValues={{
            status: statusFilter,
            sentiment: sentimentFilter,
            date: dateRange,
          }}
          onFilterChange={(key, value) => {
            if (key === 'status') setStatusFilter(value as string);
            if (key === 'sentiment') setSentimentFilter(value as string);
            if (key === 'date') setDateRange(value as DateRange);
          }}
          onClearAll={handleClearFilters}
        />
      </Card>

      {/* DataTable */}
      <Card className="p-0 border-0 shadow-none">
        <DataTable
          columns={columns}
          data={filteredInquiries}
          loading={isLoading}
          emptyMessage="문의가 없습니다"
          onRowClick={onViewDetails}
        />
      </Card>
    </div>
  );
}
