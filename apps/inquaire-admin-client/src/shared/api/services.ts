/**
 * API Services Barrel Export
 * Re-exports all entity API services for easy importing
 */

// Customer Service
export { customerApi as customerService } from '@/entities/customer/api/customerApi';
export type { QueryCustomerParams as CustomerQueryParams } from '@/entities/customer/model/types';

// Inquiry Service
export { inquiryApi as inquiryService } from '@/entities/inquiry/api/inquiryApi';
export type { QueryInquiryParams as InquiryQueryParams } from '@/entities/inquiry/model/types';

// Channel Service
export { channelApi as channelService } from '@/entities/channel/api/channelApi';

// Business Service
export { businessApi as businessService } from '@/entities/business/api/businessApi';

// Auth Service
export { authApi as authService } from '@/entities/auth/api/authApi';

// User Service (if exists)
// export { userApi as userService } from '@/entities/user/api/userApi';

// AI Service
export { aiApi as aiService } from '@/entities/ai/api/aiApi';

// Stats Service
export { statsApi as statsService } from '@/entities/stats/api/statsApi';

// Webhook Service (if exists)
// export { webhookApi as webhookService } from '@/entities/webhook/api/webhookApi';

// Reply Template Service
export { replyTemplateApi as replyTemplateService } from '@/entities/reply-template/api/replyTemplateApi';

// Subscription Service
export { subscriptionApi as subscriptionService } from '@/entities/subscription/api/subscriptionApi';

// Payment Service
export { paymentApi as paymentService } from '@/entities/payment/api/paymentApi';
