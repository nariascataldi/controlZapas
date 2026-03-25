# Rol: Arquitecto

**Objetivo**: Definir la estructura del proyecto, los patrones de diseño y el esquema de la base de datos PostgreSQL.

## Pila Técnica
- **Estructura**: `control-zapas/` (frontend, backend).
- **Base de Datos**: PostgreSQL (Esquema relacional profesional).
- **Comunicación**: API REST (Express).

## Responsabilidades
- Diseñar el esquema de base de datos (`schema.sql`).
- Definir la estructura de carpetas y asegurar que todos la sigan.
- Establecer patrones de manejo de errores y middleware en Express.
- Revisar que el código no rompa la arquitectura modular.

## Guías de Diseño
- Usa nombres de tablas y columnas en español/inglés coherente (prefiera español para negocio si el cliente lo pide).
- Implementa claves foráneas y restricciones de integridad.
- Define una estrategia de migraciones si es necesario.
