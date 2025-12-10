/**
 * 브라우저 Notification API 유틸리티
 *
 * 데스크톱 푸시 알림을 위한 브라우저 Notification API 통합
 */

import { useCallback, useState } from 'react';

/**
 * 알림 권한 상태
 */
export type NotificationPermission = 'default' | 'granted' | 'denied';

/**
 * 브라우저 알림 옵션
 */
export interface BrowserNotificationOptions {
  /** 알림 제목 */
  title: string;
  /** 알림 본문 */
  body?: string;
  /** 알림 아이콘 */
  icon?: string;
  /** 알림 배지 (작은 아이콘) */
  badge?: string;
  /** 알림 이미지 */
  image?: string;
  /** 알림 태그 (같은 태그는 하나만 표시) */
  tag?: string;
  /** 무음 여부 */
  silent?: boolean;
  /** 알림 데이터 */
  data?: unknown;
  /** 클릭 시 URL */
  url?: string;
  /** 자동 닫기 시간 (ms) */
  autoClose?: number;
  /** 클릭 시 콜백 */
  onClick?: () => void;
  /** 닫기 시 콜백 */
  onClose?: () => void;
  /** 에러 시 콜백 */
  onError?: (error: Event) => void;
}

/**
 * 브라우저 알림이 지원되는지 확인
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return 'denied';
  }
}

/**
 * 브라우저 알림 표시
 */
export function showBrowserNotification(options: BrowserNotificationOptions): Notification | null {
  const {
    title,
    body,
    icon = '/logo.png',
    badge,
    image,
    tag,
    silent = false,
    data,
    url,
    autoClose,
    onClick,
    onClose,
    onError,
  } = options;

  if (!isNotificationSupported()) {
    console.warn('Browser notifications are not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon,
      badge,
      tag,
      silent,
      data,
      // Note: 'image' is not standard NotificationOptions, using extended options
      ...(image && { image }),
    } as NotificationOptions);

    // 클릭 이벤트
    notification.onclick = () => {
      if (url) {
        window.open(url, '_blank');
      }
      onClick?.();
      notification.close();
    };

    // 닫기 이벤트
    notification.onclose = () => {
      onClose?.();
    };

    // 에러 이벤트
    notification.onerror = error => {
      onError?.(error);
    };

    // 자동 닫기
    if (autoClose) {
      setTimeout(() => {
        notification.close();
      }, autoClose);
    }

    return notification;
  } catch (error) {
    console.error('Failed to show notification:', error);
    return null;
  }
}

/**
 * 브라우저 알림 Hook
 *
 * @example
 * const { permission, requestPermission, show } = useBrowserNotification();
 *
 * const handleClick = async () => {
 *   if (permission !== 'granted') {
 *     await requestPermission();
 *   }
 *   show({
 *     title: '새로운 문의',
 *     body: '긴급 문의가 도착했습니다.',
 *   });
 * };
 */
export function useBrowserNotification() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (!isNotificationSupported()) {
      return 'denied';
    }
    return Notification.permission;
  });

  const [isSupported] = useState(isNotificationSupported());

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  const show = useCallback((options: BrowserNotificationOptions) => {
    return showBrowserNotification(options);
  }, []);

  return {
    permission,
    isSupported,
    requestPermission,
    show,
  };
}

/**
 * 알림 템플릿
 */
