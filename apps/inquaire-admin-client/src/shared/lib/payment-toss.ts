/**
 * Toss Payments 연동 라이브러리
 *
 * Toss Payments를 사용한 결제 처리
 */

import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Toss Payments 클라이언트 키 (환경변수에서 가져오기)
 */
const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY || '';

/**
 * 결제 방법
 */
export enum PaymentMethod {
  CARD = '카드',
  TRANSFER = '계좌이체',
  VIRTUAL_ACCOUNT = '가상계좌',
  MOBILE_PHONE = '휴대폰',
  GIFT_CERTIFICATE = '상품권',
  EASY_PAY = '간편결제',
}

/**
 * 결제 상태
 */
export enum PaymentStatus {
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_DEPOSIT = 'WAITING_FOR_DEPOSIT',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
  PARTIAL_CANCELED = 'PARTIAL_CANCELED',
  ABORTED = 'ABORTED',
  EXPIRED = 'EXPIRED',
}

/**
 * 결제 요청 파라미터
 */
export interface PaymentRequest {
  /** 주문 ID (고유값) */
  orderId: string;
  /** 주문명 */
  orderName: string;
  /** 금액 */
  amount: number;
  /** 고객 이름 */
  customerName?: string;
  /** 고객 이메일 */
  customerEmail?: string;
  /** 고객 휴대폰 번호 */
  customerMobilePhone?: string;
  /** 결제 성공 시 리다이렉트 URL */
  successUrl: string;
  /** 결제 실패 시 리다이렉트 URL */
  failUrl: string;
  /** 결제 방법 (지정하지 않으면 사용자 선택) */
  method?: keyof typeof PaymentMethod;
  /** 카드 할부 개월 수 (지정하지 않으면 일시불) */
  cardInstallmentPlan?: number;
  /** 무이자 할부 여부 */
  cardInterestFree?: boolean;
  /** 가상계좌 입금 기한 (YYYY-MM-DD HH:mm:ss) */
  virtualAccountDueDate?: string;
  /** 에스크로 사용 여부 */
  useEscrow?: boolean;
  /** 문화비 소득공제 사용 여부 */
  culturalExpense?: boolean;
  /** 현금영수증 발급 여부 */
  cashReceipt?: {
    type: 'PERSONAL' | 'BUSINESS';
    number: string;
  };
  /** 기타 메타데이터 */
  metadata?: Record<string, unknown>;
}

/**
 * 결제 승인 결과
 */
export interface PaymentResult {
  /** 결제 키 */
  paymentKey: string;
  /** 주문 ID */
  orderId: string;
  /** 금액 */
  amount: number;
  /** 결제 방법 */
  method: string;
  /** 결제 상태 */
  status: PaymentStatus;
  /** 결제 승인 시간 */
  approvedAt?: string;
  /** 카드 정보 */
  card?: {
    company: string;
    number: string;
    installmentPlanMonths: number;
    isInterestFree: boolean;
    approveNo: string;
  };
  /** 가상계좌 정보 */
  virtualAccount?: {
    bank: string;
    accountNumber: string;
    dueDate: string;
    holderName: string;
  };
  /** 취소 정보 */
  cancels?: Array<{
    canceledAt: string;
    cancelAmount: number;
    cancelReason: string;
  }>;
  /** 영수증 URL */
  receipt?: {
    url: string;
  };
}

interface TossPaymentsInstance {
  requestPayment: (method: string, params: Record<string, unknown>) => Promise<void>;
  requestBillingAuth: (method: string, params: Record<string, unknown>) => Promise<void>;
}

/**
 * Toss Payments SDK 로드
 */
