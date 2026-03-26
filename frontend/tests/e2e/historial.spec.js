import { test, expect } from '@playwright/test';

test.describe('Historial de Ventas - E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/historial.html');
    });

    test('should load historial page', async ({ page }) => {
        await expect(page.locator('h2')).toContainText('Historial de Ventas');
    });

    test('should display filters section', async ({ page }) => {
        await expect(page.locator('#formFiltros')).toBeVisible();
        await expect(page.locator('#filtroSearch')).toBeVisible();
        await expect(page.locator('#filtroProducto')).toBeVisible();
        await expect(page.locator('#filtroDesde')).toBeVisible();
        await expect(page.locator('#filtroHasta')).toBeVisible();
    });

    test('should display data table', async ({ page }) => {
        await expect(page.locator('.data-table')).toBeVisible();
        await expect(page.locator('thead')).toBeVisible();
        await expect(page.locator('tbody')).toBeVisible();
    });

    test('should display pagination controls', async ({ page }) => {
        await expect(page.locator('#pageSize')).toBeVisible();
        await expect(page.locator('#paginationNav')).toBeVisible();
    });

    test('should display export buttons', async ({ page }) => {
        await expect(page.locator('#exportGroup')).toBeVisible();
    });

    test('should have sortable columns', async ({ page }) => {
        const sortableHeaders = page.locator('th.sortable');
        await expect(sortableHeaders).toHaveCount(5);
    });

    test('should have select all checkbox', async ({ page }) => {
        await expect(page.locator('#selectAll')).toBeVisible();
    });

    test('should show/hide vendedor filter for admin', async ({ page }) => {
        await expect(page.locator('#filtroVendedorContainer')).toBeVisible();
    });
});

test.describe('Historial de Ventas - Exportación', () => {
    test('should open export dropdown menu', async ({ page }) => {
        await page.goto('http://localhost:3000/historial.html');
        
        await page.locator('#exportGroup .dropdown-toggle').click();
        
        await expect(page.locator('#exportGroup .dropdown-menu')).toBeVisible();
        await expect(page.locator('#exportGroup .dropdown-menu')).toContainText('Excel');
        await expect(page.locator('#exportGroup .dropdown-menu')).toContainText('CSV');
        await expect(page.locator('#exportGroup .dropdown-menu')).toContainText('PDF');
    });
});

test.describe('Historial de Ventas - Responsive', () => {
    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('http://localhost:3000/historial.html');
        
        await expect(page.locator('.data-table')).toBeVisible();
        await expect(page.locator('#filtersCollapse')).toBeVisible();
    });

    test('should collapse filters on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('http://localhost:3000/historial.html');
        
        await page.locator('[data-bs-target="#filtersCollapse"]').click();
        
        await expect(page.locator('#filtersCollapse')).toHaveClass(/collapse/);
    });
});
