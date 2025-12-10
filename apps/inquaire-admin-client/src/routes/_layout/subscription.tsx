import { createFileRoute } from '@tanstack/react-router';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useBusinesses } from '@/entities/business';
import { PaymentStatus, usePaymentHistory } from '@/entities/payment';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  useBusinessSubscription,
  useCancelSubscription,
} from '@/entities/subscription';
import { getErrorMessage } from '@/shared/lib';
import { useOrganization } from '@/shared/lib/organization';
import { Badge, Button, Card, PageHeader } from '@/shared/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

export const Route = createFileRoute('/_layout/subscription')({
  component: SubscriptionPage,
});

// 플랜별 정보
const PLAN_INFO = {
  [SubscriptionPlan.TRIAL]: {
    name: '무료 체험',
    limit: 100,
    price: 0,
    color: 'bg-gray-100 text-gray-800',
  },
  [SubscriptionPlan.BASIC]: {
    name: '베이직',
    limit: 1000,
    price: 29000,
    color: 'bg-blue-100 text-blue-800',
  },
  [SubscriptionPlan.PRO]: {
    name: '프로',
    limit: 5000,
    price: 99000,
    color: 'bg-purple-100 text-purple-800',
  },
  [SubscriptionPlan.ENTERPRISE]: {
    name: '엔터프라이즈',
    limit: 99999,
    price: 299000,
    color: 'bg-amber-100 text-amber-800',
  },
};

// 상태별 정보
const STATUS_INFO = {
  [SubscriptionStatus.TRIAL]: { label: '체험 중', color: 'bg-gray-100 text-gray-800' },
  [SubscriptionStatus.ACTIVE]: { label: '활성', color: 'bg-green-100 text-green-800' },
  [SubscriptionStatus.PAST_DUE]: { label: '결제 지연', color: 'bg-red-100 text-red-800' },
  [SubscriptionStatus.CANCELED]: { label: '취소됨', color: 'bg-gray-100 text-gray-800' },
  [SubscriptionStatus.EXPIRED]: { label: '만료됨', color: 'bg-gray-100 text-gray-800' },
};

const PAYMENT_STATUS_INFO = {
  [PaymentStatus.PENDING]: { label: '대기 중', color: 'bg-yellow-100 text-yellow-800' },
  [PaymentStatus.COMPLETED]: { label: '완료', color: 'bg-green-100 text-green-800' },
  [PaymentStatus.FAILED]: { label: '실패', color: 'bg-red-100 text-red-800' },
  [PaymentStatus.REFUNDED]: { label: '환불', color: 'bg-gray-100 text-gray-800' },
};

