import type {
  Business,
  Channel,
  Customer,
  Inquiry,
  InquiryReply,
  PrismaClient,
} from '../../generated';
import { inquiryTemplates } from '../data/templates';

export async function seedInquiries(
  prisma: PrismaClient,
  businesses: Business[],
  channels: Channel[],
  customers: Customer[]
): Promise<{ inquiries: Inquiry[]; replies: InquiryReply[] }> {
  console.log('💬 Creating inquiries...');

  const inquiries: Inquiry[] = [];
  const inquiryReplies: InquiryReply[] = [];

  for (const customer of customers) {
    const business = businesses.find(b => b.id === customer.business_id)!;
    const businessChannels = channels.filter(c => c.business_id === business.id);
    if (businessChannels.length === 0) continue;

    const templates = inquiryTemplates[business.industry_type] || inquiryTemplates.DENTAL;
    const numInquiries = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < numInquiries; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const channel = businessChannels[Math.floor(Math.random() * businessChannels.length)];
      const receivedAt = new Date(
        Date.now() - 1000 * 60 * 60 * 24 * (30 - i * 2) - Math.random() * 1000 * 60 * 60 * 24
      );

      const statuses: Array<'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'> = [
        'NEW',
        'IN_PROGRESS',
        'COMPLETED',
        'ON_HOLD',
      ];
      const status = i === 0 ? 'NEW' : statuses[Math.floor(Math.random() * statuses.length)];

      const inquiry = await prisma.inquiry.create({
        data: {
          business_id: business.id,
          channel_id: channel.id,
          customer_id: customer.id,
          platform_message_id: `msg_${business.id}_${customer.id}_${i}`,
          message_text: template.text,
          type: template.type,
          summary: `${customer.name}님의 ${template.type}`,
          extracted_info: {
            intent: template.type,
            customer_name: customer.name,
            keywords: template.text.split(' ').slice(0, 3),
          },
          reply_text:
            status !== 'NEW'
              ? `안녕하세요 ${customer.name}님, ${template.type}에 대해 답변드립니다...`
              : null,
          status,
          sentiment: template.sentiment,
          urgency: template.urgency,
          ai_confidence: 0.85 + Math.random() * 0.15,
          ai_model: 'gpt-4o-mini',
          ai_processing_time: Math.floor(Math.random() * 2000) + 500,
          received_at: receivedAt,
          analyzed_at: new Date(receivedAt.getTime() + 1000),
          replied_at: status !== 'NEW' ? new Date(receivedAt.getTime() + 60000) : null,
          completed_at: status === 'COMPLETED' ? new Date(receivedAt.getTime() + 3600000) : null,
        },
      });
      inquiries.push(inquiry);

      // Add replies for non-NEW inquiries
      if (status !== 'NEW') {
        const reply = await prisma.inquiryReply.create({
          data: {
            inquiry_id: inquiry.id,
            message_text: `안녕하세요 ${customer.name}님, ${template.type}에 대해 답변드립니다. 자세한 상담을 위해 방문해주시면 감사하겠습니다.`,
            sender_type: 'AI',
            is_sent: true,
            sent_at: new Date(receivedAt.getTime() + 60000),
          },
        });
        inquiryReplies.push(reply);
      }
    }
  }

  console.log(`✅ Created ${inquiries.length} inquiries and ${inquiryReplies.length} replies`);
  return { inquiries, replies: inquiryReplies };
}
