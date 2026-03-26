#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime

TEAM_DIR = ".antigravity/team"
ROLES_DIR = ".antigravity/team/roles"

def init_team():
    """Inicializa la infraestructura del equipo."""
    os.makedirs(f"{TEAM_DIR}/mailbox", exist_ok=True)
    os.makedirs(f"{TEAM_DIR}/locks", exist_ok=True)
    os.makedirs(f"{TEAM_DIR}/logs", exist_ok=True)
    
    tasks_path = f"{TEAM_DIR}/tasks.json"
    if not os.path.exists(tasks_path):
        with open(tasks_path, 'w') as f:
            json.dump({"tasks": [], "members": ["Nestorbot"]}, f, indent=2)
        print(f"✓ Creado {tasks_path}")
            
    presence_path = f"{TEAM_DIR}/presence.json"
    if not os.path.exists(presence_path):
        with open(presence_path, 'w') as f:
            json.dump({"Nestorbot": "online"}, f, indent=2)
        print(f"✓ Creado {presence_path}")
            
    if not os.path.exists(f"{TEAM_DIR}/broadcast.msg"):
        with open(f"{TEAM_DIR}/broadcast.msg", 'w') as f: f.write("")
        
    if not os.path.exists(f"{TEAM_DIR}/decisions.log"):
        with open(f"{TEAM_DIR}/decisions.log", 'w') as f: f.write("")
    
    if os.path.exists(ROLES_DIR):
        roles = [f.replace('.md', '') for f in os.listdir(ROLES_DIR) if f.endswith('.md')]
        print(f"✓ Roles detectados: {', '.join(roles)}")
    
    print("✓ Infraestructura 'Equipo Nestorbot' lista.")

def assign_task(title, assigned_to, deps=None, priority="MEDIUM", details=""):
    """Asigna una nueva tarea con soporte para dependencias."""
    path = f"{TEAM_DIR}/tasks.json"
    
    with open(path, 'r') as f:
        data = json.load(f)
    
    task = {
        "id": len(data["tasks"]) + 1,
        "title": title,
        "status": "PENDING",
        "priority": priority,
        "assigned_to": assigned_to,
        "dependencies": deps or [],
        "plan_approved": False,
        "details": details,
        "created_at": datetime.now().isoformat(),
        "created_by": "Nestorbot"
    }
    data["tasks"].append(task)
    
    if assigned_to not in data["members"]:
        data["members"].append(assigned_to)
    
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✓ Tarea #{task['id']} asignada a {assigned_to}")
    return task["id"]

def list_tasks(status=None, member=None):
    """Lista tareas, opcionalmente filtradas por estado o miembro."""
    path = f"{TEAM_DIR}/tasks.json"
    
    with open(path, 'r') as f:
        data = json.load(f)
    
    tasks = data["tasks"]
    
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    if member:
        tasks = [t for t in tasks if t["assigned_to"] == member]
    
    if not tasks:
        print("No hay tareas que coincidan con los filtros.")
        return
    
    print(f"\n{'='*80}")
    print(f"{'#':<4} {'STATUS':<14} {'PRIORITY':<10} {'ASIGNADO':<16} TAREA")
    print(f"{'='*80}")
    
    for t in sorted(tasks, key=lambda x: (x["status"] != "COMPLETED", x["id"])):
        status_icon = {
            "PENDING": "⏳",
            "IN_PROGRESS": "🔄",
            "COMPLETED": "✅",
            "BLOCKED": "🚫",
            "REVIEW": "👀",
            "APPROVED": "👍"
        }.get(t["status"], "○")
        priority = t.get("priority", "MEDIUM")
        
        print(f"{t['id']:<4} {status_icon} {t['status']:<12} {priority:<10} {t['assigned_to']:<16} {t['title'][:40]}")
    
    print(f"{'='*80}")
    print(f"Total: {len(tasks)} tarea(s)")

def update_task(task_id, new_status):
    """Actualiza el estado de una tarea."""
    path = f"{TEAM_DIR}/tasks.json"
    
    with open(path, 'r') as f:
        data = json.load(f)
    
    found = False
    old_status = None
    for t in data["tasks"]:
        if t["id"] == task_id:
            old_status = t["status"]
            t["status"] = new_status
            t["updated_at"] = datetime.now().isoformat()
            found = True
            break
    
    if not found:
        print(f"✗ Tarea #{task_id} no encontrada.")
        return
    
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✓ Tarea #{task_id}: {old_status} → {new_status}")

def complete_task(task_id):
    """Marca una tarea como completada."""
    update_task(task_id, "COMPLETED")

def get_status():
    """Muestra dashboard del equipo."""
    path = f"{TEAM_DIR}/tasks.json"
    
    with open(path, 'r') as f:
        data = json.load(f)
    
    tasks = data["tasks"]
    
    print(f"\n{'='*60}")
    print("  📊 DASHBOARD - EQUIPO NESTORBOT")
    print(f"{'='*60}")
    
    statuses = {}
    priorities = {}
    members = {}
    
    for t in tasks:
        statuses[t["status"]] = statuses.get(t["status"], 0) + 1
        priority = t.get("priority", "MEDIUM")
        priorities[priority] = priorities.get(priority, 0) + 1
        members[t["assigned_to"]] = members.get(t["assigned_to"], 0) + 1
    
    print("\n📋 Por Estado:")
    for s, count in sorted(statuses.items()):
        icon = {"COMPLETED": "✅", "IN_PROGRESS": "🔄", "PENDING": "⏳", "BLOCKED": "🚫"}.get(s, "○")
        print(f"  {icon} {s}: {count}")
    
    print("\n🔥 Por Prioridad:")
    for p, count in sorted(priorities.items()):
        print(f"  • {p}: {count}")
    
    print("\n👥 Por Miembro:")
    for m, count in sorted(members.items()):
        print(f"  • {m}: {count}")
    
    total = len(tasks)
    completed = statuses.get("COMPLETED", 0)
    progress = (completed / total * 100) if total > 0 else 0
    
    print(f"\n📈 Progreso: {completed}/{total} ({progress:.1f}%)")
    print(f"{'='*60}\n")

