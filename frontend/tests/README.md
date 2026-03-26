# Tests - Frontend controlZapas

## Estructura

```
tests/
├── setup.js              # Configuración global de Jest
├── api.test.js           # Tests para módulo API
├── auth.test.js          # Tests para módulo Auth
├── historial.test.js     # Tests para módulo Historial
├── e2e/
│   └── historial.spec.js # Tests E2E con Playwright
├── utils.test.js         # Tests para utilidades
└── pos.test.js           # Tests para POS
```

## Scripts Disponibles

```bash
# Ejecutar tests unitarios
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Generar coverage report
npm run test:coverage

# Ejecutar tests E2E
npm run test:e2e
```

## Requisitos

```bash
# Instalar dependencias
npm install
```

## Configuración

- **Jest**: `package.json` > `jest`
- **Babel**: `babel.config.js`
- **Playwright**: `playwright.config.js`

## Tips

1. Los mocks de `localStorage` y `bootstrap` están en `setup.js`
2. Para agregar nuevos tests, crea archivos `*.test.js`
3. Los tests E2E requieren que el servidor backend esté corriendo
