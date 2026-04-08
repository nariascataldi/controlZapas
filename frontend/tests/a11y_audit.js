import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = [
  { name: 'login.html', path: '/login.html' },
  { name: 'index.html', path: '/index.html' },
  { name: 'stock.html', path: '/stock.html' },
  { name: 'ventas.html', path: '/ventas.html' },
  { name: 'historial.html', path: '/historial.html' },
  { name: 'dashboard.html', path: '/dashboard.html' },
  { name: 'vendedores.html', path: '/vendedores.html' }
];

const results = {
  timestamp: new Date().toISOString(),
  summary: { total: 0, passed: 0, failed: 0, violations: 0 },
  pages: []
};

async function auditPage(browser, pageConfig) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const url = `file://${__dirname}${pageConfig.path}`;
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    const axeBuilder = new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
    
    const axeResults = await axeBuilder.analyze();
    
    const violations = axeResults.violations || [];
    const criticalSeverities = violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    
    const pageResult = {
      name: pageConfig.name,
      url,
      passed: violations.length === 0,
      violations: violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
        targets: v.nodes.map(n => n.target)
      })),
      summary: {
        total: violations.length,
        critical: violations.filter(v => v.impact === 'critical').length,
        serious: violations.filter(v => v.impact === 'serious').length,
        moderate: violations.filter(v => v.impact === 'moderate').length,
        minor: violations.filter(v => v.impact === 'minor').length
      }
    };
    
    await context.close();
    return pageResult;
    
  } catch (error) {
    await context.close();
    return {
      name: pageConfig.name,
      url: `file://${__dirname}${pageConfig.path}`,
      passed: false,
      error: error.message,
      violations: [],
      summary: { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 }
    };
  }
}

async function main() {
  console.log('🔍 Auditoría A11y - Control Zapas\n');
  console.log('WCAG 2.1 AA + WCAG 2.1 AAA\n');
  
  const browser = await chromium.launch({ headless: true });
  
  for (const pageConfig of PAGES) {
    process.stdout.write(`Auditando ${pageConfig.name}... `);
    const result = await auditPage(browser, pageConfig);
    results.pages.push(result);
    results.summary.total++;
    
    if (result.passed) {
      results.summary.passed++;
      console.log('✅ PASS');
    } else {
      results.summary.failed++;
      results.summary.violations += result.summary.total;
      console.log(`❌ ${result.summary.total} violaciones`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
  }
  
  await browser.close();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMEN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total páginas: ${results.summary.total}`);
  console.log(`Aprobadas: ${results.summary.passed}`);
  console.log(`Con violaciones: ${results.summary.failed}`);
  console.log(`Total violaciones: ${results.summary.violations}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const failedPages = results.pages.filter(p => !p.passed);
  if (failedPages.length > 0) {
    console.log('\n📋 DETALLE DE VIOLACIONES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const page of failedPages) {
      console.log(`\n🔴 ${page.name}`);
      for (const violation of page.violations) {
        console.log(`   [${violation.impact.toUpperCase()}] ${violation.id}`);
        console.log(`   ${violation.description}`);
        console.log(`   Impacto en ${violation.nodes} nodo(s)`);
      }
    }
  }
  
  const reportPath = path.join(__dirname, '..', '.antigravity', 'a11y', 'A11Y_AUDIT_REPORT.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte guardado: ${reportPath}`);
  
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

main().catch(console.error);
