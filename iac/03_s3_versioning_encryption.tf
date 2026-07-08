# Corrige Tampering (VULN-001): versionado del bucket para poder revertir
# cambios o eliminaciones no autorizadas
resource "aws_s3_bucket_versioning" "archivacloud" {
  bucket = aws_s3_bucket.archivacloud.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Complementa: cifrado en reposo con llave gestionada (SSE-KMS)
resource "aws_s3_bucket_server_side_encryption_configuration" "archivacloud" {
  bucket = aws_s3_bucket.archivacloud.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.archivacloud.arn
    }
  }
}
