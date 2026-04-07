# Plan de Implementación: Accesibilidad y Estándares ISO/WCAG

> **📁 Documentación movida a `.antigravity/a11y/`**

Este plan documenta la estrategia para transformar el proyecto **Control Zapas** en un sistema 100% inclusivo, cumpliendo con **WCAG 2.1 (Nivel AA)** y **ISO 30071-1**.

## 📁 Documentación en `.antigravity/a11y/`

| Documento | Descripción |
|-----------|-------------|
| [IMPLEMENTATION_PLAN_A11Y.md](.antigravity/a11y/IMPLEMENTATION_PLAN_A11Y.md) | Plan principal con Staff, othersCalled, librerías y MCPs |
| [IMPLEMENTATION_PLAN_DETAIL.md](.antigravity/a11y/IMPLEMENTATION_PLAN_DETAIL.md) | Plan detallado de ejecución por fases |
| [ROLES_A11Y.md](.antigravity/a11y/ROLES_A11Y.md) | Responsabilidades del staff en A11y |
| [LIBRARIES_MCP.md](.antigravity/a11y/LIBRARIES_MCP.md) | Librerías y herramientas MCP |
| [CHECKLIST_A11Y.md](.antigravity/a11y/CHECKLIST_A11Y.md) | Checklist de verificación WCAG 2.1 AA |

---

## 👥 Staff (Resumen)

| Rol | Responsabilidad A11y |
|-----|---------------------|
| **Director** | Aprobación de cambios en Stitch |
| **Frontend** | Diseño accesible, ARIA labels, semántica HTML5 |
| **FrontendTester** | Auditorías axe-core, testing manual |
| **Revisor** | Code review A11y |
| **QA** | Validación de metas A11y |
| **DB** | Queries compatibles con lectores de pantalla |

## 🛠️ Herramientas Principales

- **Stitch (MCP)**: Project ID `14037293779698532808`
- **axe-core**: Auditoría automatizada
- **Lighthouse**: Auditoría completa
- **WAVE**: Evaluación visual
- **Accessibility Insights**: Problemas complejos

---

## Resumen de Fases

### Fase 1: Documentación ✅ COMPLETADA
- [x] Roles actualizados con estándares A11y
- [x] Metas A11y en scratchpad (QA)
- [x] Declaración de cumplimiento en README.md

### Fase 2: Ejecución en Stitch ⏳ PENDIENTE DE APROBACIÓN
- Sistema de Diseño: Tokens de contraste
- Pantallas: Auditoría y corrección masiva

### Fase 3: Verificación ⏳ PENDIENTE
- Auditoría automatizada con axe-core
- Pruebas manuales: teclado, zoom 200%

---

## ❓ Preguntas para el Usuario

- ¿Nivel de cumplimiento: **AA** (estándar) o **AAA** (riguroso)?
- ¿Deseas un reporte inicial de accesibilidad antes de los cambios en Stitch?
- ¿Timeline estimado por fase?

---

*Para seguimiento detallado, ver `.antigravity/a11y/`.*
