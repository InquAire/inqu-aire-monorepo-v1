/**
 * DTO Validation Tests
 *
 * 테스트 범위:
 * - 주요 DTO 클래스의 검증 로직
 * - class-validator 데코레이터 동작
 * - 필수 필드 검증
 * - 선택 필드 검증
 * - 타입 변환 및 검증
 */

import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { LoginDto } from '@/modules/auth/dto/login.dto';
import { SignupDto } from '@/modules/auth/dto/signup.dto';
import { CreateBusinessDto } from '@/modules/businesses/dto/create-business.dto';
import { CreateCustomerDto } from '@/modules/customers/dto/create-customer.dto';
import { CreateInquiryDto } from '@/modules/inquiries/dto/create-inquiry.dto';

describe('DTO Validation', () => {
  describe('SignupDto', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      const data = {
        email: 'user@example.com',
        password: 'password123',
        name: '홍길동',
      };

      // Act
      const dto = plainToInstance(SignupDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
      expect(dto.email).toBe('user@example.com');
      expect(dto.password).toBe('password123');
      expect(dto.name).toBe('홍길동');
    });

    it('should fail validation when email is missing', async () => {
      // Arrange
      const data = {
        password: 'password123',
        name: '홍길동',
      };

      // Act
      const dto = plainToInstance(SignupDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('should fail validation when email is invalid', async () => {
      // Arrange
      const data = {
        email: 'invalid-email',
        password: 'password123',
        name: '홍길동',
      };

      // Act
      const dto = plainToInstance(SignupDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('should fail validation when password is too short', async () => {
      // Arrange
      const data = {
        email: 'user@example.com',
        password: 'short',
        name: '홍길동',
      };

      // Act
      const dto = plainToInstance(SignupDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'password')).toBe(true);
    });

    it('should fail validation when name is missing', async () => {
      // Arrange
      const data = {
        email: 'user@example.com',
        password: 'password123',
      };

      // Act
      const dto = plainToInstance(SignupDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });
  });

  describe('LoginDto', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      const data = {
        email: 'user@example.com',
        password: 'password123',
      };

      // Act
      const dto = plainToInstance(LoginDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
      expect(dto.email).toBe('user@example.com');
      expect(dto.password).toBe('password123');
    });

    it('should fail validation when email is missing', async () => {
      // Arrange
      const data = {
        password: 'password123',
      };

      // Act
      const dto = plainToInstance(LoginDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('should fail validation when password is missing', async () => {
      // Arrange
      const data = {
        email: 'user@example.com',
      };

      // Act
      const dto = plainToInstance(LoginDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'password')).toBe(true);
    });
  });

  describe('CreateInquiryDto', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      const data = {
        business_id: 'business-123',
        channel_id: 'channel-123',
        customer_id: 'customer-123',
        message_text: 'Test inquiry message',
      };

      // Act
      const dto = plainToInstance(CreateInquiryDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
      expect(dto.business_id).toBe('business-123');
      expect(dto.channel_id).toBe('channel-123');
      expect(dto.customer_id).toBe('customer-123');
      expect(dto.message_text).toBe('Test inquiry message');
    });

    it('should fail validation when required fields are missing', async () => {
      // Arrange
      const data = {
        business_id: 'business-123',
      };

      // Act
      const dto = plainToInstance(CreateInquiryDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow optional fields to be undefined', async () => {
      // Arrange
      const data = {
        business_id: 'business-123',
        channel_id: 'channel-123',
        customer_id: 'customer-123',
        message_text: 'Test inquiry message',
      };

      // Act
      const dto = plainToInstance(CreateInquiryDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
      expect(dto.extracted_info).toBeUndefined();
    });
  });

  describe('CreateBusinessDto', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      const data = {
        name: 'Test Business',
        industry_type: 'HOSPITAL',
        organization_id: 'organization-123',
      };

      // Act
      const dto = plainToInstance(CreateBusinessDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
      expect(dto.name).toBe('Test Business');
      expect(dto.industry_type).toBe('HOSPITAL');
      expect(dto.organization_id).toBe('organization-123');
    });

    it('should fail validation when name is missing', async () => {
      // Arrange
      const data = {
        industry_type: 'HOSPITAL',
        organization_id: 'organization-123',
      };

      // Act
      const dto = plainToInstance(CreateBusinessDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('should fail validation when industry_type is invalid', async () => {
      // Arrange
      const data = {
        name: 'Test Business',
        industry_type: 'INVALID_TYPE',
        organization_id: 'organization-123',
      };

      // Act
      const dto = plainToInstance(CreateBusinessDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'industry_type')).toBe(true);
    });

    it('should allow optional fields to be undefined', async () => {
      // Arrange
      const data = {
        name: 'Test Business',
        industry_type: 'HOSPITAL',
        organization_id: 'organization-123',
      };

      // Act
      const dto = plainToInstance(CreateBusinessDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
      expect(dto.phone).toBeUndefined();
      expect(dto.website).toBeUndefined();
    });

    it('should validate optional email when provided', async () => {
      // Arrange
      const data = {
        name: 'Test Business',
        industry_type: 'HOSPITAL',
        organization_id: 'organization-123',
        email: 'invalid-email',
      };

      // Act
      const dto = plainToInstance(CreateBusinessDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });
  });

  describe('CreateCustomerDto', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      const data = {
        business_id: 'business-123',
        platform_user_id: 'platform-user-123',
        platform: 'KAKAO',
      };

      // Act
      const dto = plainToInstance(CreateCustomerDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
      expect(dto.business_id).toBe('business-123');
      expect(dto.platform_user_id).toBe('platform-user-123');
      expect(dto.platform).toBe('KAKAO');
    });

    it('should fail validation when required fields are missing', async () => {
      // Arrange
      const data = {
        business_id: 'business-123',
      };

      // Act
      const dto = plainToInstance(CreateCustomerDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when platform is invalid', async () => {
      // Arrange
      const data = {
        business_id: 'business-123',
        platform_user_id: 'platform-user-123',
        platform: 'INVALID_PLATFORM',
      };

      // Act
      const dto = plainToInstance(CreateCustomerDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'platform')).toBe(true);
    });

    it('should allow optional fields to be undefined', async () => {
      // Arrange
      const data = {
        business_id: 'business-123',
        platform_user_id: 'platform-user-123',
        platform: 'KAKAO',
      };

      // Act
      const dto = plainToInstance(CreateCustomerDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
      expect(dto.name).toBeUndefined();
      expect(dto.email).toBeUndefined();
      expect(dto.phone).toBeUndefined();
    });

    it('should validate optional email when provided', async () => {
      // Arrange
      const data = {
        business_id: 'business-123',
        platform_user_id: 'platform-user-123',
        platform: 'KAKAO',
        email: 'invalid-email',
      };

      // Act
      const dto = plainToInstance(CreateCustomerDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle empty strings for required fields', async () => {
      // Arrange
      const data = {
        email: '',
        password: 'password123',
        name: '홍길동',
      };

      // Act
      const dto = plainToInstance(SignupDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'email')).toBe(true);
    });

    it('should handle null values', async () => {
      // Arrange
      const data = {
        email: null,
        password: 'password123',
        name: '홍길동',
      };

      // Act
      const dto = plainToInstance(SignupDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined values for required fields', async () => {
      // Arrange
      const data = {
        email: undefined,
        password: 'password123',
        name: '홍길동',
      };

      // Act
      const dto = plainToInstance(SignupDto, data);
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle extra properties (whitelist behavior)', async () => {
      // Arrange
      const data = {
        email: 'user@example.com',
        password: 'password123',
        name: '홍길동',
        extraField: 'should be ignored',
      };

      // Act
      const dto = plainToInstance(SignupDto, data);
      const errors = await validate(dto);

      // Assert
      // Note: whitelist is handled by ValidationPipe, not class-validator
      // This test verifies that validation still passes with extra fields
      expect(errors.length).toBe(0);
    });
  });
});
