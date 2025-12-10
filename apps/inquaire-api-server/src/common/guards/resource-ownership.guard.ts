import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/exceptions/error-codes';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

export const RESOURCE_OWNERSHIP_KEY = 'resourceOwnership';

export interface ResourceOwnershipConfig {
  resource: 'inquiry' | 'customer' | 'channel' | 'business';
  paramKey: string; // 'id', 'businessId', etc.
}

/**
 * 리소스 소유권 검증 데코레이터
 * 사용자가 자신의 조직에 속한 리소스에만 접근하도록 제한
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @RequireResourceOwnership({ resource: 'inquiry', paramKey: 'id' })
 * findOne(@Param('id') id: string) {
 *   return this.inquiriesService.findOne(id);
 * }
 * ```
 */
export const RequireResourceOwnership = (config: ResourceOwnershipConfig) =>
  SetMetadata(RESOURCE_OWNERSHIP_KEY, config);

/**
 * 리소스 소유권 검증 가드
 *
 * 사용자가 요청한 리소스가 자신이 속한 조직의 것인지 확인합니다.
 * 다른 조직의 리소스에 접근하려고 하면 403 Forbidden을 반환합니다.
 */
@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private logger: CustomLoggerService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<ResourceOwnershipConfig>(
      RESOURCE_OWNERSHIP_KEY,
      context.getHandler()
    );

    // 설정이 없으면 검증 스킵
    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const resourceId = request.params[config.paramKey];

    if (!userId) {
      this.logger.warn('Resource ownership check failed: No user ID', 'ResourceOwnershipGuard', {
        resource: config.resource,
        resourceId,
      });
      throw new BusinessException(ErrorCode.AUTH_REQUIRED);
    }

    if (!resourceId) {
      this.logger.warn(
        'Resource ownership check failed: No resource ID',
        'ResourceOwnershipGuard',
        {
          resource: config.resource,
          paramKey: config.paramKey,
        }
      );
      throw new BusinessException(ErrorCode.VALIDATION_INVALID_INPUT, 'Invalid resource ID');
    }

    // 리소스별 권한 확인
    const hasAccess = await this.checkResourceAccess(config.resource, resourceId, userId);

    if (!hasAccess) {
      this.logger.warn('Unauthorized resource access attempt', 'ResourceOwnershipGuard', {
        userId,
        resource: config.resource,
        resourceId,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      throw new BusinessException(
        ErrorCode.RESOURCE_ACCESS_DENIED,
        `${config.resource}에 대한 접근 권한이 없습니다`,
        {
          resourceType: config.resource,
          resourceId,
        }
      );
    }

    return true;
  }

  /**
   * 리소스별 접근 권한 확인
   */
  private async checkResourceAccess(
    resource: string,
    resourceId: string,
    userId: string
  ): Promise<boolean> {
    try {
      switch (resource) {
        case 'inquiry':
          return await this.checkInquiryAccess(resourceId, userId);

        case 'customer':
          return await this.checkCustomerAccess(resourceId, userId);

        case 'channel':
          return await this.checkChannelAccess(resourceId, userId);

        case 'business':
          return await this.checkBusinessAccess(resourceId, userId);

        default:
          this.logger.error('Unknown resource type', undefined, 'ResourceOwnershipGuard', {
            resource,
          });
          return false;
      }
    } catch (error) {
      this.logger.error(
        'Resource access check failed',
        error instanceof Error ? error.stack : String(error),
        'ResourceOwnershipGuard',
        {
          resource,
          resourceId,
          userId,
        }
      );
      return false;
    }
  }

  /**
   * 사용자가 조직의 멤버인지 확인
   */
  private async isUserMemberOfOrganization(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const member = await this.prisma.read.organizationMember.findFirst({
      where: {
        user_id: userId,
        organization_id: organizationId,
        deleted_at: null,
      },
    });
    return member !== null;
  }

  /**
   * 문의 접근 권한 확인
   */
  private async checkInquiryAccess(inquiryId: string, userId: string): Promise<boolean> {
    const inquiry = await this.prisma.read.inquiry.findFirst({
      where: {
        id: inquiryId,
        deleted_at: null,
      },
      select: {
        business: {
          select: {
            organization_id: true,
          },
        },
      },
    });

    if (!inquiry) return false;
    return this.isUserMemberOfOrganization(userId, inquiry.business.organization_id);
  }

  /**
   * 고객 접근 권한 확인
   */
  private async checkCustomerAccess(customerId: string, userId: string): Promise<boolean> {
    const customer = await this.prisma.read.customer.findFirst({
      where: {
        id: customerId,
        deleted_at: null,
      },
      select: {
        business: {
          select: {
            organization_id: true,
          },
        },
      },
    });

    if (!customer) return false;
    return this.isUserMemberOfOrganization(userId, customer.business.organization_id);
  }

  /**
   * 채널 접근 권한 확인
   */
  private async checkChannelAccess(channelId: string, userId: string): Promise<boolean> {
    const channel = await this.prisma.read.channel.findFirst({
      where: {
        id: channelId,
        deleted_at: null,
      },
      select: {
        business: {
          select: {
            organization_id: true,
          },
        },
      },
    });

    if (!channel) return false;
    return this.isUserMemberOfOrganization(userId, channel.business.organization_id);
  }

  /**
   * 사업체 접근 권한 확인
   */
  private async checkBusinessAccess(businessId: string, userId: string): Promise<boolean> {
    const business = await this.prisma.read.business.findFirst({
      where: {
        id: businessId,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });

    if (!business) return false;
    return this.isUserMemberOfOrganization(userId, business.organization_id);
  }
}
