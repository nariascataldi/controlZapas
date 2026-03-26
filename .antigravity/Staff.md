# 🧱 Stack

## 🎨 Frontend (PC + celular)

* HTML
* CSS
* JavaScript
* Bootstrap (responsive para celulares)

## ⚙️ Backend

* Node.js
* Express
* API REST

## 🗄️ Base de datos

* PostgreSQL

## ☁️ Hosting

* Versel / Render / Railway / VPS
* o servidor local con IP pública

---

# Arquitectura

```
Celulares vendedores
        │
        │ Internet
        ▼
Frontend (HTML/JS responsive)
        │
        ▼
API REST (Node + Express)
        │
        ▼
Base de datos (PostgreSQL)
        │
        ▼
PC Administrador (Dashboard)
```

---

# Funciones que permite

### Admin (PC)

* agregar zapatillas
* editar stock
* ver ventas
* ver tablero
* ver vendedores
* ver ganancias
* login por usuario
* comisión por vendedor
* historial por vendedor
* historial por cliente
* precios mayorista/minorista

### Vendedores (celular)

* login por usuario
* ver stock disponible (precios mayorista/minorista)
* buscar modelo
* registrar venta
* ver disponibilidad
* generar mensaje WhatsApp

---

# Estructura del proyecto

```
controlZapas/
│
├── frontend/
│   ├── index.html
│   ├── stock.html
│   ├── ventas.html
│   ├── dashboard.html
│   ├── login.html
│   ├── app.js
│   └── styles.css
│
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── stock.js
│   │   ├── ventas.js
│   │   └── users.js
│   │
│   └── database.db
```

---

# Tecnologías finales (mi recomendación)

## Frontend

* HTML
* CSS
* JavaScript
* Bootstrap

## Backend

* Node.js
* Express

## DB

* SQLite (perfecta para esto)

---

# Roles

Administrador

* login por usuario
* controla stock y precios (mayorista/minorista)
* ve tablero y ganancias
* crea vendedores y gestiona comisiones
* ve historial por vendedor y por cliente

Vendedor

* login por usuario
* consulta stock y precios
* registra ventas
* envía disponibilidad por WhatsApp
* ve su propio historial y comisiones

---