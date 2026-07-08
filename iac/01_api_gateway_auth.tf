# Corrige VULN-001 (sin autenticación): autorizador JWT en API Gateway
resource "aws_apigatewayv2_authorizer" "jwt_auth" {
  api_id           = aws_apigatewayv2_api.archivacloud.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "jwt-authorizer"

  jwt_configuration {
    audience = ["archivacloud-api"]
    issuer   = "https://cognito-idp.us-west-2.amazonaws.com/${aws_cognito_user_pool.users.id}"
  }
}

# Corrige la ausencia de rate-limiting (Fase 3, ataque 8): throttling en el stage
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.archivacloud.id
  name        = "prod"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 10 # 10 peticiones/segundo
    throttling_burst_limit = 20
  }
}
