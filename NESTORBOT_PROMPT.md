# Prompt para Antigravity - Proyecto controlZapas

---

## ¿Qué es controlZapas?

**controlZapas** es un sistema web para gestionar el stock y ventas de una tienda de zapatillas. 

### Resumen Ejecutivo
- **Propósito**: Control de inventario, registro de ventas y cálculo de comisiones para una tienda de zapatillas.
- **Roles**: Administrador (gestión total desde PC) y Vendedor (ventas y consultas desde móvil).
- **Stack técnico**: HTML/CSS/JS + Bootstrap (frontend), Node.js/Express (backend), PostgreSQL (base de datos).
- **Integración**: Generación de mensajes de WhatsApp para disponibilidad y ventas.

---

## Modelo de Datos

### Entidades Principales

| Entidad | Campos clave | Relaciones |
|---------|-------------|------------|
| **Producto** | id, nombre, marca, precio_mayorista, precio_minorista | 1 Producto → N Variantes |
| **Variante** | id, producto_id, SKU, color, talla, stock_actual | Pertenece a Producto |
| **Venta** | id, fecha, cliente_id, vendedor_id, total, comision | Vincula Vendedor y Cliente |
| **Cliente** | id, nombre, contacto (WhatsApp/Email) | Historial de compras |
| **Usuario** | id, nombre, rol, password_hash, %_comision | Administradores y Vendedores |

### SKU Único
Cada variante de producto tiene un SKU único (ej: `ZAP-AD-42`, `ZAP-NK-38`).

---

## Funcionalidades por Rol

### Administrador (PC)
- Gestión de productos y variantes
- Control de stock y precios (mayorista/minorista)
- Dashboard con métricas de ventas y ganancias
- Gestión de vendedores y comisiones
- Historial por vendedor y por cliente
- Configuración de alertas de stock bajo

### Vendedor (Celular)
- Login por usuario
- Consulta de stock y precios
- Búsqueda de modelos por nombre o talla
- Registro de ventas
- Generación de mensajes WhatsApp predefinidos
- Ver su propio historial y comisiones

---

## Pantallas del Sistema

1. **Login** - Autenticación por usuario/contraseña
2. **Dashboard** - Widgets con ventas diarias, gráficos, stock crítico, ventas recientes
3. **Inventario/Productos** - Tabla con SKU, nombre, talla, color, stock, precios
4. **Formulario de Producto** - Crear/editar con variantes (colores, tallas)
5. **Ventas/POS** - Búsqueda, carrito, total, finalizar venta
6. **Historial de Ventas** - Tabla filtrable por fecha/cliente
7. **Reservas** - Lista de reservas activas con acciones
8. **Configuración** - Usuarios, roles, parámetros generales

---

## Mensajes de WhatsApp

### Plantillas

**Disponibilidad:**
> ¡Hola *[Nombre]*! Te confirmo que tenemos disponibles las *[Zapatillas]* en talla *[Talla]*. El precio es de *[Precio]*. ¿Te las reservo?

**Confirmación de Venta:**
> ¡Gracias por tu compra! Tu pedido de *[Producto]* ha sido registrado con éxito. ¡Que las disfrutes!

---

## Reglas de Negocio

- Cada variante requiere **SKU único**
- Campos obligatorios: nombre, SKU, precio, cantidad
- **Stock no puede ser negativo** - verificar antes de venta/reserva
- Niveles de alerta configurables por variante
- Reservas no pueden exceder stock existente
- Tallas válidas: 35-45

---

## Métricas del Dashboard

- Ventas totales (por período)
- Unidades vendidas
- Rotación de inventario
- Días de inventario
- Stock bajo/crítico
- Top productos
- Pedidos pendientes

---

# Cómo Usar el Multiagente NestorBot

NestorBot es el **Director** del equipo multi-agente que orquesta el desarrollo del proyecto.

## Inicialización

1. **Activa el equipo**: Pídele a Antigravity: *"Usa la habilidad Equipo Nestorbot para inicializar este proyecto"*
2. NestorBot leerá automáticamente:
   - `.antigravity/Staff.md` → Stack técnico
   - `.antigravity/SKILL.md` → Habilidad de equipo
   - Verificará `.antigravity/team/`
   - Revisión de `tasks.json`, `presence.json`, `decisions.log`

## Comandos Rápidos

