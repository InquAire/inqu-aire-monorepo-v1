/**
 * Channel Integration Guide Component
 * Sheet 형태로 표시되는 채널 통합 가이드
 */

import {
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Mail,
  MessageCircle,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  channelIntegrationGuides,
  getGroupedGuides,
  type ChannelIconType,
  type ChannelIntegrationGuide as GuideType,
} from '../config/channel-integration-guides';

import { Badge } from './badge';
import { Button } from './button';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';

// 채널 타입별 아이콘 및 스타일 매핑
const channelIconConfig: Record<
  ChannelIconType,
  { icon: LucideIcon; className: string; bgClassName: string }
> = {
  kakao: {
    icon: MessageCircle,
    className: 'text-yellow-600',
    bgClassName: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  naver: {
    icon: MessageSquare,
    className: 'text-green-600',
    bgClassName: 'bg-green-100 dark:bg-green-900/30',
  },
  line: {
    icon: MessageCircle,
    className: 'text-green-500',
    bgClassName: 'bg-green-100 dark:bg-green-900/30',
  },
  instagram: {
    icon: Instagram,
    className: 'text-pink-600',
    bgClassName: 'bg-pink-100 dark:bg-pink-900/30',
  },
  facebook: {
    icon: Facebook,
    className: 'text-blue-600',
    bgClassName: 'bg-blue-100 dark:bg-blue-900/30',
  },
  email: {
    icon: Mail,
    className: 'text-slate-600',
    bgClassName: 'bg-slate-100 dark:bg-slate-800/50',
  },
  web: {
    icon: Globe,
    className: 'text-purple-600',
    bgClassName: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

function ChannelIcon({
  iconType,
  size = 'md',
}: {
  iconType: ChannelIconType;
  size?: 'sm' | 'md' | 'lg';
}) {
  const config = channelIconConfig[iconType];
  const Icon = config.icon;
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return <Icon className={`${sizeClasses[size]} ${config.className}`} />;
}

interface ChannelIntegrationGuideProps {
  /** API 기본 URL (Webhook URL 생성용) */
  apiBaseUrl?: string;
  /** 버튼 변형 */
  variant?: 'default' | 'outline' | 'ghost';
  /** 버튼 크기 */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** 아이콘만 표시 */
  iconOnly?: boolean;
  /** 커스텀 트리거 */
  trigger?: React.ReactNode;
}

export function ChannelIntegrationGuide({
  apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.inquaire.com',
  variant = 'outline',
  size = 'sm',
  iconOnly = false,
  trigger,
}: ChannelIntegrationGuideProps) {
  const [open, setOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<GuideType | null>(
    channelIntegrationGuides[0] || null
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('클립보드에 복사되었습니다');
    } catch {
      toast.error('복사에 실패했습니다');
    }
  };

  const getFullWebhookUrl = (path: string) => {
    return `${apiBaseUrl}${path}`;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? (
        <SheetTrigger asChild>{trigger}</SheetTrigger>
      ) : iconOnly ? (
        <SheetTrigger asChild>
          <Button variant={variant} size="icon">
            <BookOpen className="h-4 w-4" />
          </Button>
        </SheetTrigger>
      ) : (
        <SheetTrigger asChild>
          <Button variant={variant} size={size} className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span>통합 가이드</span>
          </Button>
        </SheetTrigger>
      )}

      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            채널 통합 가이드
          </SheetTitle>
          <SheetDescription>
            다양한 채널을 InquAire와 연동하여 고객 문의를 통합 관리하세요.
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-[calc(100vh-120px)]">
          {/* 채널 목록 (왼쪽) - 그룹별로 표시 */}
          <div className="w-52 shrink-0 border-r bg-muted/30">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-4">
                {getGroupedGuides().map(({ group, guides }) => (
                  <div key={group.id}>
                    <div className="px-3 py-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.name}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {guides.map(guide => (
                        <button
                          key={guide.id}
                          onClick={() => setSelectedGuide(guide)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                            selectedGuide?.id === guide.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div
                            className={`p-1.5 rounded ${selectedGuide?.id === guide.id ? 'bg-primary-foreground/20' : channelIconConfig[guide.iconType].bgClassName}`}
                          >
                            <ChannelIcon iconType={guide.iconType} size="sm" />
                          </div>
                          <span className="truncate flex-1">{guide.name}</span>
                          {selectedGuide?.id === guide.id && (
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 가이드 상세 (오른쪽) */}
          <div className="flex-1 min-w-0">
            {selectedGuide ? (
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {/* 헤더 */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`p-3 rounded-lg ${channelIconConfig[selectedGuide.iconType].bgClassName}`}
                      >
                        <ChannelIcon iconType={selectedGuide.iconType} size="lg" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{selectedGuide.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedGuide.description}
                        </p>
                      </div>
                    </div>
                    {selectedGuide.docUrl && (
                      <a
                        href={selectedGuide.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        공식 문서 보기
                      </a>
                    )}
                  </div>

                  <Separator />

                  {/* Webhook URL */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Webhook URL</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(getFullWebhookUrl(selectedGuide.webhookUrl))}
                        className="h-7 px-2"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        복사
                      </Button>
                    </div>
                    <code className="block text-xs bg-background rounded px-3 py-2 font-mono break-all border">
                      {getFullWebhookUrl(selectedGuide.webhookUrl)}
                    </code>
                  </div>

                  {/* 연동 단계 */}
                  <div className="space-y-4">
                    <h4 className="font-medium">연동 단계</h4>
                    {selectedGuide.steps.map((step, index) => (
                      <div key={index} className="relative pl-8 pb-4 last:pb-0">
                        {/* 연결선 */}
                        {index < selectedGuide.steps.length - 1 && (
                          <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />
                        )}

                        {/* 단계 번호 */}
                        <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">{index + 1}</span>
                        </div>

                        {/* 내용 */}
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">{step.title}</h5>
                          <p className="text-sm text-muted-foreground">{step.description}</p>

                          {/* 코드 블록 */}
                          {step.code && (
                            <div className="relative">
                              <pre className="bg-muted rounded-md px-3 py-2 text-xs font-mono overflow-x-auto">
                                {step.code}
                              </pre>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(step.code!)}
                                className="absolute top-1 right-1 h-6 px-2"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {/* 링크 */}
                          {step.link && (
                            <a
                              href={step.link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {step.link.label}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 완료 안내 */}
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h5 className="font-medium text-green-800 dark:text-green-200">
                          연동 완료 후
                        </h5>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          채널 연동이 완료되면 해당 채널의 고객 문의가 자동으로 InquAire에
                          수집됩니다. 문의 관리 페이지에서 모든 채널의 문의를 통합하여 관리할 수
                          있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>왼쪽에서 채널을 선택하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * 특정 채널의 연동 상태를 표시하는 뱃지
 */
interface ChannelStatusBadgeProps {
  channelId: string;
  isConnected: boolean;
}

export function ChannelStatusBadge({ channelId, isConnected }: ChannelStatusBadgeProps) {
  const guide = channelIntegrationGuides.find(g => g.id === channelId);

  if (!guide) return null;

  return (
    <Badge variant={isConnected ? 'default' : 'secondary'}>
      <span className="mr-1">
        <ChannelIcon iconType={guide.iconType} size="sm" />
      </span>
      {guide.name}
      {isConnected && <Check className="ml-1 h-3 w-3" />}
    </Badge>
  );
}
