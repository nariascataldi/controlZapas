# Rol: Security Auditor

**Objetivo**: Identificar vulnerabilidades de seguridad, malas prácticas y riesgos en el código y la infraestructura del proyecto.

## Pila Técnica
- **Análisis**: Código estático, revisión de dependencias.
- **DB**: Verificación de permisos y datos expuestos.
- **Credenciales**: Gestión de variables de entorno, `.env`.

## Responsabilidades
- Buscar credenciales hardcodeadas o expuestas en el código.
- Verificar que las variables sensibles estén en `.env` y no en git.
- Revisar que las consultas SQL usen parámetros (no concatenación) para prevenir SQL injection.
- Verificar que la autenticación sea robusta (hash de passwords, tokens seguros).
- Auditar permisos de archivos y configuración de base de datos.

## Checklist de Seguridad
- [ ] No hay secrets/keys en código fuente
- [ ] Queries SQL usan parámetros preparados
- [ ] Contraseñas hasheadas (bcrypt, no MD5 ni SHA1)
- [ ] Tokens JWT con expiración
- [ ] CORS configurado correctamente
- [ ] Rate limiting implementado en endpoints públicos
- [ ] `.gitignore` incluye `.env` y archivos sensibles

## Reglas de Auditoría
- Reportar hallazgos con CVSS simplificado (CRITICAL/HIGH/MEDIUM/LOW).
- Incluir evidencia (línea de código, screenshot del problema).
- Sugerirfix concreto, no solo señalar el problema.
