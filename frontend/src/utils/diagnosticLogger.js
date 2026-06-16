/**
 * Diagnostic Logger Utility
 * Provides formatted console output for debugging the update flow
 */

class DiagnosticLogger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }

  // Formatted section header
  section(title) {
    const line = '═'.repeat(60);
    console.log(`\n${line}`);
    console.log(`  ▶ ${title}`);
    console.log(`${line}\n`);
    this.logs.push(`SECTION: ${title}`);
  }

  // Success log
  success(label, value) {
    console.log(`  ✅ ${label}:`, value);
    this.logs.push(`SUCCESS: ${label} = ${JSON.stringify(value)}`);
  }

  // Error log
  error(label, value) {
    console.error(`  ❌ ${label}:`, value);
    this.logs.push(`ERROR: ${label} = ${JSON.stringify(value)}`);
  }

  // Warning log
  warning(label, value) {
    console.warn(`  ⚠️  ${label}:`, value);
    this.logs.push(`WARNING: ${label} = ${JSON.stringify(value)}`);
  }

  // Info log
  info(label, value) {
    console.log(`  ℹ️  ${label}:`, value);
    this.logs.push(`INFO: ${label} = ${JSON.stringify(value)}`);
  }

  // Pending log
  pending(label) {
    console.log(`  ⏳ ${label}...`);
    this.logs.push(`PENDING: ${label}`);
  }

  // Table output
  table(label, data) {
    console.log(`\n  📊 ${label}:`);
    console.table(data);
    this.logs.push(`TABLE: ${label}`);
  }

  // JSON output
  json(label, data) {
    console.log(`\n  📋 ${label}:`);
    console.log(JSON.stringify(data, null, 2));
    this.logs.push(`JSON: ${label}`);
  }

  // Divider
  divider() {
    console.log(`  ${'─'.repeat(56)}\n`);
  }

  // Complete log
  complete(success = true) {
    const elapsed = Date.now() - this.startTime;
    const status = success ? '✅ COMPLETED' : '❌ FAILED';
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${status} (${elapsed}ms)`);
    console.log(`${'═'.repeat(60)}\n`);
  }

  // Get all logs
  getAllLogs() {
    return this.logs;
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = new DiagnosticLogger();
