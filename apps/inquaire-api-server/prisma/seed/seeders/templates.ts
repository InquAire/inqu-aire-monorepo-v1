import type { Business, PrismaClient, ReplyTemplate } from '../../generated';
import { replyTemplateConfigs } from '../data/templates';

export async function seedReplyTemplates(
  prisma: PrismaClient,
  businesses: Business[]
): Promise<ReplyTemplate[]> {
  console.log('📝 Creating reply templates...');

  const replyTemplates: ReplyTemplate[] = [];

  for (const business of businesses) {
    for (const template of replyTemplateConfigs) {
      const replyTemplate = await prisma.replyTemplate.create({
        data: {
          business_id: business.id,
          name: template.name,
          type: template.type,
          content: template.content,
          variables: template.variables,
          is_active: true,
          usage_count: Math.floor(Math.random() * 50),
        },
      });
      replyTemplates.push(replyTemplate);
    }
  }

  console.log(`✅ Created ${replyTemplates.length} reply templates`);
  return replyTemplates;
}
