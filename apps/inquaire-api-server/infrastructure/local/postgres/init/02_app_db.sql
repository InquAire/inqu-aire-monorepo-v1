-- 앱 전용 사용자/DB 권한(옵션: 이미 POSTGRES_DB가 test로 생성됨)
-- CREATE USER inquaire_user WITH PASSWORD 'inquaire_pass';
-- GRANT ALL PRIVILEGES ON DATABASE test TO inquaire_user;

-- 스키마와 권한 (필요시 활성화)
-- CREATE SCHEMA IF NOT EXISTS public;
-- GRANT USAGE ON SCHEMA public TO public;

-- 연결 제한/풀 힌트 (Prisma는 클라이언트 풀 사용)
-- ALTER DATABASE test SET idle_in_transaction_session_timeout = '5s';

-- Shadow DB for Prisma migrations (kept separate from main app database)
CREATE DATABASE shadow;

-- 메인 DB 스키마 구성
CREATE SCHEMA IF NOT EXISTS inquaire AUTHORIZATION CURRENT_USER;
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET search_path = inquaire, public', current_database());
END;
$$;

-- Shadow DB도 동일한 스키마 구조 유지
\connect shadow
CREATE SCHEMA IF NOT EXISTS inquaire AUTHORIZATION CURRENT_USER;
ALTER DATABASE shadow SET search_path = inquaire, public;
\connect -