function SubscriptionPage() {
  const { currentOrganization } = useOrganization();
  const { data: businesses } = useBusinesses(currentOrganization?.id ?? '');
  const businessId = businesses?.[0]?.id; // 첫 번째 사업체 사용
  const { data: subscription, isLoading: subscriptionLoading } = useBusinessSubscription(
    businessId!
  );
  const { data: paymentHistory, isLoading: paymentsLoading } = usePaymentHistory(businessId!);
  const cancelSubscription = useCancelSubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleCancelSubscription = () => {
    if (!subscription) return;

    cancelSubscription.mutate(subscription.id, {
      onSuccess: () => {
        toast.success('구독이 취소되었습니다');
        setShowCancelDialog(false);
      },
      onError: error => {
        toast.error('구독 취소 실패', {
          description: getErrorMessage(error),
        });
      },
    });
  };

  if (subscriptionLoading || paymentsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="구독 관리"
          description="구독 플랜 및 결제 정보를 관리합니다"
          icon={<CreditCard className="h-6 w-6" />}
          breadcrumbs={[{ label: '구독 관리' }]}
        />
        <main className="p-8">
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">구독이 없습니다</h3>
            <p className="text-sm text-muted-foreground mb-6">
              서비스를 이용하려면 구독 플랜을 선택해주세요
            </p>
            <Button>구독 시작하기</Button>
          </Card>
        </main>
      </div>
    );
  }

  const planInfo = PLAN_INFO[subscription.plan];
  const statusInfo = STATUS_INFO[subscription.status];
  const usagePercentage = (subscription.current_usage / subscription.monthly_limit) * 100;
  const billingCycleEnd = new Date(subscription.billing_cycle_end);
  const daysRemaining = Math.ceil(
    (billingCycleEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="구독 관리"
        description="구독 플랜 및 결제 정보를 관리합니다"
        icon={<CreditCard className="h-6 w-6" />}
        breadcrumbs={[{ label: '구독 관리' }]}
      />

      {/* Content */}
      <main className="p-8 max-w-7xl">
        <div className="space-y-6">
          {/* Current Plan Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-foreground">{planInfo.name} 플랜</h3>
                  <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {planInfo.price.toLocaleString()}원
                  <span className="text-lg font-normal text-muted-foreground">/월</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">플랜 변경</Button>
                {subscription.status === SubscriptionStatus.ACTIVE && (
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    구독 취소
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Usage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>이번 달 사용량</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {subscription.current_usage.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {planInfo.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${usagePercentage > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {usagePercentage.toFixed(1)}% 사용 중
                  </p>
                </div>
              </div>

              {/* Billing Cycle */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>청구 주기</span>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">{daysRemaining}일 남음</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(subscription.billing_cycle_start).toLocaleDateString('ko-KR')} -{' '}
                    {billingCycleEnd.toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* Next Payment */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>다음 결제일</span>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">
                    {billingCycleEnd.toLocaleDateString('ko-KR')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {planInfo.price.toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>

            {subscription.status === SubscriptionStatus.TRIAL && subscription.trial_ends_at && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  무료 체험 기간이{' '}
                  {new Date(subscription.trial_ends_at).toLocaleDateString('ko-KR')}에 종료됩니다.
                </p>
              </div>
            )}
          </Card>

          {/* Payment History */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">결제 내역</h3>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                영수증 다운로드
              </Button>
            </div>

            {!paymentHistory?.data || paymentHistory.data.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">결제 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentHistory.data.map(payment => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          payment.status === PaymentStatus.COMPLETED ? 'bg-green-100' : 'bg-muted'
                        }`}
                      >
                        {payment.status === PaymentStatus.COMPLETED ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {payment.amount.toLocaleString()}원
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={PAYMENT_STATUS_INFO[payment.status]?.color ?? 'bg-gray-100 text-gray-800'}>
                        {PAYMENT_STATUS_INFO[payment.status]?.label ?? payment.status}
                      </Badge>
                      {payment.payment_method && (
                        <span className="text-sm text-muted-foreground">
                          {payment.payment_method}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Plan Features */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">플랜 비교</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(PLAN_INFO).map(([plan, info]) => (
                <div
                  key={plan}
                  className={`p-4 rounded-lg border-2 ${
                    subscription.plan === plan ? 'border-blue-500 bg-blue-50' : 'border bg-card'
                  }`}
                >
                  <h4 className="font-semibold text-foreground mb-2">{info.name}</h4>
                  <p className="text-2xl font-bold text-foreground mb-3">
                    {info.price.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground">원/월</span>
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />월{' '}
                      {info.limit.toLocaleString()}건
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      AI 자동 답변
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      감정 분석
                    </li>
                  </ul>
                  {subscription.plan !== plan && (
                    <Button className="w-full mt-4" variant="outline" size="sm">
                      변경하기
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>구독을 취소하시겠습니까?</DialogTitle>
            <DialogDescription>
              구독을 취소하면 현재 청구 주기가 끝난 후 서비스 이용이 중단됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              닫기
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelSubscription.isPending}
            >
              {cancelSubscription.isPending ? '취소 중...' : '구독 취소'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
