-- 데이터베이스 수준 파라미터(컨테이너 초기 1회)
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
SELECT pg_reload_conf();