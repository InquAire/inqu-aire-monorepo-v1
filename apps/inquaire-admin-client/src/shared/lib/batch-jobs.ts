/**
 * 배치 작업 (Batch Jobs) 라이브러리
 *
 * 통계 집계, 데이터 정리 등 배치 작업을 관리하는 시스템
 */

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

/**
 * 배치 작업 타입
 */
export enum BatchJobType {
  /** 일별 통계 집계 */
  DAILY_STATS = 'DAILY_STATS',
  /** 주별 통계 집계 */
  WEEKLY_STATS = 'WEEKLY_STATS',
  /** 월별 통계 집계 */
  MONTHLY_STATS = 'MONTHLY_STATS',
  /** 고객 데이터 정리 */
  CUSTOMER_CLEANUP = 'CUSTOMER_CLEANUP',
  /** 만료된 문의 아카이빙 */
  INQUIRY_ARCHIVE = 'INQUIRY_ARCHIVE',
  /** 캐시 정리 */
  CACHE_CLEANUP = 'CACHE_CLEANUP',
  /** 로그 정리 */
  LOG_CLEANUP = 'LOG_CLEANUP',
  /** 이메일 발송 */
  EMAIL_SEND = 'EMAIL_SEND',
  /** 알림 발송 */
  NOTIFICATION_SEND = 'NOTIFICATION_SEND',
  /** 데이터 백업 */
  DATA_BACKUP = 'DATA_BACKUP',
}

/**
 * 배치 작업 상태
 */
export enum BatchJobStatus {
  /** 대기 중 */
  PENDING = 'PENDING',
  /** 실행 중 */
  RUNNING = 'RUNNING',
  /** 완료 */
  COMPLETED = 'COMPLETED',
  /** 실패 */
  FAILED = 'FAILED',
  /** 취소됨 */
  CANCELLED = 'CANCELLED',
}

/**
 * 배치 작업 스케줄
 */
export enum BatchJobSchedule {
  /** 매 시간 */
  HOURLY = 'HOURLY',
  /** 매일 */
  DAILY = 'DAILY',
  /** 매주 */
  WEEKLY = 'WEEKLY',
  /** 매월 */
  MONTHLY = 'MONTHLY',
  /** 수동 */
  MANUAL = 'MANUAL',
}

/**
 * 배치 작업 정보
 */
export interface BatchJob {
  /** 작업 ID */
  id: string;
  /** 작업 타입 */
  type: BatchJobType;
  /** 작업 이름 */
  name: string;
  /** 작업 설명 */
  description: string;
  /** 작업 상태 */
  status: BatchJobStatus;
  /** 스케줄 */
  schedule: BatchJobSchedule;
  /** Cron 표현식 (스케줄이 CUSTOM인 경우) */
  cronExpression?: string;
  /** 마지막 실행 시간 */
  lastRunAt?: string;
  /** 다음 실행 예정 시간 */
  nextRunAt?: string;
  /** 실행 시작 시간 */
  startedAt?: string;
  /** 실행 완료 시간 */
  completedAt?: string;
  /** 실행 소요 시간 (ms) */
  duration?: number;
  /** 진행률 (0-100) */
  progress?: number;
  /** 처리된 아이템 수 */
  processedCount?: number;
  /** 전체 아이템 수 */
  totalCount?: number;
  /** 에러 메시지 */
  error?: string;
  /** 성공 여부 */
  success?: boolean;
  /** 결과 데이터 */
  result?: unknown;
  /** 활성화 여부 */
  enabled: boolean;
  /** 생성 시간 */
  createdAt: string;
  /** 업데이트 시간 */
  updatedAt: string;
}

/**
 * 배치 작업 생성 파라미터
 */
export interface CreateBatchJobParams {
  type: BatchJobType;
  name: string;
  description?: string;
  schedule: BatchJobSchedule;
  cronExpression?: string;
  enabled?: boolean;
}

/**
 * 배치 작업 실행 결과
 */
export interface BatchJobExecutionResult {
  jobId: string;
  status: BatchJobStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  processedCount?: number;
  totalCount?: number;
  success: boolean;
  error?: string;
  result?: unknown;
}

/**
 * 배치 작업 API
 */