def broadcast(sender, text):
    """Envía un mensaje a todos los miembros del equipo."""
    msg = {
        "de": sender,
        "tipo": "BROADCAST",
        "mensaje": text,
        "timestamp": datetime.now().isoformat()
    }
    with open(f"{TEAM_DIR}/broadcast.msg", 'a') as f:
        f.write(json.dumps(msg) + "\n")
    print(f"✓ Broadcast de {sender} enviado.")

def send_message(sender, receiver, text):
    """Envía un mensaje al buzón de un agente específico."""
    os.makedirs(f"{TEAM_DIR}/mailbox", exist_ok=True)
    msg = {
        "de": sender,
        "mensaje": text,
        "timestamp": datetime.now().isoformat()
    }
    with open(f"{TEAM_DIR}/mailbox/{receiver}.msg", 'a') as f:
        f.write(json.dumps(msg) + "\n")
    print(f"✓ Mensaje para {receiver} guardado.")

def update_presence(member, status):
    """Actualiza el estado de presencia de un miembro."""
    path = f"{TEAM_DIR}/presence.json"
    
    with open(path, 'r') as f:
        data = json.load(f)
    
    data[member] = status
    
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✓ {member} → {status}")

def show_presence():
    """Muestra el estado de presencia del equipo."""
    path = f"{TEAM_DIR}/presence.json"
    
    with open(path, 'r') as f:
        data = json.load(f)
    
    print("\n👥 PRESENCIA DEL EQUIPO:")
    print("-" * 40)
    
    icons = {
        "online": "🟢",
        "working": "🔵",
        "planning": "🟡",
        "idle": "⚪",
        "blocked": "🔴",
        "offline": "⚫"
    }
    
    for member, status in sorted(data.items()):
        icon = icons.get(status, "○")
        print(f"  {icon} {member}: {status}")

def help():
    """Muestra la ayuda del script."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║              NESTORBOT - TEAM MANAGER v2.0                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  USO: python team_manager.py <comando> [opciones]           ║
║                                                              ║
║  COMANDOS:                                                  ║
║                                                              ║
║  init              Inicializa la infraestructura del equipo   ║
║                                                              ║
║  list              Lista todas las tareas                    ║
║    --status=STATUS Filtrar por estado                        ║
║    --member=NAME   Filtrar por miembro                      ║
║                                                              ║
║  status            Muestra dashboard del equipo               ║
║                                                              ║
║  assign <title> <to>                                       ║
║    --deps=1,2      Dependencias                             ║
║    --priority=HIGH Prioridad (HIGH/MEDIUM/LOW)              ║
║                                                              ║
║  update <id> <status> Actualiza estado de tarea             ║
║                                                              ║
║  complete <id>      Marca tarea como completada              ║
║                                                              ║
║  presence           Muestra presencia del equipo              ║
║                                                              ║
║  broadcast <from> <msg> Envía mensaje global                 ║
║                                                              ║
║  msg <from> <to> <msg> Envía mensaje a un miembro          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")

def parse_args():
    """Parse command line arguments."""
    args = {}
    for arg in sys.argv[2:]:
        if '=' in arg:
            key, value = arg.split('=', 1)
            args[key.lstrip('--')] = value
    return args

if __name__ == "__main__":
    if len(sys.argv) < 2:
        help()
        sys.exit(1)
    
    cmd = sys.argv[1]
    args = parse_args()
    
    if cmd == "init":
        init_team()
    elif cmd == "list":
        list_tasks(status=args.get('status'), member=args.get('member'))
    elif cmd == "status":
        get_status()
    elif cmd == "presence":
        show_presence()
    elif cmd == "help":
        help()
    elif cmd == "assign":
        if len(sys.argv) < 4:
            print("Uso: assign <title> <assigned_to> [--deps=1,2] [--priority=HIGH]")
            sys.exit(1)
        title = sys.argv[2]
        assigned_to = sys.argv[3]
        deps = args.get('deps', '')
        deps_list = list(map(int, deps.split(','))) if deps else []
        priority = args.get('priority', 'MEDIUM')
        assign_task(title, assigned_to, deps_list, priority)
    elif cmd == "update":
        if len(sys.argv) < 4:
            print("Uso: update <task_id> <new_status>")
            sys.exit(1)
        update_task(int(sys.argv[2]), sys.argv[3])
    elif cmd == "complete":
        if len(sys.argv) < 3:
            print("Uso: complete <task_id>")
            sys.exit(1)
        complete_task(int(sys.argv[2]))
    elif cmd == "broadcast":
        if len(sys.argv) < 4:
            print("Uso: broadcast <sender> <mensaje>")
            sys.exit(1)
        broadcast(sys.argv[2], ' '.join(sys.argv[3:]))
    elif cmd == "msg":
        if len(sys.argv) < 5:
            print("Uso: msg <from> <to> <mensaje>")
            sys.exit(1)
        send_message(sys.argv[2], sys.argv[3], ' '.join(sys.argv[4:]))
    else:
        print(f"Comando desconocido: {cmd}")
        help()
