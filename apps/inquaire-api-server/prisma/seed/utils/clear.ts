import type { PrismaClient } from '../../generated';

export async function clearDatabase(prisma: PrismaClient): Promise<void> {
  console.log('🗑️  Clearing existing data...');

  // 의존성 순서에 따라 삭제 (자식 테이블부터)
  await prisma.inquiryReply.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.replyTemplate.deleteMany();
  await prisma.dailyStats.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.errorLog.deleteMany();
  await prisma.industryConfig.deleteMany();
  await prisma.business.deleteMany();

  // Organization 관련 테이블
  await prisma.organizationPayment.deleteMany();
  await prisma.organizationSubscription.deleteMany();
  await prisma.organizationInvitation.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();

  // User 관련 테이블
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}
