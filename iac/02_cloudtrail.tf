# Corrige la ausencia de CloudTrail detectada en la Fase 4
resource "aws_cloudtrail" "main" {
  name                          = "archivacloud-trail"
  s3_bucket_name                = aws_s3_bucket.trail_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
}

resource "aws_s3_bucket" "trail_logs" {
  bucket = "archivacloud-cloudtrail-logs"
}
