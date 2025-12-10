import { existsSync } from 'fs';
import { join } from 'path';

import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EmailService } from './email.service';

// 템플릿 디렉토리 경로를 결정하는 함수
// dist에서 실행되는 경우와 ts-node로 실행되는 경우 모두 지원
function getTemplateDir(): string {
  // 1. dist 폴더에서 실행되는 경우 (__dirname이 dist/common/modules/email)
  const distPath = join(__dirname, 'templates');
  if (existsSync(distPath)) {
    return distPath;
  }

  // 2. ts-node/SWC로 소스에서 직접 실행되는 경우
  const srcPath = join(process.cwd(), 'src', 'common', 'modules', 'email', 'templates');
  if (existsSync(srcPath)) {
    return srcPath;
  }

  // 3. 기본값 (빌드된 dist 경로)
  return distPath;
}

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const emailProvider = configService.get<string>('EMAIL_PROVIDER', 'smtp');
        const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
        const templateDir = getTemplateDir();

        // 개발 환경에서는 maildev 사용
        if (isDevelopment && emailProvider === 'smtp') {
          return {
            transport: {
              host: configService.get<string>('SMTP_HOST', 'localhost'),
              port: configService.get<number>('SMTP_PORT', 1025),
              secure: false,
              ignoreTLS: true,
            },
            defaults: {
              from: configService.get<string>('EMAIL_FROM', '"InquAire" <noreply@inquaire.com>'),
            },
            template: {
              dir: templateDir,
              adapter: new HandlebarsAdapter(),
              options: {
                strict: true,
              },
            },
          };
        }

        // 프로덕션: AWS SES 사용
        if (emailProvider === 'ses') {
          return {
            transport: {
              host: `email-smtp.${configService.get<string>('AWS_REGION', 'ap-northeast-2')}.amazonaws.com`,
              port: 587,
              secure: false,
              auth: {
                user: configService.get<string>('AWS_SES_SMTP_USER'),
                pass: configService.get<string>('AWS_SES_SMTP_PASSWORD'),
              },
            },
            defaults: {
              from: configService.get<string>('EMAIL_FROM', '"InquAire" <noreply@inquaire.com>'),
            },
            template: {
              dir: templateDir,
              adapter: new HandlebarsAdapter(),
              options: {
                strict: true,
              },
            },
          };
        }

        // 기본 SMTP
        return {
          transport: {
            host: configService.get<string>('SMTP_HOST', 'localhost'),
            port: configService.get<number>('SMTP_PORT', 587),
            secure: configService.get<boolean>('SMTP_SECURE', false),
            auth: {
              user: configService.get<string>('SMTP_USER'),
              pass: configService.get<string>('SMTP_PASSWORD'),
            },
          },
          defaults: {
            from: configService.get<string>('EMAIL_FROM', '"InquAire" <noreply@inquaire.com>'),
          },
          template: {
            dir: templateDir,
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
