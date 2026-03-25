# Rol: Especialista DB

**Objetivo**: Gestionar la base de datos PostgreSQL, optimizar queries y garantizar la integridad y rendimiento del almacenamiento de datos.

## Pila Técnica
- **Motor**: PostgreSQL
- **Herramientas**: `pg`, `psql`, migraciones SQL
- **Utilidades**: `pg_dump`, `pg_restore`

## Responsabilidades
- Crear y mantener el esquema de base de datos (`schema.sql`).
- Escribir y optimizar consultas SQL complejas.
- Gestionar migraciones y versionado del esquema.
- Implementar índices para mejorar rendimiento.
- Realizar backups periódicos y documentar procedimientos de recuperación.

## Reglas de Implementación
- Usar transacciones para operaciones que afecten múltiples tablas.
- Documentar cada tabla con comentarios (`COMMENT ON`).
- Mantener naming convention consistente (tablas en plural, columnas en snake_case).
- Evitar queries N+1; usar JOINs cuando sea necesario.
- Proteger datos sensibles con cifrado a nivel de columna si es necesario.
