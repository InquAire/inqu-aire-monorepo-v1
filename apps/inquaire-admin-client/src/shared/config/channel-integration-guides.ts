/**
 * Channel Integration Guides Configuration
 * 채널 통합 가이드 데이터
 */

export type ChannelIconType =
  | 'kakao'
  | 'naver'
  | 'instagram'
  | 'facebook'
  | 'email'
  | 'web'
  | 'line';

export type ChannelGroupType = 'messenger' | 'social' | 'direct';

export interface IntegrationStep {
  title: string;
  description: string;
  code?: string;
  link?: {
    label: string;
    url: string;
  };
}

export interface ChannelIntegrationGuide {
  id: string;
  name: string;
  iconType: ChannelIconType;
  group: ChannelGroupType;
  description: string;
  webhookUrl: string;
  steps: IntegrationStep[];
  docUrl?: string;
}

export interface ChannelGroup {
  id: ChannelGroupType;
  name: string;
  description: string;
}

export const channelGroups: ChannelGroup[] = [
  {
    id: 'messenger',
    name: '메신저',
    description: '메신저 앱을 통한 고객 소통',
  },
  {
    id: 'social',
    name: '소셜 미디어',
    description: 'SNS 플랫폼 DM 연동',
  },
  {
    id: 'direct',
    name: '직접 연동',
    description: '이메일 및 웹사이트 연동',
  },
];

