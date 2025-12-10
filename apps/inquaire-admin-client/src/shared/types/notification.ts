export enum NotificationType {
  NEW_INQUIRY = 'NEW_INQUIRY',
  URGENT_INQUIRY = 'URGENT_INQUIRY',
  CHANNEL_ERROR = 'CHANNEL_ERROR',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
}

export const NotificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.NEW_INQUIRY]: '새 문의',
  [NotificationType.URGENT_INQUIRY]: '긴급 문의',
  [NotificationType.CHANNEL_ERROR]: '채널 오류',
  [NotificationType.PAYMENT_SUCCESS]: '결제 완료',
  [NotificationType.PAYMENT_FAILED]: '결제 실패',
  [NotificationType.SUBSCRIPTION_EXPIRING]: '구독 만료 임박',
  [NotificationType.SYSTEM_UPDATE]: '시스템 업데이트',
};

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  enabled: boolean;
  newInquiry: boolean;
  urgentInquiry: boolean;
  channelError: boolean;
  paymentSuccess: boolean;
  paymentFailed: boolean;
  subscriptionExpiring: boolean;
  systemUpdate: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
}
