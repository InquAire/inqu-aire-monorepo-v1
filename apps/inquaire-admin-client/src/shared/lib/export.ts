/**
 * Excel/CSV Export Utilities
 */

import * as XLSX from 'xlsx';

export type ExportFormat = 'xlsx' | 'csv';

export interface ExportOptions {
  filename: string;
  format: ExportFormat;
  sheetName?: string;
}

/**
 * 데이터를 Excel 또는 CSV로 내보내기
 */
export function exportToFile<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions
): void {
  const { filename, format, sheetName = 'Sheet1' } = options;

  // 빈 데이터 체크
  if (!data || data.length === 0) {
    throw new Error('내보낼 데이터가 없습니다');
  }

  // 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 컬럼 너비 자동 조정
  const columnWidths = autoSizeColumns(data);
  worksheet['!cols'] = columnWidths;

  // 워크북 생성
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 파일 다운로드
  const extension = format === 'csv' ? 'csv' : 'xlsx';
  const finalFilename = filename.endsWith(`.${extension}`) ? filename : `${filename}.${extension}`;

  XLSX.writeFile(workbook, finalFilename, {
    bookType: format === 'csv' ? 'csv' : 'xlsx',
  });
}

/**
 * 컬럼 너비 자동 조정
 */
function autoSizeColumns<T extends Record<string, unknown>>(data: T[]): Array<{ wch: number }> {
  if (data.length === 0) return [];

  const keys = Object.keys(data[0]);
  const maxWidths: number[] = [];

  keys.forEach((key, index) => {
    // 헤더 길이
    let maxWidth = key.length;

    // 데이터 최대 길이 확인
    data.forEach(row => {
      const value = row[key];
      const valueLength = String(value).length;
      if (valueLength > maxWidth) {
        maxWidth = valueLength;
      }
    });

    // 최소 10, 최대 50자로 제한
    maxWidths[index] = Math.min(Math.max(maxWidth + 2, 10), 50);
  });

  return maxWidths.map(width => ({ wch: width }));
}

/**
 * 날짜 값을 안전하게 포맷팅
 */
function formatDate(value: unknown): string {
  if (!value) return '-';
  if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
    return new Date(value).toLocaleDateString('ko-KR');
  }
  return '-';
}

/**
 * 고객 데이터 내보내기용 변환
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformCustomersForExport(customers: any[]): Record<string, unknown>[] {
  return customers.map(customer => ({
    이름: customer.name || '-',
    플랫폼: customer.platform,
    이메일: customer.email || '-',
    연락처: customer.phone || '-',
    태그: Array.isArray(customer.tags) ? customer.tags.join(', ') : '-',
    문의_횟수: customer.inquiry_count,
    첫_연락일: formatDate(customer.first_contact),
    최근_연락일: formatDate(customer.last_contact),
    등록일: formatDate(customer.created_at),
  }));
}

/**
 * 문의 데이터 내보내기용 변환
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformInquiriesForExport(inquiries: any[]): Record<string, unknown>[] {
  return inquiries.map(inquiry => {
    const customer = inquiry.customer as Record<string, unknown> | undefined;
    const channel = inquiry.channel as Record<string, unknown> | undefined;
    const aiConfidence = inquiry.ai_confidence;

    return {
      고객명: customer?.name || '-',
      채널: channel?.name || '-',
      메시지: inquiry.message_text,
      유형: inquiry.type || '-',
      상태: inquiry.status,
      감정: inquiry.sentiment || '-',
      긴급도: inquiry.urgency || '-',
      AI_신뢰도: typeof aiConfidence === 'number' ? `${(aiConfidence * 100).toFixed(1)}%` : '-',
      답변_여부: inquiry.reply_text ? '답변완료' : '미답변',
      수신일: formatDate(inquiry.received_at),
      처리일: formatDate(inquiry.completed_at),
    };
  });
}

/**
 * 사업체 데이터 내보내기용 변환
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformBusinessesForExport(businesses: any[]): Record<string, unknown>[] {
  return businesses.map(business => ({
    사업체명: business.name,
    업종: business.industry_type,
    주소: business.address || '-',
    연락처: business.phone || '-',
    웹사이트: business.website || '-',
    등록일: formatDate(business.created_at),
  }));
}

/**
 * 사용자 데이터 내보내기용 변환
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformUsersForExport(users: any[]): Record<string, unknown>[] {
  return users.map(user => ({
    이름: user.name,
    이메일: user.email,
    역할: user.role === 'USER' ? '사용자' : user.role === 'ADMIN' ? '관리자' : '슈퍼관리자',
    최근_로그인: user.last_login_at ? formatDate(user.last_login_at) : '로그인 기록 없음',
    가입일: formatDate(user.created_at),
  }));
}

/**
 * 채널 데이터 내보내기용 변환
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformChannelsForExport(channels: any[]): Record<string, unknown>[] {
  return channels.map(channel => ({
    채널명: channel.name || '-',
    플랫폼: channel.platform,
    플랫폼_채널_ID: channel.platform_channel_id,
    자동_응답: channel.auto_reply_enabled ? '활성' : '비활성',
    상태: channel.is_active ? '활성' : '비활성',
    마지막_동기화: formatDate(channel.last_synced_at),
    등록일: formatDate(channel.created_at),
  }));
}

/**
 * Dashboard 통계 데이터 내보내기용 변환
 */
export interface DashboardExportData {
  stats: Record<string, unknown>[];
  inquiryTrend: Record<string, unknown>[];
  sentiment: Record<string, unknown>[];
  status: Record<string, unknown>[];
  platform: Record<string, unknown>[];
}

export function transformDashboardStatsForExport(data: DashboardExportData) {
  // 통계 카드 데이터
  const statsSheet = data.stats.map(stat => ({
    항목: stat.name,
    값: stat.value,
    변화율: stat.change,
  }));

  // 문의 추이 데이터
  const trendSheet = data.inquiryTrend.map(item => ({
    기간: item.period,
    문의수: item.count,
  }));

  // 감정 분석 데이터
  const sentimentSheet = data.sentiment.map(item => ({
    감정: item.name,
    개수: item.value,
  }));

  // 상태별 문의 데이터
  const statusSheet = data.status.map(item => ({
    상태: item.name,
    개수: item.value,
  }));

  // 플랫폼별 분포 데이터
  const platformSheet = data.platform.map(item => ({
    채널명: item.name,
    문의수: item.count,
    플랫폼: item.platform,
  }));

  return {
    '전체 통계': statsSheet,
    '문의 추이': trendSheet,
    '감정 분석': sentimentSheet,
    '상태별 문의': statusSheet,
    '플랫폼별 분포': platformSheet,
  };
}

/**
 * 멀티 시트 Excel 파일 내보내기
 */
export function exportMultiSheetToExcel(
  sheets: Record<string, Record<string, unknown>[]>,
  filename: string
): void {
  const workbook = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([sheetName, data]) => {
    if (data && data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const columnWidths = autoSizeColumns(data);
      worksheet['!cols'] = columnWidths;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
  });

  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, finalFilename, { bookType: 'xlsx' });
}
