import type { Channel, PrismaClient, WebhookEvent } from '../../generated';

export async function seedWebhookEvents(
  prisma: PrismaClient,
  channels: Channel[]
): Promise<WebhookEvent[]> {
  console.log('🔗 Creating webhook events...');

  const now = new Date();
  const events: WebhookEvent[] = [];

  for (const channel of channels.slice(0, 5)) {
    // 성공적으로 처리된 메시지 이벤트
    events.push(
      await prisma.webhookEvent.create({
        data: {
          channel_id: channel.id,
          event_type: 'message_received',
          payload: {
            type: 'message',
            message: {
              id: `msg_${Date.now()}_1`,
              text: '안녕하세요, 예약 가능한가요?',
              timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
            },
            sender: {
              id: `user_${channel.id}_1`,
              name: '홍길동',
            },
          },
          processed: true,
          processed_at: new Date(now.getTime() - 1000 * 60 * 29),
          received_at: new Date(now.getTime() - 1000 * 60 * 30),
        },
      })
    );

    // 처리 대기 중인 이벤트
    events.push(
      await prisma.webhookEvent.create({
        data: {
          channel_id: channel.id,
          event_type: 'message_received',
          payload: {
            type: 'message',
            message: {
              id: `msg_${Date.now()}_2`,
              text: '가격이 어떻게 되나요?',
              timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
            },
            sender: {
              id: `user_${channel.id}_2`,
              name: '김철수',
            },
          },
          processed: false,
          received_at: new Date(now.getTime() - 1000 * 60 * 5),
        },
      })
    );

    // 배달 상태 이벤트
    events.push(
      await prisma.webhookEvent.create({
        data: {
          channel_id: channel.id,
          event_type: 'delivery_status',
          payload: {
            type: 'delivery',
            message_id: `msg_${Date.now()}_reply`,
            status: 'delivered',
            delivered_at: new Date(now.getTime() - 1000 * 60 * 25).toISOString(),
          },
          processed: true,
          processed_at: new Date(now.getTime() - 1000 * 60 * 24),
          received_at: new Date(now.getTime() - 1000 * 60 * 25),
        },
      })
    );

    // 실패한 이벤트 (재시도 필요)
    events.push(
      await prisma.webhookEvent.create({
        data: {
          channel_id: channel.id,
          event_type: 'message_received',
          payload: {
            type: 'message',
            message: {
              id: `msg_${Date.now()}_3`,
              text: '영업시간이 어떻게 되나요?',
              timestamp: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
            },
            sender: {
              id: `user_${channel.id}_3`,
              name: '이영희',
            },
          },
          processed: false,
          error_message: 'AI service temporarily unavailable',
          retry_count: 2,
          received_at: new Date(now.getTime() - 1000 * 60 * 60),
        },
      })
    );
  }

  // 채널 없는 이벤트 (시스템 이벤트)
  events.push(
    await prisma.webhookEvent.create({
      data: {
        channel_id: null,
        event_type: 'system_health_check',
        payload: {
          type: 'health_check',
          status: 'ok',
          timestamp: now.toISOString(),
        },
        processed: true,
        processed_at: now,
        received_at: now,
      },
    })
  );

  console.log(`✅ Created ${events.length} webhook events`);
  return events;
}
