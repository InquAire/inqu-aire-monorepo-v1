/**
 * Industry Config Types
 */

export enum IndustryType {
  HOSPITAL = 'HOSPITAL',
  DENTAL = 'DENTAL',
  DERMATOLOGY = 'DERMATOLOGY',
  PLASTIC_SURGERY = 'PLASTIC_SURGERY',
  REAL_ESTATE = 'REAL_ESTATE',
  BEAUTY_SALON = 'BEAUTY_SALON',
  ACADEMY = 'ACADEMY',
  LAW_FIRM = 'LAW_FIRM',
  OTHER = 'OTHER',
}

export const IndustryLabels: Record<IndustryType, string> = {
  [IndustryType.HOSPITAL]: '병원',
  [IndustryType.DENTAL]: '치과',
  [IndustryType.DERMATOLOGY]: '피부과',
  [IndustryType.PLASTIC_SURGERY]: '성형외과',
  [IndustryType.REAL_ESTATE]: '부동산',
  [IndustryType.BEAUTY_SALON]: '미용실',
  [IndustryType.ACADEMY]: '학원',
  [IndustryType.LAW_FIRM]: '법률 상담소',
  [IndustryType.OTHER]: '기타',
};

export interface IndustryConfig {
  id: string;
  industry: IndustryType;
  display_name: string;
  inquiry_types: Record<string, unknown>;
  system_prompt: string;
  extraction_schema: Record<string, unknown>;
  default_templates: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateIndustryConfigRequest {
  industry: IndustryType;
  display_name: string;
  inquiry_types: Record<string, unknown>;
  system_prompt: string;
  extraction_schema: Record<string, unknown>;
  default_templates?: Record<string, unknown>;
}

export interface UpdateIndustryConfigRequest {
  display_name?: string;
  inquiry_types?: Record<string, unknown>;
  system_prompt?: string;
  extraction_schema?: Record<string, unknown>;
  default_templates?: Record<string, unknown>;
}

export interface QueryIndustryConfigParams {
  industry?: IndustryType;
}

export interface IndustryConfigResponse {
  data: IndustryConfig[];
  total: number;
}
