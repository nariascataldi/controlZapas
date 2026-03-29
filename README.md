# Control Zapas

Sistema de gestión de stock y ventas para tienda de zapatillas.

## Tecnologías

| Componente | Tecnología  |
|------------|-------------|
| Frontend   | Bootstrap   |
| Backend    | Node.js     |
| API        | Express     |
| Database   | SQLite      |

## Arquitectura

```mermaid
graph TD
    A[Cliente] --> B[Frontend Bootstrap]
    B --> C[API Express]
    C --> D[(SQLite)]
    C --> E[WhatsApp]
```

## Modelo de Datos

```mermaid
erDiagram
    CLIENTE ||--o{ VENTA : "realiza"
    USUARIO ||--o{ VENTA : "registra"
    VENTA ||--|{ ITEM_VENTA : "contiene"
    PRODUCTO ||--o{ VARIANTE : "tiene"
    VARIANTE ||--o{ ITEM_VENTA : "incluye"
    VARIANTE ||--|| INVENTARIO : "stock"
```

## Git Workflow

```mermaid
gitGraph
    commit id: "init"
    branch feature
    checkout feature
    commit id: "feature"
    checkout main
    merge feature id: "merge"
    branch develop
    checkout develop
    commit id: "dev"
    checkout main
    merge develop id: "release"
```

## Roles

| Rol        | Acceso | Funciones                              |
|------------|--------|----------------------------------------|
| Administrador | PC   | Dashboard, stock, precios, vendedores  |
| Vendedor   | Móvil  | Ventas, consulta stock, WhatsApp       |

## Instalación

```bash
npm install
npm start
```
## Ejecución Local

1. `npm start` en la carpeta backend
2. Abrir `http://localhost:3000`
