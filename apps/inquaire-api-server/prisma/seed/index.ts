import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { PrismaClient } from '../generated';

import { seedBusinesses } from './seeders/businesses';
import { seedChannels } from './seeders/channels';
import { seedCustomers } from './seeders/customers';
import { seedErrorLogs } from './seeders/error-logs';
import { seedIndustryConfigs } from './seeders/industry-configs';
import { seedInquiries } from './seeders/inquiries';
import { seedOrganizationInvitations } from './seeders/organization-invitations';
import { seedOrganizationMembers } from './seeders/organization-members';
import { seedOrganizationSubscriptions } from './seeders/organization-subscriptions';
import { seedOrganizations } from './seeders/organizations';
import { seedDailyStats } from './seeders/stats';
import { seedSubscriptionsAndPayments } from './seeders/subscriptions';
import { seedReplyTemplates } from './seeders/templates';
import { seedUsers } from './seeders/users';
import { seedWebhookEvents } from './seeders/webhook-events';
import { clearDatabase } from './utils/clear';

const { Pool } = pg;

// Prisma 7: adapter 기반 연결
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...\n');

  // Clear existing data
  await clearDatabase(prisma);

  // Seed data in order (respecting foreign key dependencies)

  // 1. Base entities (no dependencies)
  const users = await seedUsers(prisma);

  // 2. Organizations (depends on users for owner)
  const organizations = await seedOrganizations(prisma, users);

  // 3. Organization relationships
  const organizationMembers = await seedOrganizationMembers(prisma, organizations, users);
  const { subscriptions: orgSubscriptions, payments: orgPayments } =
    await seedOrganizationSubscriptions(prisma, organizations);
  const organizationInvitations = await seedOrganizationInvitations(prisma, organizations, users);

  // 4. Businesses (depends on organizations only)
  const businesses = await seedBusinesses(prisma, organizations);

  // 5. Industry configs (no dependencies, but logically related to businesses)
  const industryConfigs = await seedIndustryConfigs(prisma);

  // 6. Business-related entities
  const channels = await seedChannels(prisma, businesses);
  const customers = await seedCustomers(prisma, businesses);
  const { inquiries, replies } = await seedInquiries(prisma, businesses, channels, customers);
  const templates = await seedReplyTemplates(prisma, businesses);
  const { subscriptions, payments } = await seedSubscriptionsAndPayments(prisma, businesses);
  const stats = await seedDailyStats(prisma, businesses);

  // 7. Event/Log entities
  const webhookEvents = await seedWebhookEvents(prisma, channels);
  const errorLogs = await seedErrorLogs(prisma, users);

  // Summary
  console.log('\n✨ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   Users:                    ${users.length + 1}`);
  console.log(`   Organizations:            ${organizations.length}`);
  console.log(`   Organization Members:     ${organizationMembers.length}`);
  console.log(`   Organization Subscriptions: ${orgSubscriptions.length}`);
  console.log(`   Organization Payments:    ${orgPayments.length}`);
  console.log(`   Organization Invitations: ${organizationInvitations.length}`);
  console.log(`   Businesses:               ${businesses.length}`);
  console.log(`   Industry Configs:         ${industryConfigs.length}`);
  console.log(`   Channels:                 ${channels.length}`);
  console.log(`   Customers:                ${customers.length}`);
  console.log(`   Inquiries:                ${inquiries.length}`);
  console.log(`   Replies:                  ${replies.length}`);
  console.log(`   Templates:                ${templates.length}`);
  console.log(`   Subscriptions:            ${subscriptions.length}`);
  console.log(`   Payments:                 ${payments.length}`);
  console.log(`   Daily Stats:              ${stats.length}`);
  console.log(`   Webhook Events:           ${webhookEvents.length}`);
  console.log(`   Error Logs:               ${errorLogs.length}`);
  console.log('\n🎉 Ready to use!');
}

main()
  .catch(e => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