export const NotificationTemplates = {
  /**
   * 새로운 문의 알림
   */
  newInquiry: (data: { customerName: string; message: string }): BrowserNotificationOptions => ({
    title: '📩 새로운 문의',
    body: `${data.customerName}님으로부터 문의가 도착했습니다.\n"${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}"`,
    icon: '/icons/inquiry.png',
    tag: 'new-inquiry',
    url: '/inquiries',
    autoClose: 10000,
  }),

  /**
   * 긴급 문의 알림
   */
  urgentInquiry: (data: { customerName: string; message: string }): BrowserNotificationOptions => ({
    title: '🚨 긴급 문의',
    body: `${data.customerName}님으로부터 긴급 문의가 도착했습니다.\n"${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}"`,
    icon: '/icons/urgent.png',
    tag: 'urgent-inquiry',
    url: '/inquiries',
    silent: false,
  }),

  /**
   * 채널 에러 알림
   */
  channelError: (data: { channelName: string; error: string }): BrowserNotificationOptions => ({
    title: '⚠️ 채널 연동 오류',
    body: `${data.channelName} 채널에서 오류가 발생했습니다.\n${data.error}`,
    icon: '/icons/error.png',
    tag: 'channel-error',
    url: '/channels',
    autoClose: 15000,
  }),

  /**
   * 결제 성공 알림
   */
  paymentSuccess: (data: { amount: number; plan: string }): BrowserNotificationOptions => ({
    title: '✅ 결제 완료',
    body: `${data.plan} 플랜 결제가 완료되었습니다.\n금액: ${data.amount.toLocaleString()}원`,
    icon: '/icons/payment-success.png',
    tag: 'payment-success',
    url: '/subscriptions',
    autoClose: 8000,
  }),

  /**
   * 결제 실패 알림
   */
  paymentFailed: (data: { reason: string }): BrowserNotificationOptions => ({
    title: '❌ 결제 실패',
    body: `결제가 실패했습니다.\n사유: ${data.reason}`,
    icon: '/icons/payment-failed.png',
    tag: 'payment-failed',
    url: '/subscriptions',
    autoClose: 15000,
  }),

  /**
   * 구독 만료 임박 알림
   */
  subscriptionExpiring: (data: { daysLeft: number; plan: string }): BrowserNotificationOptions => ({
    title: '⏰ 구독 만료 임박',
    body: `${data.plan} 플랜이 ${data.daysLeft}일 후 만료됩니다.\n지금 갱신하세요!`,
    icon: '/icons/subscription.png',
    tag: 'subscription-expiring',
    url: '/subscriptions',
    autoClose: 12000,
  }),

  /**
   * 시스템 업데이트 알림
   */
  systemUpdate: (data: { version: string; features: string[] }): BrowserNotificationOptions => ({
    title: '🎉 시스템 업데이트',
    body: `버전 ${data.version}이 출시되었습니다.\n${data.features.slice(0, 2).join(', ')} 등의 기능이 추가되었습니다.`,
    icon: '/icons/update.png',
    tag: 'system-update',
    autoClose: 10000,
  }),

  /**
   * 일반 알림
   */
  generic: (data: {
    title: string;
    message: string;
    url?: string;
  }): BrowserNotificationOptions => ({
    title: data.title,
    body: data.message,
    url: data.url,
    autoClose: 8000,
  }),
};

/**
 * 알림 센터와 통합된 브라우저 알림 Hook
 *
 * @example
 * const { showNotification } = useIntegratedNotification();
 *
 * showNotification('NEW_INQUIRY', {
 *   customerName: '홍길동',
 *   message: '문의 내용...',
 * });
 */
type TemplateDataMap = {
  newInquiry: { customerName: string; message: string };
  urgentInquiry: { customerName: string; message: string };
  channelError: { channelName: string; error: string };
  paymentSuccess: { amount: number; plan: string };
  paymentFailed: { reason: string };
  subscriptionExpiring: { daysLeft: number; plan: string };
  systemUpdate: { version: string; features: string[] };
  generic: { title: string; message: string; url?: string };
};

export function useIntegratedNotification() {
  const { permission, requestPermission, show } = useBrowserNotification();

  const showNotification = useCallback(
    async <T extends keyof TemplateDataMap>(
      type: T,
      data: TemplateDataMap[T],
      options?: Partial<BrowserNotificationOptions>
    ) => {
      // 권한 확인 및 요청
      if (permission !== 'granted') {
        const result = await requestPermission();
        if (result !== 'granted') {
          console.warn('Notification permission denied');
          return null;
        }
      }

      // 템플릿에서 알림 옵션 가져오기
      const template = NotificationTemplates[type] as (data: TemplateDataMap[T]) => BrowserNotificationOptions;

      if (!template) {
        console.warn(`Unknown notification template: ${type}`);
        return null;
      }

      const notificationOptions = {
        ...template(data),
        ...options,
      };

      return show(notificationOptions);
    },
    [permission, requestPermission, show]
  );

  return {
    permission,
    requestPermission,
    showNotification,
  };
}

/**
 * 알림 배치 (여러 알림을 그룹화)
 */
export class NotificationBatch {
  private notifications: Notification[] = [];

  add(options: BrowserNotificationOptions): void {
    const notification = showBrowserNotification(options);
    if (notification) {
      this.notifications.push(notification);
    }
  }

  closeAll(): void {
    this.notifications.forEach(n => n.close());
    this.notifications = [];
  }

  get count(): number {
    return this.notifications.length;
  }
}

/**
 * 알림 큐 (순차적으로 알림 표시)
 */
export class NotificationQueue {
  private queue: BrowserNotificationOptions[] = [];
  private isProcessing = false;
  private delay = 2000; // 2초 간격

  constructor(delay?: number) {
    if (delay) {
      this.delay = delay;
    }
  }

  enqueue(options: BrowserNotificationOptions): void {
    this.queue.push(options);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const options = this.queue.shift();
      if (options) {
        showBrowserNotification(options);
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    this.isProcessing = false;
  }

  clear(): void {
    this.queue = [];
  }

  get length(): number {
    return this.queue.length;
  }
}
