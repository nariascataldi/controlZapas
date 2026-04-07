# Roles y Responsabilidades A11y

Este documento detalla las responsabilidades específicas de cada miembro del equipo en materia de accesibilidad.

---

## Director

| Responsabilidad | Descripción |
|----------------|-------------|
| **Priorización** | Definir qué componentes corregirse primero (impacto + esfuerzo) |
| **Aprobación** | Autorizar cambios en Stitch antes de implementación |
| **Timeline** | Establecer fechas límite por fase |
| **QA Gates** | Requerirレポート A11y antes de cada deploy |

---

## Frontend

| Responsabilidad | Artefacto | Detalle |
|----------------|-----------|---------|
| **Diseño Accesible con Stitch** | Project ID: `14037293779698532808` | Usar herramientas de Stitch para crear base visual con contrastes y jerarquías correctas |
| **Semántica HTML5** | `roles/Frontend.md` | Implementar tags semánticos (button, nav, main, article, footer) |
| **ARIA Labels** | `roles/Frontend.md` | Implementar atributos ARIA donde HTML semántico no sea suficiente |
| **Focus Management** | `roles/Frontend.md` | Gestionar focus en modales y formularios complejos |
| **Contraste de Color** | `roles/Frontend.md` | Ratio mínimo 4.5:1 (texto normal) y 3:1 (texto grande) |
| **Tipografía Accesible** | `roles/Frontend.md` | Tamaño mínimo 16px para cuerpo de texto |
| **Reduced Motion** | `roles/Frontend.md` | Respetar `prefers-reduced-motion` |

**Archivos a modificar**:
- `frontend/index.html`
- `frontend/stock.html`
- `frontend/ventas.html`
- `frontend/dashboard.html`
- `frontend/login.html`
- `frontend/historial.html`
- `frontend/vendedores.html`

---

## FrontendTester

| Responsabilidad | Herramienta | Detalle |
|----------------|-------------|---------|
| **Auditorías axe-core** | `@axe-core/playwright` | Ejecutar auditorías automatizadas en todas las vistas |
| **Testing Manual Teclado** | Chrome DevTools | Verificar navegación completa con Tab |
| **Zoom 200%** | Chrome DevTools | Verificar que no haya pérdida de funcionalidad |
| **Lighthouse Audit** | Lighthouse CLI | Auditoría completa WCAG 2.1 AA |
| **WAVE Evaluation** | Extensión navegador | Evaluación visual de problemas |
| **Validación ISO 30071-1** | Manual | Verificar proceso de diseño y desarrollo |

**Tests a crear/modificar**:
- `frontend/tests/a11y_audit.test.js` (existente en scratchpad)
- `frontend/tests/e2e/a11y.spec.js`

**Scripts**:
```bash
npm test                    # Tests unitarios con axe-core
npm run test:e2e           # Tests E2E con a11y checks
npm run test:a11y          # Auditoría completa (requiere crear)
```

---

## Revisor

| Responsabilidad | Descripción |
|----------------|-------------|
| **Code Review A11y** | Verificar uso correcto de ARIA, semántica, focus |
| **Regresiones Visuales** | Detectar cambios que afecten accesibilidad |
| **Validación WCAG** | Asegurar cumplimiento de 4 principios POUR |

---

## QA

| Responsabilidad | Detalle |
|----------------|---------|
| **Metas A11y** | 100% errores críticos/serios corregidos (Axe/Lighthouse) |
| **Checklist QA A11y** | Ver `team/scratchpad.md` líneas 107-111 |
| **Cobertura** | Todas las vistas deben pasar auditoría |

**Checklist de QA A11y**:
- [ ] Contraste de Color (WCAG 2.1 AA): Ratio 4.5:1 / 3:1
- [ ] Navegación por Teclado: Todos los elementos interactivos tienen focus visible
- [ ] Semántica ISO 30071-1: Uso correcto de roles ARIA y HTML5 semántico
- [ ] Escalabilidad: Zoom 200% sin pérdida de funcionalidad

---

## DB

| Responsabilidad | Descripción |
|----------------|-------------|
| **Queries Accesibles** | Asegurar que queries sean compatibles con lectores de pantalla |
| **RLS Policies** | Verificar que policies no bloqueen datos necesarios para A11y |
| **Performance** | Queries rápidas para no afectar experiencia de usuarios con tecnologías asistivas |

---

## othersCalled (Artefactos por Rol)

| Rol | Artefactos Relacionados |
|-----|------------------------|
| Director | `decisions.log`, `tasks.json` |
| Frontend | `roles/Frontend.md`, Stitch Project `14037293779698532808` |
| FrontendTester | `roles/FrontendTester.md`, `tests/a11y_audit.test.js` |
| Revisor | `roles/Revisor.md` |
| QA | `team/scratchpad.md` (líneas 107-111) |
| DB | `roles/DB.md`, Supabase MCP |

---

## Matriz de Capacidades

| Capacidad | Director | Frontend | FTester | Revisor | QA | DB |
|-----------|:--------:|:--------:|:-------:|:-------:|:--:|:--:|
| Diseño Stitch | - | ✅ | - | - | - | - |
| HTML Semántico | - | ✅ | ✅ | ✅ | - | - |
| ARIA Labels | - | ✅ | ✅ | ✅ | - | - |
| axe-core | - | - | ✅ | - | ✅ | - |
| Lighthouse | - | - | ✅ | - | ✅ | - |
| Testing Manual | - | - | ✅ | ✅ | ✅ | - |
| RLS Policies | - | - | - | - | ✅ | ✅ |
| Code Review | - | - | ✅ | ✅ | - | - |

---

*Documento actualizado: 2026-04-07*
