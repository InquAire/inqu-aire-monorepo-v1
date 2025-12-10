/**
 * Inquiry Reply History - Feature UI Component
 */

import { SenderType, SenderTypeLabels, useInquiryRepliesByInquiryId } from '@/entities/inquiry-reply';
import { Badge, Label } from '@/shared/ui';

interface InquiryReplyHistoryProps {
  inquiryId: string;
}

export function InquiryReplyHistory({ inquiryId }: InquiryReplyHistoryProps) {
  const { data: repliesData, isLoading } = useInquiryRepliesByInquiryId(inquiryId);
  const replies = repliesData?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">답변 이력</Label>
        <div className="p-4 text-center text-sm text-slate-500">로딩 중...</div>
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">답변 이력</Label>
        <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-lg">
          아직 답변 이력이 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">답변 이력 ({replies.length})</Label>
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {replies.map(reply => (
          <div
            key={reply.id}
            className={`p-3 rounded-lg border ${
              reply.sender_type === SenderType.AI
                ? 'bg-purple-50 border-purple-200'
                : reply.sender_type === SenderType.HUMAN
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {SenderTypeLabels[reply.sender_type]}
                </Badge>
                {reply.is_sent ? (
                  <Badge
                    variant="outline"
                    className="text-xs bg-green-50 text-green-700 border-green-200"
                  >
                    전송 완료
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                  >
                    미전송
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(reply.created_at).toLocaleString('ko-KR')}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{reply.message_text}</p>
            {reply.failed_reason && (
              <div className="mt-2 pt-2 border-t border-red-200">
                <p className="text-xs text-red-600">실패: {reply.failed_reason}</p>
              </div>
            )}
            {reply.sent_at && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  전송 시간: {new Date(reply.sent_at).toLocaleString('ko-KR')}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
