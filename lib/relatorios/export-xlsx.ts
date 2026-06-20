import XLSX from "xlsx-js-style";

export interface ExportToXLSXOptions {
  sheetName?: string;
  currencyCols?: string[]; // Header names or indexes that should be formatted as R$
  totalRowIndexes?: number[]; // 0-based indices of the rows (excluding headers) that represent totals
}

/**
 * Shared utility to export data to a formatted Excel (.xlsx) file.
 * Features:
 * - Autocreated worksheet and workbook
 * - Header style: Slate-700 background, bold white text, centered, vertical padding
 * - Zebra rows: Alternating white and light gray (Slate-50) rows
 * - Currency formatting (R$) for values with custom formatting or auto-detected by header name
 * - Auto-adjusted column widths
 * - Highlighted total rows (Slate-200, bold text)
 */
export function exportToXLSX(
  filename: string,
  headers: string[],
  rows: any[][],
  options: ExportToXLSXOptions = {}
) {
  const { sheetName = "Relatório", currencyCols = [], totalRowIndexes = [] } = options;

  // Initialize workbook
  const wb = XLSX.utils.book_new();

  // Create 2D array: headers as row 0, followed by data rows
  const data: any[][] = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Styles definition
  const headerStyle = {
    fill: { fgColor: { rgb: "334155" } }, // Slate 700
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { vertical: "center", horizontal: "center", wrapText: true },
    border: {
      bottom: { style: "medium", color: { rgb: "1E293B" } }
    }
  };

  const zebraStyle = {
    fill: { fgColor: { rgb: "F8FAFC" } }, // Slate 50
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center" }
  };

  const normalStyle = {
    fill: { fgColor: { rgb: "FFFFFF" } },
    font: { name: "Calibri", sz: 11 },
    alignment: { vertical: "center" }
  };

  const totalStyle = {
    fill: { fgColor: { rgb: "E2E8F0" } }, // Slate 200
    font: { name: "Calibri", sz: 11, bold: true },
    alignment: { vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "94A3B8" } },
      bottom: { style: "double", color: { rgb: "475569" } }
    }
  };

  // Initial column widths based on headers
  const colWidths: number[] = headers.map((h) => Math.max(h?.toString().length + 4, 12));

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");

  for (let r = range.s.r; r <= range.e.r; r++) {
    const isHeader = r === 0;
    const isTotal = !isHeader && totalRowIndexes.includes(r - 1);
    const isZebra = !isHeader && !isTotal && r % 2 === 0;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      let cell = ws[cellRef];

      // Create empty cell if none exists
      if (!cell) {
        ws[cellRef] = { t: "s", v: "" };
        cell = ws[cellRef];
      }

      // Determine text alignment
      let horizontalAlign = "left";
      if (isHeader) {
        horizontalAlign = "center";
      } else if (typeof cell.v === "number") {
        horizontalAlign = "right";
      }

      // Assign style template
      let currentStyle = normalStyle;
      if (isHeader) {
        currentStyle = headerStyle;
      } else if (isTotal) {
        currentStyle = totalStyle;
      } else if (isZebra) {
        currentStyle = zebraStyle;
      }

      // Set styles on cell
      cell.s = {
        ...currentStyle,
        alignment: {
          ...currentStyle.alignment,
          horizontal: horizontalAlign,
        },
      };

      // Currency formatting logic
      if (!isHeader && typeof cell.v === "number") {
        const headerName = headers[c]?.toLowerCase() || "";
        const isCurrency =
          currencyCols.includes(headers[c]) ||
          currencyCols.includes(c.toString()) ||
          /(valor|total|faturamento|receita|custo|saldo|ticket|receber|pagar|preco|entradas|saidas|resultado|comissao)/i.test(headerName);

        if (isCurrency) {
          cell.t = "n"; // Ensure cell type is numeric in Excel
          cell.z = `"R$ "#,##0.00;[Red]("-R$ "#,##0.00);"-"`; // Excel currency format string
        }
      }

      // Update column width based on content length
      if (cell.v !== undefined && cell.v !== null) {
        let textLen = cell.v.toString().length;
        if (cell.z) {
          textLen += 8; // Estimate padding for currency formatting characters
        }
        if (textLen > colWidths[c]) {
          colWidths[c] = textLen + 3;
        }
      }
    }
  }

  // Set column widths
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));

  // Set row heights
  ws["!rows"] = Array.from({ length: range.e.r + 1 }).map((_, r) => ({
    hpx: r === 0 ? 32 : 22,
  }));

  // Append worksheet and trigger download
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });

  function s2ab(s: string) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xff;
    }
    return buf;
  }

  const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
