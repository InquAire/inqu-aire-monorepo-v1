import { z } from 'zod';

export interface SystemSettings {
  siteName: string;
  siteDescription?: string;
  adminEmail: string;
  maxUploadSize: number;
  maintenanceMode: boolean;
}

// Form input schema (for react-hook-form)
export const settingsFormSchema = z.object({
  siteName: z
    .string()
    .min(1, { message: '사이트 이름은 필수입니다.' })
    .max(100, { message: '사이트 이름은 최대 100자까지 가능합니다.' }),
  siteDescription: z.string().max(500, { message: '설명은 최대 500자까지 가능합니다.' }).optional(),
  adminEmail: z
    .string()
    .email({ message: '올바른 이메일 주소를 입력해주세요.' })
    .min(1, { message: '관리자 이메일은 필수입니다.' }),
  maxUploadSize: z
    .string()
    .regex(/^\d+$/, { message: '숫자만 입력 가능합니다.' })
    .refine(
      val => {
        const num = Number(val);
        return num >= 1 && num <= 100;
      },
      { message: '1MB 이상 100MB 이하여야 합니다.' }
    ),
  maintenanceMode: z.boolean(),
});

// Output schema (after transformation)
export const settingsSchema = settingsFormSchema
  .extend({
    maxUploadSize: z.number().min(1, { message: '최소 1MB 이상이어야 합니다.' }).max(100, {
      message: '최대 100MB까지 가능합니다.',
    }),
  })
  .transform(data => ({
    ...data,
    maxUploadSize: Number(data.maxUploadSize),
  }));

export type SettingsFormData = z.infer<typeof settingsFormSchema>;
export type SettingsData = z.infer<typeof settingsSchema>;
