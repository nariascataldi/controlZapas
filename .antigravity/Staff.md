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
│   ├── js/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── historial.js
│   │   ├── pos.js
│   │   ├── dashboard.js
│   │   └── ...
│   ├── tests/
│   │   ├── setup.js
│   │   ├── api.test.js
│   │   ├── auth.test.js
│   │   ├── historial.test.js
│   │   └── e2e/
│   │       └── historial.spec.js
│   ├── package.json
│   ├── playwright.config.js
│   ├── styles.css
│   ├── index.html
│   ├── historial.html
│   ├── ventas.html
│   ├── dashboard.html
│   ├── stock.html
│   ├── vendedores.html
│   └── login.html
│
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── ventas.js
│   │   ├── productos.js
│   │   ├── usuarios.js
│   │   ├── export.js
│   │   └── stats.js
│   ├── tests/
│   │   ├── setup.js
│   │   ├── auth.test.js
│   │   ├── ventas.test.js
│   │   ├── productos.test.js
│   │   └── usuarios.test.js
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

# Testing Stack

## Backend Testing

```bash
cd backend
npm test                    # Ejecutar tests
npm run test:watch         # Modo watch
```

- Jest + Supertest
- Tests de integración para APIs
- Coverage automático

## Frontend Testing

```bash
cd frontend
npm install                # Instalar dependencias
npm test                   # Tests unitarios
npm run test:e2e          # Tests E2E (requiere backend)
```

- Jest + Testing Library (unit tests)
- Playwright (E2E tests)
- Mocks: localStorage, fetch, bootstrap

---

# Roles

Administrador

* login por usuario
* controla stock y precios (mayorista/minorista)
* ve tablero y ganancias
* crea vendedores y gestiona comisiones
* ve historial por vendedor y por cliente
* exporta reportes (Excel, CSV, PDF)

Vendedor

* login por usuario
* consulta stock y precios
* registra ventas
* envía disponibilidad por WhatsApp
* ve su propio historial y comisiones

---

# Testing Roles (NestorBot)

## API Tester
* Tests de integración para backend
* Validación de endpoints REST

## Frontend Tester
* Tests unitarios para módulos JS
* Tests E2E para flujos de usuario
* Validación de UI y responsividad

---