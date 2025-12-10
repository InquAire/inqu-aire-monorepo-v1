import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CustomLoggerService } from '../logger/logger.service';

export interface OrganizationInviteEmailData {
  recipientEmail: string;
  recipientName?: string;
  organizationName: string;
  inviterName: string;
  role: string;
  inviteToken: string;
  expiresAt: Date;
}

export interface WelcomeEmailData {
  recipientEmail: string;
  recipientName: string;
}

export interface PasswordResetEmailData {
  recipientEmail: string;
  recipientName?: string;
  resetToken: string;
  expiresAt: Date;
}

@Injectable()
export class EmailService {
  private readonly appUrl: string;
  private readonly isEmailEnabled: boolean;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3001');
    this.isEmailEnabled = this.configService.get<boolean>('EMAIL_ENABLED', true);
  }

  /**
   * 조직 초대 이메일 발송
   */
  async sendOrganizationInvite(data: OrganizationInviteEmailData): Promise<boolean> {
    if (!this.isEmailEnabled) {
      this.logger.log(
        `Email disabled - skipping invite email to ${data.recipientEmail}`,
        'EmailService'
      );
      return true;
    }

    const inviteUrl = `${this.appUrl}/invite/accept?token=${data.inviteToken}`;

    try {
      await this.mailerService.sendMail({
        to: data.recipientEmail,
        subject: `[InquAire] ${data.organizationName} 조직에 초대되었습니다`,
        template: 'organization-invite',
        context: {
          recipientName: data.recipientName || data.recipientEmail,
          organizationName: data.organizationName,
          inviterName: data.inviterName,
          role: this.translateRole(data.role),
          inviteUrl,
          expiresAt: this.formatDate(data.expiresAt),
          appUrl: this.appUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Organization invite email sent to ${data.recipientEmail}`, 'EmailService');
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send organization invite email to ${data.recipientEmail}`,
        error instanceof Error ? error.stack : String(error),
        'EmailService'
      );
      return false;
    }
  }

  /**
   * 환영 이메일 발송
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    if (!this.isEmailEnabled) {
      this.logger.log(
        `Email disabled - skipping welcome email to ${data.recipientEmail}`,
        'EmailService'
      );
      return true;
    }

    try {
      await this.mailerService.sendMail({
        to: data.recipientEmail,
        subject: '[InquAire] 가입을 환영합니다!',
        template: 'welcome',
        context: {
          recipientName: data.recipientName,
          appUrl: this.appUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Welcome email sent to ${data.recipientEmail}`, 'EmailService');
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${data.recipientEmail}`,
        error instanceof Error ? error.stack : String(error),
        'EmailService'
      );
      return false;
    }
  }

  /**
   * 비밀번호 재설정 이메일 발송
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    if (!this.isEmailEnabled) {
      this.logger.log(
        `Email disabled - skipping password reset email to ${data.recipientEmail}`,
        'EmailService'
      );
      return true;
    }

    const resetUrl = `${this.appUrl}/reset-password?token=${data.resetToken}`;

    try {
      await this.mailerService.sendMail({
        to: data.recipientEmail,
        subject: '[InquAire] 비밀번호 재설정 요청',
        template: 'password-reset',
        context: {
          recipientName: data.recipientName || data.recipientEmail,
          resetUrl,
          expiresAt: this.formatDate(data.expiresAt),
          appUrl: this.appUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Password reset email sent to ${data.recipientEmail}`, 'EmailService');
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${data.recipientEmail}`,
        error instanceof Error ? error.stack : String(error),
        'EmailService'
      );
      return false;
    }
  }

  /**
   * 초대 수락 알림 이메일 발송 (초대한 사람에게)
   */
  async sendInviteAcceptedNotification(
    inviterEmail: string,
    inviterName: string,
    acceptedByName: string,
    organizationName: string
  ): Promise<boolean> {
    if (!this.isEmailEnabled) {
      return true;
    }

    try {
      await this.mailerService.sendMail({
        to: inviterEmail,
        subject: `[InquAire] ${acceptedByName}님이 ${organizationName} 초대를 수락했습니다`,
        template: 'invite-accepted',
        context: {
          inviterName,
          acceptedByName,
          organizationName,
          appUrl: this.appUrl,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Invite accepted notification sent to ${inviterEmail}`, 'EmailService');
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send invite accepted notification to ${inviterEmail}`,
        error instanceof Error ? error.stack : String(error),
        'EmailService'
      );
      return false;
    }
  }

  private translateRole(role: string): string {
    const roleMap: Record<string, string> = {
      OWNER: '소유자',
      ADMIN: '관리자',
      MANAGER: '매니저',
      MEMBER: '멤버',
      VIEWER: '뷰어',
    };
    return roleMap[role] || role;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
