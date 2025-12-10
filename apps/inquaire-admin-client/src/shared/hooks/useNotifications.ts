import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type {
  Notification,
  NotificationPreferences,
  NotificationType,
} from '../types/notification';

const NOTIFICATIONS_KEY = 'inquaire-notifications';
const PREFERENCES_KEY = 'inquaire-notification-preferences';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  newInquiry: true,
  urgentInquiry: true,
  channelError: true,
  paymentSuccess: true,
  paymentFailed: true,
  subscriptionExpiring: true,
  systemUpdate: true,
  soundEnabled: true,
  desktopEnabled: false,
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
  });

  // LocalStorage에 저장
  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  // 알림 추가
  const addNotification = (
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, unknown>
  ) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      link,
      read: false,
      createdAt: new Date(),
      metadata,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Toast 알림 표시 (설정된 경우)
    if (preferences.enabled) {
      const shouldNotify = shouldShowNotification(type);
      if (shouldNotify) {
        toast.info(title, {
          description: message,
        });

        // 사운드 재생 (설정된 경우)
        if (preferences.soundEnabled) {
          playNotificationSound();
        }
      }
    }

    return newNotification.id;
  };

  // 알림 읽음 처리
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));
  };

  // 모두 읽음 처리
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // 알림 삭제
  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // 모두 삭제
  const deleteAll = () => {
    setNotifications([]);
  };

  // 알림 유형별 표시 여부 확인
  const shouldShowNotification = (type: NotificationType): boolean => {
    switch (type) {
      case 'NEW_INQUIRY':
        return preferences.newInquiry;
      case 'URGENT_INQUIRY':
        return preferences.urgentInquiry;
      case 'CHANNEL_ERROR':
        return preferences.channelError;
      case 'PAYMENT_SUCCESS':
        return preferences.paymentSuccess;
      case 'PAYMENT_FAILED':
        return preferences.paymentFailed;
      case 'SUBSCRIPTION_EXPIRING':
        return preferences.subscriptionExpiring;
      case 'SYSTEM_UPDATE':
        return preferences.systemUpdate;
      default:
        return true;
    }
  };

  // 사운드 재생
  const playNotificationSound = () => {
    // 브라우저 기본 알림음 재생 (실제로는 커스텀 사운드 파일 사용 가능)
    const audio = new Audio(
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGmi78OScTgwMUKzn77FdGAY3k9n0y3krBSR3x/HdkEAKFF607eumVBELRp/j8bllHgYogM/y24k2CBtpvO7mnEwMC1Ct5++wWhgGOJPY88x6KwUkd8jw35FAChRevO3qpVQRC0af5PC4ZB0HKoHO8tuJNggbabzu5ZtMDAhSrujssFoYBjiT2fPMeyoFJHjH8d+RQAoUXrvo6qRUEQpGn+TwuGMdByiAzvLbiTYIG2q77eWaTAwIUq7m7K9aGAU4k9rzzHsqBSR4x/DfkUAKFF686+mkVBEKRqDk8LhjHgcogM/y24o2CAcP'
    );
    audio.volume = 0.3;
    audio.play().catch(() => {
      // 자동 재생이 차단된 경우 무시
    });
  };

  // 읽지 않은 알림 개수
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    preferences,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
    updatePreferences: setPreferences,
  };
}
