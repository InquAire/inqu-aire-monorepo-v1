/**
 * 실시간 통신 라이브러리 (WebSocket & SSE)
 *
 * WebSocket과 Server-Sent Events를 지원하는 실시간 통신 유틸리티
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * WebSocket 연결 상태
 */
export enum WebSocketStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
}

/**
 * WebSocket 메시지 타입
 */
export interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
}

/**
 * WebSocket Hook 옵션
 */
interface UseWebSocketOptions {
  /** WebSocket URL */
  url: string;
  /** 자동 재연결 여부 (기본값: true) */
  autoReconnect?: boolean;
  /** 재연결 간격 (ms, 기본값: 3000) */
  reconnectInterval?: number;
  /** 최대 재연결 시도 횟수 (기본값: 5) */
  maxReconnectAttempts?: number;
  /** 연결 시 콜백 */
  onOpen?: (event: Event) => void;
  /** 메시지 수신 시 콜백 */
  onMessage?: (message: WebSocketMessage) => void;
  /** 에러 발생 시 콜백 */
  onError?: (event: Event) => void;
  /** 연결 종료 시 콜백 */
  onClose?: (event: CloseEvent) => void;
  /** 즉시 연결 여부 (기본값: true) */
  immediate?: boolean;
}

/**
 * WebSocket Hook
 *
 * @example
 * const { status, send, close } = useWebSocket({
 *   url: 'ws://localhost:3000/ws',
 *   onMessage: (message) => {
 *     console.log('Received:', message);
 *   },
 * });
 */
export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onMessage,
    onError,
    onClose,
    immediate = true,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>(WebSocketStatus.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus(WebSocketStatus.CONNECTING);

    try {
      const ws = new WebSocket(url);

      ws.onopen = event => {
        setStatus(WebSocketStatus.CONNECTED);
        reconnectAttemptsRef.current = 0;
        onOpen?.(event);
      };

      ws.onmessage = event => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = event => {
        setStatus(WebSocketStatus.ERROR);
        onError?.(event);
      };

      ws.onclose = event => {
        setStatus(WebSocketStatus.DISCONNECTED);
        onClose?.(event);

        // 자동 재연결
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus(WebSocketStatus.ERROR);
    }
  }, [
    url,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    onOpen,
    onMessage,
    onError,
    onClose,
  ]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const dataObj = data as Record<string, unknown> | undefined;
      const message: WebSocketMessage = {
        type: (dataObj?.type as string) || 'message',
        data: dataObj?.data || data,
        timestamp: Date.now(),
      };
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const close = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    if (immediate) {
      connect();
    }

    return () => {
      close();
    };
  }, [immediate, connect, close]);

  return {
    status,
    lastMessage,
    send,
    connect,
    close,
  };
}

/**
 * SSE (Server-Sent Events) Hook 옵션
 */
interface UseSSEOptions {
  /** SSE URL */
  url: string;
  /** 자동 재연결 여부 (기본값: true) */
  autoReconnect?: boolean;
  /** 재연결 간격 (ms, 기본값: 3000) */
  reconnectInterval?: number;
  /** 이벤트 핸들러 맵 */
  eventHandlers?: Record<string, (event: MessageEvent) => void>;
  /** 연결 시 콜백 */
  onOpen?: () => void;
  /** 에러 발생 시 콜백 */
  onError?: (error: Event) => void;
  /** 즉시 연결 여부 (기본값: true) */
  immediate?: boolean;
}

/**
 * SSE (Server-Sent Events) Hook
 *
 * @example
 * const { status, data } = useSSE({
 *   url: '/api/events',
 *   eventHandlers: {
 *     'new-inquiry': (event) => {
 *       console.log('New inquiry:', JSON.parse(event.data));
 *     },
 *   },
 * });
 */
export function useSSE(options: UseSSEOptions) {
  const {
    url,
    autoReconnect = true,
    reconnectInterval = 3000,
    eventHandlers = {},
    onOpen,
    onError,
    immediate = true,
  } = options;

  const [status, setStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>(
    'DISCONNECTED'
  );
  const [data, setData] = useState<unknown>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return;
    }

    setStatus('CONNECTING');

    try {
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setStatus('CONNECTED');
        onOpen?.();
      };

      eventSource.onerror = error => {
        setStatus('ERROR');
        onError?.(error);
        eventSource.close();
        eventSourceRef.current = null;

        // 자동 재연결
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      // 기본 메시지 핸들러
      eventSource.onmessage = event => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
        } catch {
          setData(event.data);
        }
      };

      // 커스텀 이벤트 핸들러 등록
      Object.entries(eventHandlers).forEach(([eventType, handler]) => {
        eventSource.addEventListener(eventType, handler);
      });

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      setStatus('ERROR');
    }
  }, [url, autoReconnect, reconnectInterval, eventHandlers, onOpen, onError]);

  const close = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setStatus('DISCONNECTED');
  }, []);

  useEffect(() => {
    if (immediate) {
      connect();
    }

    return () => {
      close();
    };
  }, [immediate, connect, close]);

  return {
    status,
    data,
    connect,
    close,
  };
}

/**
 * 실시간 알림을 위한 Hook (WebSocket 또는 SSE)
 *
 * @example
 * const { notifications, markAsRead } = useRealtimeNotifications({
 *   url: '/api/notifications/stream',
 *   type: 'sse',
 * });
 */
export function useRealtimeNotifications(options: {
  url: string;
  type: 'websocket' | 'sse';
  onNotification?: (notification: unknown) => void;
}) {
  const { url, type, onNotification } = options;
  const [notifications, setNotifications] = useState<unknown[]>([]);

  const handleMessage = useCallback(
    (data: unknown) => {
      const notification = typeof data === 'string' ? JSON.parse(data) : data;
      setNotifications(prev => [notification, ...prev]);
      onNotification?.(notification);
    },
    [onNotification]
  );

  // WebSocket 사용
  const ws = useWebSocket({
    url,
    immediate: type === 'websocket',
    onMessage: message => handleMessage(message.data),
  });

  // SSE 사용
  const sse = useSSE({
    url,
    immediate: type === 'sse',
    eventHandlers: {
      notification: event => handleMessage(event.data),
    },
  });

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => {
        const notification = n as Record<string, unknown>;
        return notification.id === notificationId ? { ...notification, read: true } : n;
      })
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    status: type === 'websocket' ? ws.status : sse.status,
    markAsRead,
    clearAll,
    close: type === 'websocket' ? ws.close : sse.close,
  };
}

/**
 * 실시간 데이터 동기화 Hook
 *
 * @example
 * const { data, isConnected } = useRealtimeSync({
 *   url: 'ws://localhost:3000/sync',
 *   initialData: { count: 0 },
 * });
 */
export function useRealtimeSync<T = unknown>(options: {
  url: string;
  initialData: T;
  onUpdate?: (data: T) => void;
}) {
  const { url, initialData, onUpdate } = options;
  const [data, setData] = useState<T>(initialData);

  const { status, send } = useWebSocket({
    url,
    onMessage: message => {
      if (message.type === 'update') {
        const typedData = message.data as T;
        setData(typedData);
        onUpdate?.(typedData);
      }
    },
  });

  const updateData = useCallback(
    (newData: Partial<T>) => {
      const updated = { ...data, ...newData } as T;
      setData(updated);
      send({ type: 'update', data: updated });
    },
    [data, send]
  );

  return {
    data,
    updateData,
    isConnected: status === WebSocketStatus.CONNECTED,
    status,
  };
}
