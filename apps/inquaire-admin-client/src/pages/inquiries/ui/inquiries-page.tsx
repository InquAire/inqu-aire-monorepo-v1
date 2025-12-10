/**
 * Inquiries Page - FSD Pages Layer
 *
 * Composes inquiry management features into a complete page.
 */

import { Download, MessageSquare } from 'lucide-react';

import {
  InquiryDetailSheet,
  InquiryListWidget,
  InquiryStatsCards,
  useInquiryManagement,
} from '@/features/inquiry-management';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PageHeader,
} from '@/shared/ui';

export function InquiriesPage() {
  const {
    inquiries,
    stats,
    isLoading,
    selectedInquiry,
    detailSheetOpen,
    replyForm,
    notesForm,
    isUpdating,
    isAnalyzing,
    handleStatusChange,
    handleAnalyze,
    handleSendReply,
    handleSaveNotes,
    handleViewDetails,
    handleExport,
    setDetailSheetOpen,
  } = useInquiryManagement();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="문의 관리"
        description="고객 문의를 확인하고 응답합니다"
        icon={<MessageSquare className="h-6 w-6" />}
        breadcrumbs={[{ label: '문의 관리' }]}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                내보내기
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>CSV (.csv)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <main className="p-8">
        <InquiryStatsCards stats={stats} />
        <InquiryListWidget
          inquiries={inquiries}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
        />
      </main>

      <InquiryDetailSheet
        inquiry={selectedInquiry}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        replyForm={replyForm}
        notesForm={notesForm}
        onStatusChange={handleStatusChange}
        onAnalyze={handleAnalyze}
        onSendReply={handleSendReply}
        onSaveNotes={handleSaveNotes}
        isUpdating={isUpdating}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
}
