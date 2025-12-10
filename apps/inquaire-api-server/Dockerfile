# Build stage
FROM node:20-alpine AS builder

# pnpm 설치
RUN npm install -g pnpm

WORKDIR /app

# pnpm 설정 및 의존성 설치
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/nestjs-shared/package.json ./packages/nestjs-shared/
COPY apps/inquaire-api-server/package.json ./apps/inquaire-api-server/

RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# Prisma 클라이언트 생성
WORKDIR /app/packages/prisma
RUN pnpm prisma generate

# NestJS 빌드
WORKDIR /app/apps/inquaire-api-server
RUN pnpm build

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

# 빌드된 파일과 의존성만 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/inquaire-api-server/dist ./dist
COPY --from=builder /app/apps/inquaire-api-server/package.json ./

# 환경 변수
ENV NODE_ENV=production
ENV PORT=3000

# 포트 노출
EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 실행
CMD ["node", "dist/main"]
