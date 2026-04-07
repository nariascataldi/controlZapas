# Checklist de Verificación A11y

Este checklist debe completarse para cada vista del proyecto.

---

## Pre-Auditoría

- [ ] Navegador limpio (sin extensiones que interfieran)
- [ ] Servidor local corriendo
- [ ] Usuario logueado (si aplica)
- [ ] Extensiones instaladas: WAVE, Accessibility Insights

---

## Criterios WCAG 2.1 AA por Principio

### POUR: Perceptible

#### 1.1.1 Contenido No Textual
- [ ] Todas las imágenes tienen `alt` descriptivo
- [ ] Iconos tienen `aria-label` o texto alternativo
- [ ] Videos tienen subtítulos (si hay contenido de audio)
- [ ] Gráficos complejos tienen descripción larga

#### 1.3.1 Información y Relaciones
- [ ] Uso correcto de `<header>`, `<nav>`, `<main>`, `<footer>`
- [ ] Tablas con `<th>` y `scope` apropiados
- [ ] Labels asociados a inputs (`for` + `id`)
- [ ] Grupos de form fields con `<fieldset>` y `<legend>`

#### 1.4.1 Uso del Color
- [ ] Color no es el único medio para transmitir información
- [ ] Links distinguibles por algo más que color
- [ ] Indicadores de error tienen icono + texto

#### 1.4.3 Contraste (Mínimo)
- [ ] Texto normal sobre fondo: ratio ≥ 4.5:1
- [ ] Texto grande (18px+ o 14px bold): ratio ≥ 3:1
- [ ] Componentes de interfaz: ratio ≥ 3:1

#### 1.4.4 Redimensionar Texto
- [ ] Texto se escala hasta 200% sin pérdida de contenido
- [ ] No hay overflow horizontal en containers

#### 1.4.10 Reflujo
- [ ] Contenido en columna única a 320px de ancho
- [ ] No hay pérdida de información a 320px

#### 1.4.11 Contraste en Componentes UI
- [ ] Elementos interactivos: ratio ≥ 3:1 contra fondo adyacente
- [ ] Focus visible: ratio ≥ 3:1 contra fondo adyacente

#### 1.4.12 Espaciado del Texto
- [ ] Altura de línea ≥ 1.5 para body text
- [ ] Espaciado entre letras ≥ 0.12em
- [ ] Espaciado entre palabras ≥ 0.16em

#### 1.4.13 Contenido en Hover o Focus
- [ ] Contenido adicional puede ser dismissible
- [ ] Contenido adicional es persistente (hover/focus)
- [ ] Contenido adicional no oscurece otros contenidos

---

### POUR: Operable

#### 2.1.1 Teclado
- [ ] Todas las funciones accesibles por mouse tienen equivalente teclado
- [ ] No hay traps de teclado
- [ ] Shortcuts no interfieren con lectores de pantalla

#### 2.1.2 Sin Trampas de Teclado
- [ ] Focus puede moverse a/desde todos los elementos
- [ ] Modales tienen forma de cerrar (Esc, botón)

#### 2.4.1 Ignorar Bloques
- [ ] Skip link para saltar navegación
- [ ] Skip link es visible cuando recibe focus

#### 2.4.2 Página con Título
- [ ] Título describe el propósito de la página
- [ ] Título es único entre páginas

#### 2.4.3 Focus en el Orden
- [ ] Orden de focus sigue el orden visual
- [ ] Orden tiene sentido lógico

#### 2.4.4 Propósito del Enlace
- [ ] Texto de enlace describe el destino
- [ ] Enlaces con mismo texto van al mismo destino
- [ ] Excepciones para enlaces técnicos documentadas

#### 2.4.6 Encabezados y Etiquetas
- [ ] Encabezados describen tema o propósito
- [ ] Labels describen el propósito del campo

#### 2.4.7 Focus Visible
- [ ] Focus indicator es visible
- [ ] Focus indicator no está oculto por otros elementos

---

### POUR: Comprensible

#### 3.1.1 Idioma de la Página
- [ ] `<html lang="es">` configurado

#### 3.2.1 Al Enfocar
- [ ] Cambios de contexto no automáticos al focus

#### 3.2.2 Al Entrar
- [ ] Cambios de contexto no automáticos al input

#### 3.3.1 Identificación de Errores
- [ ] Errores identificados en texto
- [ ] Errores describen el problema

#### 3.3.2 Etiquetas o Instrucciones
- [ ] Labels o instrucciones provistas cuando se requiere input

---

### POUR: Robusto

#### 4.1.1 Procesamiento
- [ ] HTML válido (no hay errores de parsing)
- [ ] Elementos tienen start y end tags completos
- [ ] Elementos anidados correctamente

#### 4.1.2 Nombre, Rol, Valor
- [ ] Componentes personalizados tienen nombre accesible
- [ ] Componentes personalizados tienen rol accesible
- [ ] Componentes editables muestran valor actual

---

## Testing Checklist

### Automatizado (axe-core)
- [ ] 0 violaciones wcag2a
- [ ] 0 violaciones wcag2aa
- [ ] 0 violaciones wcag21aa

### Manual
- [ ] Tab navigation completa
- [ ] Enter/Space activan botones
- [ ] Escape cierra modales
- [ ] Flechas navegan en selects
- [ ] Zoom 200% no rompe layout
- [ ] Dark mode legible

### Screen Reader (NVDA/VoiceOver)
- [ ] Navegación lógica por headings
- [ ] Form fields anuncian label + tipo
- [ ] Botones announces acción
- [ ] Modales announces title

---

## Reporte de Issues

| ID | Página | Criterio | Severidad | Descripción | Solución |
|----|--------|----------|-----------|-------------|----------|
| A11Y-001 | login.html | 1.4.3 | CRÍTICO | Contraste botón #primary | Cambiar a #0055aa |
| ... | | | | | |

---

## Sign-off

| Rol | Fecha | Firma |
|-----|-------|-------|
| FrontendTester | | |
| Revisor | | |
| QA | | |

---

*Documento actualizado: 2026-04-07*
