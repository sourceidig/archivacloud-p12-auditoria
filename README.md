# ArchivaCloud P-12 — Auditoría de Ciberseguridad

Repositorio de entrega para el trabajo de auditoría de ciberseguridad sobre la aplicación
"S3 File Upload" (ArchivaCloud P-12), desarrollado por Daniel Ignacio Salinas Gutiérrez.

## Estructura del repositorio

```
.
├── backend/          Código fuente del backend (FastAPI + boto3)
├── frontend/         Código fuente del frontend (React + Vite)
├── iac/              Infraestructura como código (Terraform) - arquitectura endurecida
│   ├── 01_api_gateway_auth.tf       Autenticación JWT + rate limiting
│   ├── 02_cloudtrail.tf             Trazabilidad de eventos
│   ├── 03_s3_versioning_encryption.tf  Versionado + cifrado SSE-KMS
│   ├── 04_security_group_ssh.tf     Restricción de acceso SSH
│   └── 05_waf.tf                    Web Application Firewall
├── exploits/
│   └── exploits.sh   Script con los 8 ataques de la Fase 3 (DAST/Pentesting)
└── evidencias/       Capturas de pantalla del despliegue y las pruebas ejecutadas
```

## Instrucciones de reproducción

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# completar .env con credenciales AWS propias (nunca reales de terceros) y el bucket S3 propio
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

### 3. Ejecutar las pruebas de la Fase 3

```bash
cd exploits
chmod +x exploits.sh
./exploits.sh http://localhost:8000
```

**Advertencia ética:** estos scripts deben ejecutarse únicamente contra infraestructura propia,
desplegada por el propio autor en una cuenta AWS personal o Learner Lab académico. Ejecutar
estas pruebas contra infraestructura de terceros sin autorización constituye una infracción
grave y, en Chile, puede constituir delito bajo la Ley 21.459 (Delitos Informáticos).

### 4. Desplegar la arquitectura endurecida (IaC)

```bash
cd iac
terraform init
terraform plan
terraform apply
```

Nota: los archivos `.tf` en este repositorio son snippets ilustrativos que corrigen los
hallazgos críticos identificados en el informe; requieren completarse con los recursos base
(VPC, API Gateway completo, Cognito User Pool, etc.) antes de poder aplicarse en un entorno real.

## Referencias

El detalle completo de cada hallazgo, su evidencia, impacto y remediación se encuentra en el
informe técnico "Informe_Auditoria_ArchivaCloud_P12.docx" entregado junto con este repositorio.