export const channelIntegrationGuides: ChannelIntegrationGuide[] = [
  {
    id: 'kakao',
    name: '카카오톡 채널',
    iconType: 'kakao',
    group: 'messenger',
    description: '카카오톡 채널과 연동하여 고객 문의를 자동으로 수집합니다.',
    webhookUrl: '/api/v1/webhooks/kakao',
    docUrl: 'https://developers.kakao.com/docs/latest/ko/kakaotalk-channel/common',
    steps: [
      {
        title: '1. 카카오 비즈니스 계정 생성',
        description: '카카오 비즈니스 어드민에서 채널을 생성하고 비즈니스 계정을 연동합니다.',
        link: {
          label: '카카오 비즈니스 어드민',
          url: 'https://business.kakao.com/',
        },
      },
      {
        title: '2. 채널 API 설정',
        description: '카카오 개발자 콘솔에서 애플리케이션을 생성하고 채널 API를 활성화합니다.',
        link: {
          label: '카카오 개발자 콘솔',
          url: 'https://developers.kakao.com/console/app',
        },
      },
      {
        title: '3. Webhook URL 등록',
        description: '아래 Webhook URL을 카카오 개발자 콘솔의 콜백 URL에 등록합니다.',
      },
      {
        title: '4. 채널 관리에서 연동',
        description: 'InquAire 채널 관리 페이지에서 카카오톡 채널을 추가하고 API 키를 입력합니다.',
      },
    ],
  },
  {
    id: 'naver-talktalk',
    name: '네이버 톡톡',
    iconType: 'naver',
    group: 'messenger',
    description: '네이버 톡톡을 통해 네이버 플랫폼 고객의 문의를 관리합니다.',
    webhookUrl: '/api/v1/webhooks/naver-talktalk',
    docUrl: 'https://developers.naver.com/docs/talktalk/overview/',
    steps: [
      {
        title: '1. 네이버 톡톡 파트너 가입',
        description: '네이버 톡톡 파트너센터에서 파트너 계정을 생성합니다.',
        link: {
          label: '네이버 톡톡 파트너센터',
          url: 'https://partner.talk.naver.com/',
        },
      },
      {
        title: '2. API 연동 신청',
        description: '파트너센터에서 API 연동을 신청하고 승인을 받습니다.',
      },
      {
        title: '3. Webhook URL 등록',
        description: '아래 Webhook URL을 네이버 톡톡 파트너센터의 이벤트 수신 URL에 등록합니다.',
      },
      {
        title: '4. 채널 관리에서 연동',
        description: 'InquAire 채널 관리 페이지에서 네이버 톡톡을 추가하고 파트너 키를 입력합니다.',
      },
    ],
  },
  {
    id: 'line',
    name: 'LINE',
    iconType: 'line',
    group: 'messenger',
    description: 'LINE 공식 계정을 연동하여 일본/동남아 고객과 소통합니다.',
    webhookUrl: '/api/v1/webhooks/line',
    docUrl: 'https://developers.line.biz/en/docs/messaging-api/',
    steps: [
      {
        title: '1. LINE Developers 콘솔 접속',
        description: 'LINE Developers 콘솔에서 프로바이더와 채널을 생성합니다.',
        link: {
          label: 'LINE Developers',
          url: 'https://developers.line.biz/console/',
        },
      },
      {
        title: '2. Messaging API 채널 생성',
        description: 'Messaging API 채널을 생성하고 채널 시크릿과 액세스 토큰을 발급받습니다.',
      },
      {
        title: '3. Webhook URL 등록',
        description: 'Messaging API 설정에서 아래 Webhook URL을 등록하고 Use webhook을 활성화합니다.',
      },
      {
        title: '4. 채널 관리에서 연동',
        description: 'InquAire 채널 관리 페이지에서 LINE을 추가하고 Channel Access Token을 입력합니다.',
      },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram DM',
    iconType: 'instagram',
    group: 'social',
    description: 'Instagram Direct Message를 통한 고객 문의를 관리합니다.',
    webhookUrl: '/api/v1/webhooks/instagram',
    docUrl: 'https://developers.facebook.com/docs/instagram-api/guides/messaging/',
    steps: [
      {
        title: '1. Meta 비즈니스 계정 설정',
        description: 'Meta Business Suite에서 비즈니스 계정을 생성하고 Instagram 프로페셔널 계정을 연결합니다.',
        link: {
          label: 'Meta Business Suite',
          url: 'https://business.facebook.com/',
        },
      },
      {
        title: '2. Instagram Graph API 앱 생성',
        description: 'Meta 개발자 콘솔에서 앱을 생성하고 Instagram Graph API를 추가합니다.',
        link: {
          label: 'Meta 개발자 콘솔',
          url: 'https://developers.facebook.com/apps/',
        },
      },
      {
        title: '3. Webhook 설정',
        description: 'Webhooks 제품을 추가하고 아래 URL과 Verify Token을 등록합니다.',
      },
      {
        title: '4. 메시지 권한 요청',
        description: 'instagram_manage_messages 권한을 요청하고 앱 검수를 진행합니다.',
      },
      {
        title: '5. 채널 관리에서 연동',
        description: 'InquAire 채널 관리 페이지에서 Instagram을 추가하고 Access Token을 입력합니다.',
      },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    iconType: 'facebook',
    group: 'social',
    description: 'Facebook 페이지의 Messenger를 통한 고객 문의를 관리합니다.',
    webhookUrl: '/api/v1/webhooks/facebook',
    docUrl: 'https://developers.facebook.com/docs/messenger-platform/overview',
    steps: [
      {
        title: '1. Facebook 페이지 생성',
        description: '비즈니스용 Facebook 페이지를 생성합니다.',
        link: {
          label: 'Facebook 페이지 만들기',
          url: 'https://www.facebook.com/pages/create/',
        },
      },
      {
        title: '2. Meta 앱 생성',
        description: 'Meta 개발자 콘솔에서 앱을 생성하고 Messenger 제품을 추가합니다.',
        link: {
          label: 'Meta 개발자 콘솔',
          url: 'https://developers.facebook.com/apps/',
        },
      },
      {
        title: '3. 페이지 연결 및 토큰 생성',
        description: '앱에 페이지를 연결하고 페이지 액세스 토큰을 생성합니다.',
      },
      {
        title: '4. Webhook 설정',
        description: 'Webhooks를 설정하고 아래 URL과 Verify Token을 등록합니다. messages, messaging_postbacks 이벤트를 구독합니다.',
      },
      {
        title: '5. 채널 관리에서 연동',
        description: 'InquAire 채널 관리 페이지에서 Facebook을 추가하고 Page Access Token을 입력합니다.',
      },
    ],
  },
  {
    id: 'email',
    name: '이메일',
    iconType: 'email',
    group: 'direct',
    description: '이메일을 통한 고객 문의를 자동으로 수집하고 관리합니다.',
    webhookUrl: '/api/v1/webhooks/email',
    steps: [
      {
        title: '1. 이메일 포워딩 설정',
        description: '고객 문의를 받을 이메일 주소에서 자동 전달(포워딩)을 설정합니다.',
      },
      {
        title: '2. 전용 이메일 주소 사용',
        description: '아래 형식의 전용 이메일 주소로 문의 메일을 전달하도록 설정합니다.',
        code: 'inquiries+{business_id}@inquaire.com',
      },
      {
        title: '3. 채널 관리에서 연동',
        description: 'InquAire 채널 관리 페이지에서 이메일 채널을 추가하고 수신 이메일 주소를 등록합니다.',
      },
    ],
  },
  {
    id: 'web-widget',
    name: '웹 위젯',
    iconType: 'web',
    group: 'direct',
    description: '웹사이트에 문의 위젯을 설치하여 실시간 문의를 받습니다.',
    webhookUrl: '/api/v1/webhooks/web',
    steps: [
      {
        title: '1. 위젯 코드 생성',
        description: 'InquAire 채널 관리에서 웹 위젯을 추가하면 설치 코드가 생성됩니다.',
      },
      {
        title: '2. 웹사이트에 코드 삽입',
        description: '생성된 스크립트 코드를 웹사이트의 </body> 태그 앞에 삽입합니다.',
        code: `<script src="https://widget.inquaire.com/v1/widget.js" data-business-id="{business_id}"></script>`,
      },
      {
        title: '3. 위젯 커스터마이징',
        description: '채널 설정에서 위젯의 색상, 위치, 초기 메시지 등을 커스터마이징합니다.',
      },
    ],
  },
];

/**
 * 채널 ID로 가이드 조회
 */
export function getGuideById(id: string): ChannelIntegrationGuide | undefined {
  return channelIntegrationGuides.find(guide => guide.id === id);
}

/**
 * 전체 가이드 목록 조회
 */
export function getAllGuides(): ChannelIntegrationGuide[] {
  return channelIntegrationGuides;
}

/**
 * 그룹별로 채널 가이드 조회
 */
export function getGuidesByGroup(
  groupId: ChannelGroupType
): ChannelIntegrationGuide[] {
  return channelIntegrationGuides.filter(guide => guide.group === groupId);
}

/**
 * 그룹별로 그룹화된 가이드 조회
 */
export function getGroupedGuides(): {
  group: ChannelGroup;
  guides: ChannelIntegrationGuide[];
}[] {
  return channelGroups.map(group => ({
    group,
    guides: getGuidesByGroup(group.id),
  }));
}
