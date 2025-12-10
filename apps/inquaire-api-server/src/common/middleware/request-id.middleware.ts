import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID Middleware
 * 모든 요청에 고유한 ID를 할당하여 로그 추적 및 디버깅 지원
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. 클라이언트가 제공한 Request ID 사용 또는 새로 생성
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // 2. Request 객체에 저장 (로거 및 다른 미들웨어에서 사용)
  (req as any).id = requestId;

  // 3. Response 헤더에 추가 (클라이언트가 요청 추적 가능)
  res.setHeader('X-Request-ID', requestId);

  next();
}
