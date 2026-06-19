// Small helper to build and download CSV files in the browser.
// Handles value escaping (commas, quotes, newlines) and prepends a UTF-8 BOM
// so Cyrillic text renders correctly when the file is opened in Excel.

function escapeCell(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// columns: array of { label, key } or { label, value: row => any }
// rows: array of plain objects
export function buildCsv(columns, rows, delimiter = ",") {
  const header = columns.map(col => escapeCell(col.label)).join(delimiter);
  const body = rows.map(row =>
    columns
      .map(col => {
        const cell = typeof col.value === "function" ? col.value(row) : row[col.key];
        return escapeCell(cell);
      })
      .join(delimiter)
  );
  return [header, ...body].join("\r\n");
}

export function downloadCsv(filename, csvContent) {
  const BOM = "﻿";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".csv") ? filename : filename + ".csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Convenience wrapper: build + download in one call.
export function exportToCsv(filename, columns, rows, delimiter = ",") {
  downloadCsv(filename, buildCsv(columns, rows, delimiter));
}
