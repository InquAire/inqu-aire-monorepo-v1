-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "IndustryType" AS ENUM ('HOSPITAL', 'DENTAL', 'DERMATOLOGY', 'PLASTIC_SURGERY', 'REAL_ESTATE', 'BEAUTY_SALON', 'ACADEMY', 'LAW_FIRM', 'OTHER');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('KAKAO', 'LINE', 'INSTAGRAM', 'NAVER_TALK', 'WEB_CHAT');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('AI', 'HUMAN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('TRIAL', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "lookup_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry_type" "IndustryType" NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "platform_channel_id" TEXT NOT NULL,
    "name" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "webhook_url" TEXT,
    "webhook_secret" TEXT,
    "auto_reply_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "token_expires_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "platform" "PlatformType" NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "first_contact" TIMESTAMP(3),
    "last_contact" TIMESTAMP(3),
    "inquiry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "platform_message_id" TEXT NOT NULL,
    "message_text" TEXT NOT NULL,
    "type" TEXT,
    "summary" TEXT,
    "extracted_info" JSONB,
    "reply_text" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "sentiment" TEXT,
    "urgency" TEXT,
    "ai_confidence" DOUBLE PRECISION,
    "ai_model" TEXT,
    "ai_processing_time" INTEGER,
    "notes" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analyzed_at" TIMESTAMP(3),
    "replied_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_replies" (
    "id" TEXT NOT NULL,
    "inquiry_id" TEXT NOT NULL,
    "message_text" TEXT NOT NULL,
    "sender_type" "SenderType" NOT NULL,
    "sender_id" TEXT,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "failed_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_templates" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "content" TEXT NOT NULL,
    "variables" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reply_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_configs" (
    "id" TEXT NOT NULL,
    "industry" "IndustryType" NOT NULL,
    "display_name" TEXT NOT NULL,
    "inquiry_types" JSONB NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "extraction_schema" JSONB NOT NULL,
    "default_templates" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "error_type" TEXT NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT NOT NULL,
    "stack_trace" TEXT,
    "context" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_stats" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_inquiries" INTEGER NOT NULL DEFAULT 0,
    "new_inquiries" INTEGER NOT NULL DEFAULT 0,
    "in_progress_inquiries" INTEGER NOT NULL DEFAULT 0,
    "completed_inquiries" INTEGER NOT NULL DEFAULT 0,
    "on_hold_inquiries" INTEGER NOT NULL DEFAULT 0,
    "unique_customers" INTEGER NOT NULL DEFAULT 0,
    "avg_response_time" DOUBLE PRECISION,
    "avg_ai_confidence" DOUBLE PRECISION,
    "inquiry_types" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "monthly_limit" INTEGER NOT NULL,
    "current_usage" INTEGER NOT NULL DEFAULT 0,
    "billing_cycle_start" TIMESTAMP(3) NOT NULL,
    "billing_cycle_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" TEXT,
    "payment_key" TEXT,
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_last_login_at_idx" ON "users"("last_login_at");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_lookup_hash_key" ON "refresh_tokens"("lookup_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_lookup_hash_idx" ON "refresh_tokens"("lookup_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "businesses_owner_id_idx" ON "businesses"("owner_id");

-- CreateIndex
CREATE INDEX "businesses_industry_type_idx" ON "businesses"("industry_type");

-- CreateIndex
CREATE INDEX "businesses_created_at_idx" ON "businesses"("created_at");

-- CreateIndex
CREATE INDEX "businesses_deleted_at_idx" ON "businesses"("deleted_at");

-- CreateIndex
CREATE INDEX "businesses_owner_id_deleted_at_idx" ON "businesses"("owner_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "channels_webhook_url_key" ON "channels"("webhook_url");

-- CreateIndex
CREATE INDEX "channels_business_id_idx" ON "channels"("business_id");

-- CreateIndex
CREATE INDEX "channels_platform_idx" ON "channels"("platform");

-- CreateIndex
CREATE INDEX "channels_is_active_idx" ON "channels"("is_active");

-- CreateIndex
CREATE INDEX "channels_webhook_url_idx" ON "channels"("webhook_url");

-- CreateIndex
CREATE INDEX "channels_deleted_at_idx" ON "channels"("deleted_at");

-- CreateIndex
CREATE INDEX "channels_business_id_deleted_at_idx" ON "channels"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "channels_business_id_platform_deleted_at_idx" ON "channels"("business_id", "platform", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "channels_business_id_platform_platform_channel_id_key" ON "channels"("business_id", "platform", "platform_channel_id");

-- CreateIndex
CREATE INDEX "customers_business_id_idx" ON "customers"("business_id");

-- CreateIndex
CREATE INDEX "customers_platform_user_id_idx" ON "customers"("platform_user_id");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_last_contact_idx" ON "customers"("last_contact");

-- CreateIndex
CREATE INDEX "customers_first_contact_idx" ON "customers"("first_contact");

-- CreateIndex
CREATE INDEX "customers_created_at_idx" ON "customers"("created_at");

-- CreateIndex
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");

-- CreateIndex
CREATE INDEX "customers_business_id_deleted_at_idx" ON "customers"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "customers_business_id_platform_deleted_at_idx" ON "customers"("business_id", "platform", "deleted_at");

-- CreateIndex
CREATE INDEX "customers_business_id_last_contact_idx" ON "customers"("business_id", "last_contact");

-- CreateIndex
CREATE UNIQUE INDEX "customers_business_id_platform_platform_user_id_key" ON "customers"("business_id", "platform", "platform_user_id");

-- CreateIndex
CREATE INDEX "inquiries_business_id_idx" ON "inquiries"("business_id");

-- CreateIndex
CREATE INDEX "inquiries_channel_id_idx" ON "inquiries"("channel_id");

-- CreateIndex
CREATE INDEX "inquiries_customer_id_idx" ON "inquiries"("customer_id");

-- CreateIndex
CREATE INDEX "inquiries_status_idx" ON "inquiries"("status");

-- CreateIndex
CREATE INDEX "inquiries_type_idx" ON "inquiries"("type");

-- CreateIndex
CREATE INDEX "inquiries_sentiment_idx" ON "inquiries"("sentiment");

-- CreateIndex
CREATE INDEX "inquiries_urgency_idx" ON "inquiries"("urgency");

-- CreateIndex
CREATE INDEX "inquiries_received_at_idx" ON "inquiries"("received_at");

-- CreateIndex
CREATE INDEX "inquiries_analyzed_at_idx" ON "inquiries"("analyzed_at");

-- CreateIndex
CREATE INDEX "inquiries_created_at_idx" ON "inquiries"("created_at");

-- CreateIndex
CREATE INDEX "inquiries_deleted_at_idx" ON "inquiries"("deleted_at");

-- CreateIndex
CREATE INDEX "inquiries_platform_message_id_idx" ON "inquiries"("platform_message_id");

-- CreateIndex
CREATE INDEX "inquiries_business_id_status_deleted_at_idx" ON "inquiries"("business_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "inquiries_business_id_type_deleted_at_idx" ON "inquiries"("business_id", "type", "deleted_at");

-- CreateIndex
CREATE INDEX "inquiries_business_id_received_at_deleted_at_idx" ON "inquiries"("business_id", "received_at", "deleted_at");

-- CreateIndex
CREATE INDEX "inquiries_customer_id_received_at_deleted_at_idx" ON "inquiries"("customer_id", "received_at", "deleted_at");

-- CreateIndex
CREATE INDEX "inquiries_channel_id_received_at_deleted_at_idx" ON "inquiries"("channel_id", "received_at", "deleted_at");

-- CreateIndex
CREATE INDEX "inquiries_business_id_sentiment_deleted_at_idx" ON "inquiries"("business_id", "sentiment", "deleted_at");

-- CreateIndex
CREATE INDEX "inquiries_business_id_urgency_deleted_at_idx" ON "inquiries"("business_id", "urgency", "deleted_at");

-- CreateIndex
CREATE INDEX "inquiry_replies_inquiry_id_idx" ON "inquiry_replies"("inquiry_id");

-- CreateIndex
CREATE INDEX "inquiry_replies_created_at_idx" ON "inquiry_replies"("created_at");

-- CreateIndex
CREATE INDEX "inquiry_replies_is_sent_idx" ON "inquiry_replies"("is_sent");

-- CreateIndex
CREATE INDEX "inquiry_replies_inquiry_id_created_at_idx" ON "inquiry_replies"("inquiry_id", "created_at");

-- CreateIndex
CREATE INDEX "inquiry_replies_sender_type_idx" ON "inquiry_replies"("sender_type");

-- CreateIndex
CREATE INDEX "reply_templates_business_id_idx" ON "reply_templates"("business_id");

-- CreateIndex
CREATE INDEX "reply_templates_type_idx" ON "reply_templates"("type");

-- CreateIndex
CREATE INDEX "reply_templates_is_active_idx" ON "reply_templates"("is_active");

-- CreateIndex
CREATE INDEX "reply_templates_deleted_at_idx" ON "reply_templates"("deleted_at");

-- CreateIndex
CREATE INDEX "reply_templates_business_id_type_is_active_deleted_at_idx" ON "reply_templates"("business_id", "type", "is_active", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "industry_configs_industry_key" ON "industry_configs"("industry");

-- CreateIndex
CREATE INDEX "industry_configs_industry_idx" ON "industry_configs"("industry");

-- CreateIndex
CREATE INDEX "error_logs_user_id_idx" ON "error_logs"("user_id");

-- CreateIndex
CREATE INDEX "error_logs_error_type_idx" ON "error_logs"("error_type");

-- CreateIndex
CREATE INDEX "error_logs_resolved_idx" ON "error_logs"("resolved");

-- CreateIndex
CREATE INDEX "error_logs_occurred_at_idx" ON "error_logs"("occurred_at");

-- CreateIndex
CREATE INDEX "error_logs_error_type_resolved_occurred_at_idx" ON "error_logs"("error_type", "resolved", "occurred_at");

-- CreateIndex
CREATE INDEX "daily_stats_business_id_idx" ON "daily_stats"("business_id");

-- CreateIndex
CREATE INDEX "daily_stats_date_idx" ON "daily_stats"("date");

-- CreateIndex
CREATE INDEX "daily_stats_business_id_date_idx" ON "daily_stats"("business_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_stats_business_id_date_key" ON "daily_stats"("business_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_business_id_key" ON "subscriptions"("business_id");

-- CreateIndex
CREATE INDEX "subscriptions_business_id_idx" ON "subscriptions"("business_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_billing_cycle_end_idx" ON "subscriptions"("billing_cycle_end");

-- CreateIndex
CREATE INDEX "subscriptions_status_billing_cycle_end_idx" ON "subscriptions"("status", "billing_cycle_end");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_key_key" ON "payments"("payment_key");

-- CreateIndex
CREATE INDEX "payments_business_id_idx" ON "payments"("business_id");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_paid_at_idx" ON "payments"("paid_at");

-- CreateIndex
CREATE INDEX "payments_payment_key_idx" ON "payments"("payment_key");

-- CreateIndex
CREATE INDEX "payments_business_id_status_created_at_idx" ON "payments"("business_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "webhook_events_channel_id_idx" ON "webhook_events"("channel_id");

-- CreateIndex
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events"("event_type");

-- CreateIndex
CREATE INDEX "webhook_events_processed_idx" ON "webhook_events"("processed");

-- CreateIndex
CREATE INDEX "webhook_events_received_at_idx" ON "webhook_events"("received_at");

-- CreateIndex
CREATE INDEX "webhook_events_processed_received_at_idx" ON "webhook_events"("processed", "received_at");

-- CreateIndex
CREATE INDEX "webhook_events_channel_id_received_at_idx" ON "webhook_events"("channel_id", "received_at");

-- CreateIndex
CREATE INDEX "webhook_events_retry_count_processed_idx" ON "webhook_events"("retry_count", "processed");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_replies" ADD CONSTRAINT "inquiry_replies_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_templates" ADD CONSTRAINT "reply_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
