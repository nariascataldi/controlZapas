# Skill: Equipo Nestorbot (Multi-Agente)

Esta habilidad permite a Antigravity coordinar un equipo de agentes inteligentes trabajando en paralelo sobre el mismo proyecto, replicando la funcionalidad de "Agent Teams" de Claude Code.

---

## Configuración del Entorno

El equipo utiliza una carpeta oculta en la raíz del proyecto para comunicarse:

`.antigravity/team/`
├── `tasks.json` → Lista maestra de tareas, estados y dependencias
├── `presence.json` → Estado de agentes activos
├── `broadcast.msg` → Mensajes globales
├── `mailbox/` → Mensajes individuales (.msg)
├── `locks/` → Semáforos de edición
├── `logs/` → Historial de ejecución
└── `decisions.log` → Memoria estratégica del equipo

---

## Roles del Equipo

Los roles están definidos dinámicamente en: `.antigravity/team/roles/`

Cada archivo contiene el **Objetivo**, la **Pila Técnica** y las **Responsabilidades** específicas de cada agente para que actúen según el stack definido en `Staff.md`.

1. **[Director (Nestorbot)](file:///team/roles/Director.md)**
   Estrategia global, división de tareas y aprobaciones.

2. **[Arquitecto](file:///team/roles/Arquitecto.md)**
   Estructura, patrones y esquema PostgreSQL.

3. **[Especialista Frontend](file:///team/roles/Frontend.md)**
   UI/UX premium con Bootstrap y Vanilla JS.

4. **[Especialista Backend](file:///team/roles/Backend.md)**
   Node.js, Express y lógica de servidor.

5. **[Especialista DB](file:///team/roles/DB.md)**
   PostgreSQL, migraciones, queries optimizadas.

6. **[Marketer / Copywriter](file:///team/roles/Marketer.md)**
   Branding, mensajes de ventas y WhatsApp.

7. **[Investigador](file:///team/roles/Investigador.md)**
   Búsqueda de información y análisis tecnológico.

8. **[Revisor (Devil's Advocate)](file:///team/roles/Revisor.md)**
   Crítica constructiva y detección de bugs.

9. **[QA Tester](file:///team/roles/QA.md)**
   Validación funcional y testing.

10. **[Security Auditor](file:///team/roles/Security.md)**
    Vulnerabilidades y malas prácticas.

11. **[Executor](file:///team/roles/Executor.md)**
    Scripts y automatización.

12. **[Memory Manager](file:///team/roles/Memory.md)**
    Coherencia de contexto y documentación.

---

## Estados de Tareas

Cada tarea puede tener los siguientes estados:

- `PENDING`
- `PLANNING`
- `WAITING_APPROVAL`
- `APPROVED`
- `IN_PROGRESS`
- `BLOCKED`
- `REVIEW`
- `COMPLETED`

---

## Estructura tasks.json

```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Crear API base",
      "status": "PENDING",
      "priority": "HIGH",
      "assigned_to": "Backend",
      "dependencies": [],
      "plan_approved": false,
      "reviewer": "QA",
      "created_by": "Nestorbot"
    }
  ]
}
```

---

## Presence System (Agentes Activos)

`presence.json`

```json
{
  "Nestorbot": "online",
  "Arquitecto": "planning",
  "Backend": "working",
  "Marketer": "idle"
}
```

Estados posibles:

- `online`
- `planning`
- `working`
- `idle`
- `blocked`
- `offline`

---

## Protocolo de Orquestación Avanzada

### 1. Modo Planificación (Gatekeeping)

Antes de modificar código:

1. Agente crea Plan de Acción
2. Envía a Nestorbot
3. Estado = `WAITING_APPROVAL`
4. Nestorbot responde `APPROVED`
5. Agente pasa a `IN_PROGRESS`

---

### 2. Mensajería

- **Mensaje directo**: `mailbox/backend.msg`
- **Broadcast global**: `broadcast.msg`

---

### 3. Dependencias

Una tarea no puede empezar si:

`dependencies != COMPLETED`

---

### 4. Locks de Archivos

Antes de editar:
- Crear: `.antigravity/team/locks/file.lock`

Al terminar:
- Eliminar lock

---

## Modo de Ejecución del Equipo

El equipo puede trabajar en tres modos:

- **mode: SEQUENTIAL**
- **mode: PARALLEL**
- **mode: SWARM**

**SWARM**:
- Múltiples agentes trabajan en paralelo.
- Revisor elige la mejor solución.
- Se descartan las demás.

---

## Reglas Críticas

- Nunca editar con lock activo.
- Siempre enviar plan antes de ejecutar.
- Liberar locks al terminar.
- Actualizar estado de tarea.
- Notificar a Nestorbot.

---

## Script de Orquestación (team_manager.py)

Este script automatiza la gestión del equipo.

```python
import json
import os
import sys

TEAM_DIR = ".antigravity/team"

def init_team():
    """Inicializa la infraestructura del equipo."""
    os.makedirs(f"{TEAM_DIR}/mailbox", exist_ok=True)
    os.makedirs(f"{TEAM_DIR}/locks", exist_ok=True)
    os.makedirs(f"{TEAM_DIR}/logs", exist_ok=True)
    
    tasks_path = f"{TEAM_DIR}/tasks.json"
    if not os.path.exists(tasks_path):
        with open(tasks_path, 'w') as f:
            json.dump({"tasks": [], "members": []}, f, indent=2)
            
    presence_path = f"{TEAM_DIR}/presence.json"
    if not os.path.exists(presence_path):
        with open(presence_path, 'w') as f:
            json.dump({}, f, indent=2)
            
    if not os.path.exists(f"{TEAM_DIR}/broadcast.msg"):
        with open(f"{TEAM_DIR}/broadcast.msg", 'w') as f: f.write("")
        
    if not os.path.exists(f"{TEAM_DIR}/decisions.log"):
        with open(f"{TEAM_DIR}/decisions.log", 'w') as f: f.write("")

    print("✓ Infraestructura 'Equipo Nestorbot' lista.")

def assign_task(title, assigned_to, deps=[]):
    """Asigna una nueva tarea con soporte para dependencias."""
    path = f"{TEAM_DIR}/tasks.json"
    with open(path, 'r+') as f:
        data = json.load(f)
        task = {
            "id": len(data["tasks"]) + 1,
            "title": title,
            "status": "PENDING",
            "plan_approved": False,
            "assigned_to": assigned_to,
            "dependencies": deps
        }
        data["tasks"].append(task)
        f.seek(0)
        json.dump(data, f, indent=2)
    print(f"✓ Tarea {task['id']} ({title}) asignada a {assigned_to}.")

def broadcast(sender, text):
    """Envía un mensaje a todos los miembros del equipo."""
    msg = {"de": sender, "tipo": "BROADCAST", "mensaje": text}
    with open(f"{TEAM_DIR}/broadcast.msg", 'a') as f:
        f.write(json.dumps(msg) + "\n")
    print(f"✓ Mensaje global enviado por {sender}.")

def send_message(sender, receiver, text):
    """Envía un mensaje al buzón de un agente específico."""
    msg = {"de": sender, "mensaje": text}
    with open(f"{TEAM_DIR}/mailbox/{receiver}.msg", 'a') as f:
        f.write(json.dumps(msg) + "\n")
    print(f"✓ Mensaje enviado a {receiver}.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "init": init_team()
```

---

## Cómo usarlo

1. **Activa el Líder**: Pídele a Antigravity: *"Usa la habilidad Equipo Nestorbot para inicializar este proyecto"*.
2. **Reparte el trabajo**: **Nestorbot** dividirá el trabajo. Abre terminales nuevas para cada agente (Frontend, Marketer, etc.).
3. **Flujo de Planificación**: Los agentes envían sus planes a Nestorbot antes de empezar. Un equipo bien coordinado es imparable.
