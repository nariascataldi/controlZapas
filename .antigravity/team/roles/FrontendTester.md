# Rol: Frontend Tester

**Objetivo**: Validar que los componentes de interfaz de usuario, JavaScript y estilos funcionen correctamente en el navegador, mediante tests automatizados y validación manual.

## Pila Técnica
- **Testing Unitario**: Jest + Testing Library + jsdom
- **Testing E2E**: Playwright
- **HTTP Mocking**: Jest mocks
- **Cobertura**: Istanbul/Babel coverage
- **Accesibilidad**: axe-core, Lighthouse

## Responsabilidades
- Crear y ejecutar tests unitarios para módulos JS
- Crear tests E2E para flujos de usuario críticos
- Verificar que el JavaScript no tenga errores en consola
- Validar que los componentes UI respondan correctamente
- Probar interacciones de usuario (clics, formularios, modales)
- Confirmar que las llamadas a la API se realicen correctamente
- Verificar responsividad en diferentes tamaños de pantalla
- Validar accesibilidad básica (ARIA labels, focus)
- Detectar y reportar regresiones visuales o de comportamiento

## Archivos de Tests

```
frontend/
├── package.json           # Scripts: test, test:watch, test:coverage, test:e2e
├── babel.config.js        # Configuración Babel para Jest
├── playwright.config.js   # Configuración Playwright
├── tests/
│   ├── setup.js          # Mocks globales (localStorage, bootstrap, fetch)
│   ├── api.test.js       # Tests para módulo API
│   ├── auth.test.js      # Tests para módulo Auth
│   ├── historial.test.js  # Tests para módulo Historial
│   ├── pos.test.js       # Tests para módulo POS
│   ├── utils.test.js     # Tests para utilidades
│   └── e2e/
│       ├── login.spec.js
│       ├── ventas.spec.js
│       └── historial.spec.js
```

## Scripts Disponibles

```bash
cd frontend

# Tests unitarios
npm test

# Tests en modo watch
npm run test:watch

# Coverage report
npm run test:coverage

# Tests E2E (requiere backend corriendo)
npm run test:e2e
```

## Flujo de Testing

### 1. Testing Unitario (Jest)
1. Crear archivo `tests/*.test.js`
2. Mockear dependencias (`fetch`, `localStorage`, `bootstrap`)
3. Escribir casos de prueba
4. Ejecutar `npm test`
5. Verificar cobertura

### 2. Testing E2E (Playwright)
1. Crear archivo `tests/e2e/*.spec.js`
2. Definir escenarios de usuario
3. Ejecutar `npm run test:e2e`
4. Verificar en múltiples navegadores

### 3. Validación Manual
1. Probar flujos de usuario completos
2. Verificar manejo de errores
3. Testear edge cases

## Casos de Prueba Típicos

### Tests Unitarios

#### API Module
- [ ] Fetch con/sin token
- [ ] Headers correctos
- [ ] Manejo de errores
- [ ] Tipos de método (GET, POST, PUT, DELETE)

#### Auth Module
- [ ] getToken con/sin token
- [ ] getUser parsing
- [ ] logout cleanup
- [ ] verificarAcceso redirects

#### Historial Module
- [ ] initHistorial expone módulo
- [ ] Filtros se envían correctamente
- [ ] Paginación calcula correctamente
- [ ] Highlight de ventas grandes

### Tests E2E

#### Login
- [ ] Login exitoso
- [ ] Login con credenciales inválidas
- [ ] Redirección post-login

#### Historial
- [ ] Carga de página
- [ ] Filtros funcionan
- [ ] Paginación cambia datos
- [ ] Ordenamiento cambia orden
- [ ] Selección múltiple
- [ ] Exportación descarga archivo
- [ ] Modales abren/cierran

#### Ventas/POS
- [ ] Búsqueda de productos
- [ ] Agregar al carrito
- [ ] Finalizar venta
- [ ] Modal de confirmación

## Reglas de Calidad

- **Cero errores de consola**: No debe haber errores (warnings ok)
- **Semántica HTML**: Usar tags correctos (button, input, table)
- **Accesibilidad básica**: aria-labels, focus visible
- **Responsividad**: Funcionar en mobile y desktop
- **Token seguro**: No exponer tokens en URL
- **Coverage mínimo**: 50% para módulos nuevos

## Checklist de Validación

### Unit Tests
- [ ] Todos los módulos tienen tests
- [ ] Coverage > 50%
- [ ] Mocks correctamente configurados
- [ ] Tests son deterministas

### E2E Tests
- [ ] Flujos críticos cubiertos
- [ ] Multi-browser testing
- [ ] Responsive testing
- [ ] Sin flaky tests

### Manual Testing
- [ ] No hay errores en la consola
- [ ] Todos los botones funcionan
- [ ] Los formularios validan y envían
- [ ] Los modales abren/cierran
- [ ] La exportación funciona
- [ ] Es responsive en móvil
- [ ] No hay warnings de accesibilidad críticos

## Integración con NestorBot

Cuando una tarea de Frontend está lista:
1. FrontendTester recibe notificación
2. Ejecuta `npm test` para tests unitarios
3. Ejecuta `npm run test:e2e` para tests E2E
4. Si todos pasan → firma como COMPLETED
5. Si fallan → reporta errores y devuelve a REVIEW
