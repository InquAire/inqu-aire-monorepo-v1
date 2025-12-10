/**
 * Inquiry Management Hook - Feature Business Logic
 */

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import {
  InquiryStatus,
  useAnalyzeInquiry,
  useInquiries,
  useUpdateInquiry,
  type Inquiry,
} from '@/entities/inquiry';
import { getErrorMessage, useBusinessContext } from '@/shared/lib';
import { exportToFile, transformInquiriesForExport } from '@/shared/lib/export';

import { replySchema, notesSchema, type ReplyFormData, type NotesFormData } from '../model/schemas';

export function useInquiryManagement() {
  const { currentBusiness } = useBusinessContext();
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const { data: inquiriesData, isLoading } = useInquiries({
    business_id: currentBusiness?.id,
  });
  const updateInquiry = useUpdateInquiry();
  const analyzeInquiry = useAnalyzeInquiry();

  const inquiries = inquiriesData?.data ?? [];

  const stats = {
    new: inquiries.filter(i => i.status === InquiryStatus.NEW).length,
    inProgress: inquiries.filter(i => i.status === InquiryStatus.IN_PROGRESS).length,
    completed: inquiries.filter(i => i.status === InquiryStatus.COMPLETED).length,
    total: inquiries.length,
    avgResponseTime: '-',
  };

  const replyForm = useForm<ReplyFormData>({
    resolver: zodResolver(replySchema),
    defaultValues: { message: '' },
  });

  const notesForm = useForm<NotesFormData>({
    resolver: zodResolver(notesSchema),
    defaultValues: { notes: '' },
  });

  const handleStatusChange = useCallback(
    (inquiryId: string, newStatus: InquiryStatus) => {
      updateInquiry.mutate(
        { id: inquiryId, data: { status: newStatus } },
        {
          onSuccess: () => {
            toast.success('상태가 변경되었습니다');
            if (selectedInquiry?.id === inquiryId) {
              setSelectedInquiry({ ...selectedInquiry, status: newStatus });
            }
          },
          onError: error => {
            toast.error('상태 변경 실패', { description: getErrorMessage(error) });
          },
        }
      );
    },
    [selectedInquiry, updateInquiry]
  );

  const handleAnalyze = useCallback(
    (inquiryId: string) => {
      analyzeInquiry.mutate(inquiryId, {
        onSuccess: response => {
          toast.success('AI 분석이 완료되었습니다');
          if (selectedInquiry?.id === inquiryId) {
            setSelectedInquiry({ ...selectedInquiry, ...response });
          }
        },
        onError: error => {
          toast.error('AI 분석 실패', { description: getErrorMessage(error) });
        },
      });
    },
    [selectedInquiry, analyzeInquiry]
  );

  const handleSendReply = useCallback(
    (data: ReplyFormData) => {
      if (!selectedInquiry) return;

      updateInquiry.mutate(
        {
          id: selectedInquiry.id,
          data: { reply_text: data.message, status: InquiryStatus.COMPLETED },
        },
        {
          onSuccess: () => {
            toast.success('답변이 전송되었습니다');
            replyForm.reset();
            setDetailSheetOpen(false);
            setSelectedInquiry(null);
          },
          onError: error => {
            toast.error('답변 전송 실패', { description: getErrorMessage(error) });
          },
        }
      );
    },
    [selectedInquiry, updateInquiry, replyForm]
  );

  const handleSaveNotes = useCallback(
    (data: NotesFormData) => {
      if (!selectedInquiry) return;

      updateInquiry.mutate(
        { id: selectedInquiry.id, data: { notes: data.notes } },
        {
          onSuccess: () => {
            toast.success('메모가 저장되었습니다');
            setSelectedInquiry({ ...selectedInquiry, notes: data.notes ?? null });
          },
          onError: error => {
            toast.error('메모 저장 실패', { description: getErrorMessage(error) });
          },
        }
      );
    },
    [selectedInquiry, updateInquiry]
  );

  const handleViewDetails = useCallback(
    (inquiry: Inquiry) => {
      setSelectedInquiry(inquiry);
      notesForm.reset({ notes: (inquiry.notes as string) ?? '' });
      replyForm.reset({ message: (inquiry.reply_text as string) ?? '' });
      setDetailSheetOpen(true);
    },
    [notesForm, replyForm]
  );

  const handleExport = useCallback(
    (format: 'xlsx' | 'csv') => {
      if (!inquiries || inquiries.length === 0) {
        toast.error('내보낼 데이터가 없습니다');
        return;
      }

      try {
        const transformedData = transformInquiriesForExport(inquiries);
        exportToFile(transformedData, {
          filename: `문의목록_${new Date().toISOString().split('T')[0]}`,
          format,
        });
        toast.success(`${format.toUpperCase()} 파일이 다운로드되었습니다`);
      } catch (error) {
        toast.error('내보내기 실패', { description: getErrorMessage(error) });
      }
    },
    [inquiries]
  );

  const closeDetailSheet = useCallback(() => {
    setDetailSheetOpen(false);
    setSelectedInquiry(null);
  }, []);

  return {
    // Data
    inquiries,
    stats,
    isLoading,
    selectedInquiry,
    detailSheetOpen,

    // Forms
    replyForm,
    notesForm,

    // Loading states
    isUpdating: updateInquiry.isPending,
    isAnalyzing: analyzeInquiry.isPending,

    // Actions
    handleStatusChange,
    handleAnalyze,
    handleSendReply,
    handleSaveNotes,
    handleViewDetails,
    handleExport,
    closeDetailSheet,
    setDetailSheetOpen,
  };
}
