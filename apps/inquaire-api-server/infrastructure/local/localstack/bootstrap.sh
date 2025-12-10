#!/usr/bin/env bash
set -euo pipefail

# 통일: 로컬은 us-east-1 권장
export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-test}
export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-test}
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}

awslocal() { aws --endpoint-url=http://localhost:4566 "$@"; }

echo "[LocalStack] bootstrap start"

# -------------------------
# S3 buckets (content 추가)
# -------------------------
BUCKETS=("content" "pk-assets-tmp" "pk-assets-processed" "pk-audio" "pk-images" "inquaire-korean-bucket")
for b in "${BUCKETS[@]}"; do
  # 존재해도 에러 무시
  awslocal s3api create-bucket --bucket "${b}" 2>/dev/null || true
  awslocal s3api put-bucket-versioning --bucket "${b}" --versioning-configuration Status=Enabled >/dev/null

  # 선택: CORS (필요한 버킷만 적용하세요)
  awslocal s3api put-bucket-cors --bucket "${b}" --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["http://localhost:5173"],
        "AllowedMethods": ["GET","PUT","POST","DELETE","HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag","x-amz-request-id","x-amz-id-2"],
        "MaxAgeSeconds": 3000
      }
    ]
  }' >/dev/null 2>&1 || true

  echo "  - s3://${b} ready"
done

# -------------
# SQS (DLQ 연결)
# -------------
DLQ_NAME="pk-dead-letter"
MAIN_Q="pk-jobs"

# DLQ 먼저
awslocal sqs create-queue --queue-name "${DLQ_NAME}" >/dev/null 2>&1 || true
DLQ_URL=$(awslocal sqs get-queue-url --queue-name "${DLQ_NAME}" --query 'QueueUrl' --output text)
DLQ_ATTR=$(awslocal sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names QueueArn)
DLQ_ARN=$(echo "$DLQ_ATTR" | jq -r '.Attributes.QueueArn')

# Main Queue 생성(있으면 무시)
awslocal sqs create-queue --queue-name "${MAIN_Q}" >/dev/null 2>&1 || true
MAIN_URL=$(awslocal sqs get-queue-url --queue-name "${MAIN_Q}" --query 'QueueUrl' --output text)

# RedrivePolicy 설정 (idempotent 하게 덮어쓰기)
awslocal sqs set-queue-attributes \
  --queue-url "$MAIN_URL" \
  --attributes "RedrivePolicy={\"deadLetterTargetArn\":\"${DLQ_ARN}\",\"maxReceiveCount\":\"5\"}" >/dev/null

echo "  - sqs://${DLQ_NAME} (DLQ) ready"
echo "  - sqs://${MAIN_Q} (redrive->${DLQ_NAME}) ready"

echo "[LocalStack] bootstrap done"
