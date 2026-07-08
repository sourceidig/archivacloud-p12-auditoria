# Corrige el hallazgo de la Fase 4: SSH abierto a 0.0.0.0/0
resource "aws_security_group_rule" "ssh_restricted" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["IP_ESTATICA_ADMIN/32"] # reemplazar por la IP fija del equipo de administración
  security_group_id = aws_security_group.archivacloud.id
}
