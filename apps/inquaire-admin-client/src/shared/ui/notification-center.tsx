import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Bell, Check, CheckCheck, Circle, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { useNotifications } from '../hooks/useNotifications';
import { NotificationType, NotificationTypeLabels } from '../types/notification';

import { Badge } from './badge';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './dropdown-menu';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAll } =
    useNotifications();
  const [open, setOpen] = useState(false);

  // 알림 유형별 아이콘 색상
  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.NEW_INQUIRY:
        return 'text-blue-600';
      case NotificationType.URGENT_INQUIRY:
        return 'text-red-600';
      case NotificationType.CHANNEL_ERROR:
        return 'text-orange-600';
      case NotificationType.PAYMENT_SUCCESS:
        return 'text-green-600';
      case NotificationType.PAYMENT_FAILED:
        return 'text-red-600';
      case NotificationType.SUBSCRIPTION_EXPIRING:
        return 'text-yellow-600';
      case NotificationType.SYSTEM_UPDATE:
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  // 시간 포맷
  const formatTime = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ko,
      });
    } catch {
      return '방금 전';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">알림</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount}개 읽지 않음
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={markAllAsRead}>
                <CheckCheck className="h-3 w-3 mr-1" />
                모두 읽음
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (confirm('모든 알림을 삭제하시겠습니까?')) {
                    deleteAll();
                  }
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                모두 삭제
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">새로운 알림이 없습니다</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Type Indicator */}
                    <div className={`mt-1 ${getNotificationColor(notification.type)}`}>
                      {!notification.read ? (
                        <Circle className="h-2 w-2 fill-current" />
                      ) : (
                        <Circle className="h-2 w-2 fill-gray-300 text-gray-300" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {NotificationTypeLabels[notification.type]}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          <h4
                            className={`text-sm font-medium mb-1 ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Link */}
                          {notification.link && (
                            <Link
                              to={notification.link}
                              className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                              onClick={() => {
                                markAsRead(notification.id);
                                setOpen(false);
                              }}
                            >
                              자세히 보기 →
                            </Link>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => markAsRead(notification.id)}
                              title="읽음 표시"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-600"
                            onClick={() => deleteNotification(notification.id)}
                            title="삭제"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Link
                to="/settings"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 py-2 hover:bg-gray-50 rounded transition-colors"
                onClick={() => setOpen(false)}
              >
                알림 설정 →
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
