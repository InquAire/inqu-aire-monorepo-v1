/**
 * Inquiry Detail Sheet - Feature UI Component
 */

import { Save, Send, Sparkles } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';

import { InquiryStatus, type Inquiry } from '@/entities/inquiry';
import {
  Avatar,
  AvatarFallback,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Label,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@/shared/ui';

import { sentimentLabels, statusLabels, urgencyLabels } from '../model/constants';
import type { NotesFormData, ReplyFormData } from '../model/schemas';

import { InquiryReplyHistory } from './inquiry-reply-history';

interface InquiryDetailSheetProps {
  inquiry: Inquiry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyForm: UseFormReturn<ReplyFormData>;
  notesForm: UseFormReturn<NotesFormData>;
  onStatusChange: (inquiryId: string, status: InquiryStatus) => void;
  onAnalyze: (inquiryId: string) => void;
  onSendReply: (data: ReplyFormData) => void;
  onSaveNotes: (data: NotesFormData) => void;
  isUpdating: boolean;
  isAnalyzing: boolean;
}

export function InquiryDetailSheet({
  inquiry,
  open,
  onOpenChange,
  replyForm,
  notesForm,
  onStatusChange,
  onAnalyze,
  onSendReply,
  onSaveNotes,
  isUpdating,
  isAnalyzing,
}: InquiryDetailSheetProps) {
  if (!inquiry) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <div className="space-y-6">
          <SheetHeader>
            <SheetTitle>문의 상세</SheetTitle>
            <SheetDescription>
              {new Date(inquiry.received_at).toLocaleString('ko-KR')} 수신
            </SheetDescription>
          </SheetHeader>

          {/* Customer Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {inquiry.customer?.name?.[0]?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{inquiry.customer?.name ?? '익명'}</p>
              <p className="text-sm text-muted-foreground">
                {inquiry.customer?.phone ?? inquiry.customer?.email ?? '-'}
              </p>
            </div>
          </div>

          {/* Status and Actions */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-2">상태</Label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={inquiry.status}
                onChange={e => onStatusChange(inquiry.id, e.target.value as InquiryStatus)}
              >
                {Object.entries(statusLabels).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAnalyze(inquiry.id)}
                disabled={isAnalyzing}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI 분석
              </Button>
            </div>
          </div>

          <Separator />

          {/* Original Message */}
          <div>
            <Label className="text-sm font-medium mb-2 block">원본 메시지</Label>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-foreground whitespace-pre-wrap">{inquiry.message_text}</p>
            </div>
          </div>

          {/* AI Analysis Results */}
          {inquiry.analyzed_at && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">AI 분석 결과</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">문의 유형</p>
                  <p className="text-sm font-medium text-foreground">{inquiry.type ?? '-'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">감정</p>
                  <p className="text-sm font-medium text-foreground">
                    {inquiry.sentiment
                      ? (sentimentLabels[inquiry.sentiment] ?? inquiry.sentiment)
                      : '-'}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">긴급도</p>
                  <p
                    className={`text-sm font-medium ${
                      inquiry.urgency
                        ? (urgencyLabels[inquiry.urgency]?.color ?? 'text-foreground')
                        : 'text-foreground'
                    }`}
                  >
                    {inquiry.urgency
                      ? (urgencyLabels[inquiry.urgency]?.label ?? inquiry.urgency)
                      : '-'}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">신뢰도</p>
                  <p className="text-sm font-medium text-foreground">
                    {inquiry.ai_confidence ? `${Math.round(inquiry.ai_confidence * 100)}%` : '-'}
                  </p>
                </div>
              </div>
              {inquiry.summary && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">요약</p>
                  <p className="text-sm text-foreground">{inquiry.summary}</p>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Reply Section */}
          <div>
            <Label className="text-sm font-medium mb-2 block">답변 작성</Label>
            <Form {...replyForm}>
              <form onSubmit={replyForm.handleSubmit(onSendReply)} className="space-y-3">
                <FormField
                  control={replyForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="고객에게 보낼 답변을 입력하세요..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full gap-2" disabled={isUpdating}>
                  <Send className="h-4 w-4" />
                  답변 전송 및 완료
                </Button>
              </form>
            </Form>
          </div>

          <Separator />

          {/* Notes Section */}
          <div>
            <Label className="text-sm font-medium mb-2 block">메모</Label>
            <Form {...notesForm}>
              <form onSubmit={notesForm.handleSubmit(onSaveNotes)} className="space-y-3">
                <FormField
                  control={notesForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="내부 메모를 입력하세요..."
                          className="min-h-20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isUpdating}
                >
                  <Save className="h-4 w-4" />
                  메모 저장
                </Button>
              </form>
            </Form>
          </div>

          <Separator />

          {/* Reply History */}
          <InquiryReplyHistory inquiryId={inquiry.id} />

          {/* Metadata */}
          <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
            <p>수신 시간: {new Date(inquiry.received_at).toLocaleString('ko-KR')}</p>
            {inquiry.analyzed_at && (
              <p>분석 시간: {new Date(inquiry.analyzed_at).toLocaleString('ko-KR')}</p>
            )}
            {inquiry.replied_at && (
              <p>답변 시간: {new Date(inquiry.replied_at).toLocaleString('ko-KR')}</p>
            )}
            {inquiry.ai_model && <p>AI 모델: {inquiry.ai_model}</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