export const batchJobsApi = {
  /**
   * 배치 작업 목록 조회
   */
  async list(params?: {
    type?: BatchJobType;
    status?: BatchJobStatus;
    enabled?: boolean;
  }): Promise<BatchJob[]> {
    const response = await axios.get<BatchJob[]>('/api/batch-jobs', { params });
    return response.data;
  },

  /**
   * 배치 작업 상세 조회
   */
  async get(id: string): Promise<BatchJob> {
    const response = await axios.get<BatchJob>(`/api/batch-jobs/${id}`);
    return response.data;
  },

  /**
   * 배치 작업 생성
   */
  async create(params: CreateBatchJobParams): Promise<BatchJob> {
    const response = await axios.post<BatchJob>('/api/batch-jobs', params);
    return response.data;
  },

  /**
   * 배치 작업 업데이트
   */
  async update(id: string, params: Partial<CreateBatchJobParams>): Promise<BatchJob> {
    const response = await axios.patch<BatchJob>(`/api/batch-jobs/${id}`, params);
    return response.data;
  },

  /**
   * 배치 작업 삭제
   */
  async delete(id: string): Promise<void> {
    await axios.delete(`/api/batch-jobs/${id}`);
  },

  /**
   * 배치 작업 수동 실행
   */
  async execute(id: string): Promise<BatchJobExecutionResult> {
    const response = await axios.post<BatchJobExecutionResult>(`/api/batch-jobs/${id}/execute`);
    return response.data;
  },

  /**
   * 배치 작업 취소
   */
  async cancel(id: string): Promise<void> {
    await axios.post(`/api/batch-jobs/${id}/cancel`);
  },

  /**
   * 배치 작업 활성화/비활성화
   */
  async toggle(id: string, enabled: boolean): Promise<BatchJob> {
    const response = await axios.patch<BatchJob>(`/api/batch-jobs/${id}/toggle`, { enabled });
    return response.data;
  },

  /**
   * 배치 작업 실행 이력 조회
   */
  async getHistory(id: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<BatchJobExecutionResult[]> {
    const response = await axios.get<BatchJobExecutionResult[]>(
      `/api/batch-jobs/${id}/history`,
      { params }
    );
    return response.data;
  },
};

/**
 * 배치 작업 목록 Hook
 *
 * @example
 * const { jobs, loading, refetch } = useBatchJobs();
 */
export function useBatchJobs(params?: {
  type?: BatchJobType;
  status?: BatchJobStatus;
  enabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { autoRefresh = false, refreshInterval = 30000, ...filterParams } = params || {};
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await batchJobsApi.list(filterParams);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [filterParams]);

  useEffect(() => {
    fetchJobs();

    if (autoRefresh) {
      const interval = setInterval(fetchJobs, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchJobs, autoRefresh, refreshInterval]);

  const executeJob = useCallback(async (id: string) => {
    const result = await batchJobsApi.execute(id);
    await fetchJobs(); // 목록 갱신
    return result;
  }, [fetchJobs]);

  const cancelJob = useCallback(async (id: string) => {
    await batchJobsApi.cancel(id);
    await fetchJobs(); // 목록 갱신
  }, [fetchJobs]);

  const toggleJob = useCallback(async (id: string, enabled: boolean) => {
    await batchJobsApi.toggle(id, enabled);
    await fetchJobs(); // 목록 갱신
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs,
    executeJob,
    cancelJob,
    toggleJob,
  };
}

/**
 * 단일 배치 작업 Hook
 *
 * @example
 * const { job, execute, cancel, loading } = useBatchJob('job-id');
 */
export function useBatchJob(id: string, options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const { autoRefresh = false, refreshInterval = 5000 } = options || {};
  const [job, setJob] = useState<BatchJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchJob = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await batchJobsApi.get(id);
      setJob(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();

    if (autoRefresh) {
      const interval = setInterval(fetchJob, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchJob, autoRefresh, refreshInterval]);

  const execute = useCallback(async () => {
    const result = await batchJobsApi.execute(id);
    await fetchJob(); // 작업 정보 갱신
    return result;
  }, [id, fetchJob]);

  const cancel = useCallback(async () => {
    await batchJobsApi.cancel(id);
    await fetchJob(); // 작업 정보 갱신
  }, [id, fetchJob]);

  return {
    job,
    loading,
    error,
    refetch: fetchJob,
    execute,
    cancel,
  };
}

/**
 * 배치 작업 실행 이력 Hook
 *
 * @example
 * const { history, loading } = useBatchJobHistory('job-id');
 */
export function useBatchJobHistory(id: string, params?: {
  limit?: number;
  offset?: number;
}) {
  const [history, setHistory] = useState<BatchJobExecutionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await batchJobsApi.getHistory(id, params);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [id, params]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory,
  };
}

/**
 * 배치 작업 타입 레이블 맵
 */
export const BATCH_JOB_TYPE_LABELS: Record<BatchJobType, string> = {
  [BatchJobType.DAILY_STATS]: '일별 통계 집계',
  [BatchJobType.WEEKLY_STATS]: '주별 통계 집계',
  [BatchJobType.MONTHLY_STATS]: '월별 통계 집계',
  [BatchJobType.CUSTOMER_CLEANUP]: '고객 데이터 정리',
  [BatchJobType.INQUIRY_ARCHIVE]: '문의 아카이빙',
  [BatchJobType.CACHE_CLEANUP]: '캐시 정리',
  [BatchJobType.LOG_CLEANUP]: '로그 정리',
  [BatchJobType.EMAIL_SEND]: '이메일 발송',
  [BatchJobType.NOTIFICATION_SEND]: '알림 발송',
  [BatchJobType.DATA_BACKUP]: '데이터 백업',
};

/**
 * 배치 작업 상태 레이블 맵
 */
export const BATCH_JOB_STATUS_LABELS: Record<BatchJobStatus, string> = {
  [BatchJobStatus.PENDING]: '대기 중',
  [BatchJobStatus.RUNNING]: '실행 중',
  [BatchJobStatus.COMPLETED]: '완료',
  [BatchJobStatus.FAILED]: '실패',
  [BatchJobStatus.CANCELLED]: '취소됨',
};

/**
 * 배치 작업 스케줄 레이블 맵
 */
export const BATCH_JOB_SCHEDULE_LABELS: Record<BatchJobSchedule, string> = {
  [BatchJobSchedule.HOURLY]: '매 시간',
  [BatchJobSchedule.DAILY]: '매일',
  [BatchJobSchedule.WEEKLY]: '매주',
  [BatchJobSchedule.MONTHLY]: '매월',
  [BatchJobSchedule.MANUAL]: '수동',
};