| Comando | Acción |
|---------|--------|
| `inicializa el equipo` | Crea infraestructura en `.antigravity/team/` |
| `estado del equipo` | Muestra tareas activas y agentes online |
| `asigna tarea a [rol]` | Crea tarea en tasks.json para el rol indicado |
| `plan para [tarea]` | Genera plan de acción y lo envía a revisión |
| `reparte el trabajo` | Divide proyecto en tareas y asigna roles |
| `modo swarm` | Activa múltiples agentes en paralelo |

## Equipo de Agentes

El equipo tiene 12 roles especializados:

1. **Director (Nestorbot)** - Estrategia global, división de tareas, aprobaciones
2. **Arquitecto** - Estructura, patrones, esquema PostgreSQL
3. **Frontend** - UI/UX premium con Bootstrap y Vanilla JS
4. **Backend** - Node.js, Express, lógica de servidor
5. **DB** - PostgreSQL, migraciones, queries optimizadas
6. **Marketer** - Branding, mensajes de ventas y WhatsApp
7. **Investigador** - Búsqueda de información y análisis tecnológico
8. **Revisor** - Crítica constructiva y detección de bugs
9. **QA Tester** - Validación funcional y testing
10. **Security** - Vulnerabilidades y auditoría
11. **Executor** - Scripts y automatización
12. **Memory** - Coherencia de contexto y documentación

## Workflow Típico

```
Usuario → "Construye el sistema de login"
    │
    ▼
Nestorbot → 1. Lee Staff.md y SKILL.md
    │
    ▼
Nestorbot → 2. Divide en subtareas atómicas
    │        - Crear tabla users
    │        - Implementar endpoint /login
    │        - Crear UI login
    │        - Testing de autenticación
    │
    ▼
Nestorbot → 3. Asigna roles
    │        - DB → Crear tabla
    │        - Backend → Endpoint /login
    │        - Frontend → UI login
    │        - Security → Auditar auth
    │
    ▼
Agentes → 4. Envían planes para aprobación
    │
    ▼
Nestorbot → 5. Aprueba planes (APPROVED)
    │
    ▼
Agentes → 6. Ejecutan en paralelo
    │
    ▼
Nestorbot → 7. Monitorea y reporta progreso
    │
    ▼
Nestorbot → 8. Reporta resultado final
```

## Estados de Tareas

- `PENDING` → Esperando asignación
- `PLANNING` → Creando plan
- `WAITING_APPROVAL` → Esperando aprobación del Director
- `APPROVED` → Plan aprobado, listo para ejecutar
- `IN_PROGRESS` → En ejecución
- `BLOCKED` → Bloqueada por dependencias
- `REVIEW` → En revisión
- `COMPLETED` → Finalizada

## Infraestructura del Equipo

```
.antigravity/team/
├── tasks.json       → Lista de tareas con estados
├── presence.json    → Estado de agentes activos
├── broadcast.msg     → Mensajes globales
├── mailbox/          → Mensajes individuales
├── locks/           → Semáforos de edición
├── logs/            → Historial de ejecución
└── decisions.log    → Memoria estratégica
```

## Reglas Críticas

- **Nunca editar con lock activo**
- **Siempre enviar plan antes de ejecutar**
- **Liberar locks al terminar**
- **Actualizar estado de tarea**
- **Notificar a Nestorbot**
- Ningún agente trabaja sin plan aprobado

## Modos de Ejecución

| Modo | Descripción | Cuándo usarlo |
|------|-------------|---------------|
| **SEQUENTIAL** | Tareas una tras otra | Dependencias estrictas |
| **PARALLEL** | Múltiples agentes simultáneos | Tareas independientes |
| **SWARM** | Competencia de soluciones | Múltiples approaches válidos |

---

## Ejemplos de Uso

**Proyecto completo:**
> "Construye el sistema de control de stock"

**Solo frontend:**
> "Solo necesito el frontend del login"

**Pregunta rápida:**
> "¿En qué estado está la tarea de autenticación?"

**Recuperar contexto:**
> "Resúmeme el estado del proyecto"

---

## Archivos de Referencia

| Archivo | Propósito |
|---------|-----------|
| **README.md** | Documentación general del proyecto |
| **AGENT.md** | Manual del agente NestorBot |
| **.antigravity/SKILL.md** | Habilidad de equipo multi-agente |
| **.antigravity/Staff.md** | Stack técnico del proyecto |
| **.antigravity/team/roles/** | Definición de cada rol |