function loadTossPaymentsSDK(): Promise<TossPaymentsInstance> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as { TossPayments?: (key: string) => TossPaymentsInstance };
    if (win.TossPayments) {
      resolve(win.TossPayments(TOSS_CLIENT_KEY));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.async = true;

    script.onload = () => {
      const winLoaded = window as unknown as {
        TossPayments?: (key: string) => TossPaymentsInstance;
      };
      if (winLoaded.TossPayments) {
        resolve(winLoaded.TossPayments(TOSS_CLIENT_KEY));
      } else {
        reject(new Error('Failed to initialize Toss Payments SDK'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Toss Payments SDK'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Toss Payments Hook
 *
 * @example
 * const { requestPayment, loading, error } = useTossPayments();
 *
 * const handlePayment = async () => {
 *   await requestPayment({
 *     orderId: 'ORDER_123',
 *     orderName: '프리미엄 플랜 - 1개월',
 *     amount: 29000,
 *     customerName: '홍길동',
 *     customerEmail: 'hong@example.com',
 *     successUrl: `${window.location.origin}/payment/success`,
 *     failUrl: `${window.location.origin}/payment/fail`,
 *   });
 * };
 */
export function useTossPayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const tossPaymentsRef = useRef<TossPaymentsInstance | null>(null);

  useEffect(() => {
    loadTossPaymentsSDK()
      .then(tossPayments => {
        tossPaymentsRef.current = tossPayments;
      })
      .catch(err => {
        setError(err instanceof Error ? err : new Error(String(err)));
      });
  }, []);

  const requestPayment = useCallback(async (params: PaymentRequest) => {
    if (!tossPaymentsRef.current) {
      throw new Error('Toss Payments SDK not loaded');
    }

    setLoading(true);
    setError(null);

    try {
      await tossPaymentsRef.current.requestPayment(params.method || 'CARD', {
        amount: params.amount,
        orderId: params.orderId,
        orderName: params.orderName,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerMobilePhone: params.customerMobilePhone,
        successUrl: params.successUrl,
        failUrl: params.failUrl,
        cardInstallmentPlan: params.cardInstallmentPlan,
        cardInterestFree: params.cardInterestFree,
        virtualAccountDueDate: params.virtualAccountDueDate,
        useEscrow: params.useEscrow,
        culturalExpense: params.culturalExpense,
        cashReceipt: params.cashReceipt,
        metadata: params.metadata,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const requestBillingAuth = useCallback(
    async (params: { customerKey: string; successUrl: string; failUrl: string }) => {
      if (!tossPaymentsRef.current) {
        throw new Error('Toss Payments SDK not loaded');
      }

      setLoading(true);
      setError(null);

      try {
        await tossPaymentsRef.current.requestBillingAuth('CARD', {
          customerKey: params.customerKey,
          successUrl: params.successUrl,
          failUrl: params.failUrl,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    requestPayment,
    requestBillingAuth,
    loading,
    error,
  };
}

/**
 * Axios 에러에서 메시지 추출
 */
function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (axios.isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}

/**
 * 결제 승인 API 호출
 */
export async function approvePayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<PaymentResult> {
  try {
    const response = await axios.post<PaymentResult>('/api/payments/approve', params);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, '결제 승인에 실패했습니다.'));
  }
}

/**
 * 결제 취소 API 호출
 */
export async function cancelPayment(params: {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;
}): Promise<PaymentResult> {
  try {
    const response = await axios.post<PaymentResult>('/api/payments/cancel', params);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, '결제 취소에 실패했습니다.'));
  }
}

/**
 * 결제 조회 API 호출
 */
export async function getPayment(paymentKey: string): Promise<PaymentResult> {
  try {
    const response = await axios.get<PaymentResult>(`/api/payments/${paymentKey}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, '결제 조회에 실패했습니다.'));
  }
}

/**
 * 자동결제 (빌링) 실행 API 호출
 */
export async function executeBilling(params: {
  customerKey: string;
  billingKey: string;
  orderId: string;
  orderName: string;
  amount: number;
}): Promise<PaymentResult> {
  try {
    const response = await axios.post<PaymentResult>('/api/payments/billing', params);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, '자동결제에 실패했습니다.'));
  }
}

/**
 * 결제 성공 페이지에서 사용하는 Hook
 *
 * @example
 * function PaymentSuccessPage() {
 *   const { paymentKey, orderId, amount } = usePaymentSuccess();
 *
 *   useEffect(() => {
 *     if (paymentKey && orderId && amount) {
 *       approvePayment({ paymentKey, orderId, amount });
 *     }
 *   }, [paymentKey, orderId, amount]);
 * }
 */
export function usePaymentSuccess() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));

  return {
    paymentKey: searchParams.get('paymentKey'),
    orderId: searchParams.get('orderId'),
    amount: searchParams.get('amount') ? parseInt(searchParams.get('amount')!) : null,
  };
}

/**
 * 결제 실패 페이지에서 사용하는 Hook
 *
 * @example
 * function PaymentFailPage() {
 *   const { code, message, orderId } = usePaymentFail();
 *
 *   return (
 *     <div>
 *       <h1>결제 실패</h1>
 *       <p>에러 코드: {code}</p>
 *       <p>메시지: {message}</p>
 *     </div>
 *   );
 * }
 */
export function usePaymentFail() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));

  return {
    code: searchParams.get('code'),
    message: searchParams.get('message'),
    orderId: searchParams.get('orderId'),
  };
}

/**
 * 구독 결제 템플릿
 */
export const SubscriptionPaymentTemplates = {
  /**
   * 스타터 플랜 (월 9,900원)
   */
  starter: (params: {
    orderId: string;
    customerName: string;
    customerEmail: string;
  }): PaymentRequest => ({
    orderId: params.orderId,
    orderName: '스타터 플랜 - 1개월',
    amount: 9900,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    successUrl: `${window.location.origin}/payment/success`,
    failUrl: `${window.location.origin}/payment/fail`,
    method: 'CARD',
  }),

  /**
   * 프로 플랜 (월 29,000원)
   */
  pro: (params: {
    orderId: string;
    customerName: string;
    customerEmail: string;
  }): PaymentRequest => ({
    orderId: params.orderId,
    orderName: '프로 플랜 - 1개월',
    amount: 29000,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    successUrl: `${window.location.origin}/payment/success`,
    failUrl: `${window.location.origin}/payment/fail`,
    method: 'CARD',
  }),

  /**
   * 엔터프라이즈 플랜 (월 99,000원)
   */
  enterprise: (params: {
    orderId: string;
    customerName: string;
    customerEmail: string;
  }): PaymentRequest => ({
    orderId: params.orderId,
    orderName: '엔터프라이즈 플랜 - 1개월',
    amount: 99000,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    successUrl: `${window.location.origin}/payment/success`,
    failUrl: `${window.location.origin}/payment/fail`,
    method: 'CARD',
  }),
};
