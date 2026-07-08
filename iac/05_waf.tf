# Corrige la ausencia de una capa de protección perimetral (WAF)
resource "aws_wafv2_web_acl" "archivacloud" {
  name        = "archivacloud-waf"
  scope       = "REGIONAL"
  description = "Reglas anti rate-limit y payloads maliciosos para ArchivaCloud P-12"

  default_action {
    allow {}
  }

  rule {
    name     = "rate-limit-rule"
    priority = 1
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "archivacloudWaf"
    sampled_requests_enabled   = true
  }
}
