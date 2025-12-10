/**
 * Inquiry Reply Types
 */

export enum SenderType {
  AI = 'AI',
  HUMAN = 'HUMAN',
  SYSTEM = 'SYSTEM',
}

export const SenderTypeLabels: Record<SenderType, string> = {
  [SenderType.AI]: 'AI 자동',
  [SenderType.HUMAN]: '관리자',
  [SenderType.SYSTEM]: '시스템',
};

export interface InquiryReply {
  id: string;
  inquiry_id: string;
  message_text: string;
  sender_type: SenderType;
  sender_id: string | null;
  is_sent: boolean;
  sent_at: string | null;
  failed_reason: string | null;
  retry_count: number;
  created_at: string;
  inquiry?: Record<string, unknown>;
}

export interface InquiryReplyResponse {
  data: InquiryReply[];
  total: number;
}

/**
 * 답변 생성 요청
 */
export interface CreateInquiryReplyRequest {
  inquiry_id: string;
  message_text: string;
  sender_type: SenderType;
  sender_id?: string;
  is_sent?: boolean;
}

/**
 * 답변 업데이트 요청
 */
export interface UpdateInquiryReplyRequest {
  message_text?: string;
  sender_type?: SenderType;
  sender_id?: string;
  is_sent?: boolean;
}

/**
 * 답변 목록 조회 파라미터
 */
export interface QueryInquiryReplyParams {
  inquiry_id?: string;
  sender_type?: SenderType;
  is_sent?: boolean;
  limit?: number;
  offset?: number;
}
