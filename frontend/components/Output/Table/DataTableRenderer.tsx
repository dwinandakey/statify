"use client";
import React, { useState, useId } from "react";
import { Download, Copy, Check } from "lucide-react";

interface ColumnHeader {
  header: string;
  key?: string;
  children?: ColumnHeader[];
  // Explicit colSpan - jika diset, akan override perhitungan dari children
  colSpan?: number;
  // isPlaceholder - jika true, kolom ini tidak akan di-render sebagai header
  // (sudah di-cover oleh colSpan dari kolom sebelumnya)
  // tapi tetap digunakan untuk data binding via key
  isPlaceholder?: boolean;
}

interface TableRowData {
  rowHeader: (string | null)[];
  [key: string]: unknown;
  children?: TableRowData[];
}

interface TableData {
  title: string;
  columnHeaders: ColumnHeader[];
  rows: TableRowData[];
  footer?: string | string[];
}

interface DataTableProps {
  data: string;
}

const DataTableRenderer: React.FC<DataTableProps> = ({ data }) => {
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const uid = useId();

  let parsedData: { tables: TableData[] };
  try {
    parsedData = JSON.parse(data);
  } catch {
    return <div className="text-destructive">Invalid JSON format</div>;
  }

  if (!parsedData.tables || !Array.isArray(parsedData.tables)) {
    return <div className="text-destructive">Invalid tables format</div>;
  }

  const getLeafColumnCount = (col: ColumnHeader): number => {
    if (!col.children || col.children.length === 0) return 1;
    return col.children.reduce(
      (sum, child) => sum + getLeafColumnCount(child),
      0
    );
  };

  const getMaxDepth = (columns: ColumnHeader[]): number => {
    let max = 1;
    columns.forEach((col) => {
      if (col.children && col.children.length > 0) {
        const depth = 1 + getMaxDepth(col.children);
        if (depth > max) max = depth;
      }
    });
    return max;
  };

  const buildColumnLevels = (columns: ColumnHeader[]) => {
    const maxLevel = getMaxDepth(columns);
    const levels: ColumnHeader[][] = Array.from({ length: maxLevel }, () => []);
    const traverse = (cols: ColumnHeader[], level: number) => {
      cols.forEach((col) => {
        // Skip placeholder columns - they are covered by colSpan from previous column
        if (!col.isPlaceholder) {
          levels[level].push(col);
        }
        if (col.children && col.children.length > 0) {
          traverse(col.children, level + 1);
        }
      });
    };
    traverse(columns, 0);
    return levels;
  };

  const renderColumnHeaderRow = (
    cols: ColumnHeader[],
    level: number,
    maxLevel: number
  ) => {
    return (
      <tr key={`col-header-${level}`}>
        {cols.map((col, idx) => {
          // Gunakan explicit colSpan jika ada, otherwise hitung dari children
          const colSpan = col.colSpan ?? getLeafColumnCount(col);
          const hasChildren = col.children && col.children.length > 0;
          const rowSpan = hasChildren ? 1 : maxLevel - level;
          return (
            <th
              key={`col-header-${level}-${idx}`}
              colSpan={colSpan}
              rowSpan={rowSpan}
              className="border border-border bg-muted px-2 py-1 text-center text-sm font-medium whitespace-nowrap"
            >
              {renderContent(col.header)}
            </th>
          );
        })}
      </tr>
    );
  };

  const getLeafColumnKeys = (cols: ColumnHeader[]): string[] => {
    const keys: string[] = [];
    const traverse = (col: ColumnHeader) => {
      if (!col.children || col.children.length === 0) {
        keys.push(col.key ?? col.header);
      } else {
        col.children.forEach((ch) => traverse(ch));
      }
    };
    cols.forEach((c) => traverse(c));
    return keys;
  };

  const computeMaxRowHeaderDepth = (rows: TableRowData[]): number => {
    let max = 0;
    rows.forEach((r) => {
      const len = Array.isArray(r.rowHeader) ? r.rowHeader.length : 0;
      if (len > max) max = len;
    });
    return max;
  };

  const propagateHeaders = (
    row: TableRowData,
    accumulated: (string | null)[]
  ): TableRowData[] => {
    if (!row) return [];
    const combined: (string | null)[] = [];

    const currentHeaders = Array.isArray(row.rowHeader) ? row.rowHeader : [];

    const length = Math.max(accumulated.length, currentHeaders.length);

    for (let i = 0; i < length; i++) {
      combined[i] = currentHeaders[i] ?? accumulated[i] ?? null;
    }

    if (row.children && row.children.length > 0) {
      const results: TableRowData[] = [];
      for (const child of row.children) {
        results.push(...propagateHeaders(child, combined));
      }
      return results;
    } else {
      return [{ ...row, rowHeader: combined }];
    }
  };

  const flattenRows = (rows: TableRowData[]): TableRowData[] => {
    if (!Array.isArray(rows)) return [];
    const result: TableRowData[] = [];
    for (const row of rows) {
      result.push(...propagateHeaders(row, []));
    }
    return result;
  };

  const renderRowHeaderCells = (
    row: TableRowData,
    rowIndex: number,
    flatRows: TableRowData[],
    rowHeaderCount: number
  ) => {
    const currentHeaders = row.rowHeader || [];
    const nonEmptyHeaders = currentHeaders.filter((h) => h !== null);

    if (rowHeaderCount === 2 && nonEmptyHeaders.length === 1) {
      const colIdx = 0;
      const current = currentHeaders[colIdx] ?? "";
      const prevRow = rowIndex > 0 ? flatRows[rowIndex - 1] : null;
      const prevHeaders = prevRow ? prevRow.rowHeader || [] : [];
      const prev = prevHeaders[colIdx] ?? null;

      const renderCell = rowIndex === 0 || current !== prev;
      if (!renderCell) {
        return null;
      }
      let rowSpan = 1;
      for (let next = rowIndex + 1; next < flatRows.length; next++) {
        const nextRow = flatRows[next];
        const nextHeaders = nextRow.rowHeader || [];
        const nextVal = nextHeaders[colIdx] ?? "";
        if (nextVal === current) rowSpan++;
        else break;
      }
      return (
        <th
          key={`rowheader-${rowIndex}-${colIdx}`}
          rowSpan={rowSpan}
          colSpan={2}
          className="border border-border bg-muted px-2 py-1 text-left text-sm font-normal whitespace-nowrap align-top"
        >
          {renderContent(current)}
        </th>
      );
    }

    return Array.from({ length: rowHeaderCount }, (_, colIdx) => {
      const current = currentHeaders[colIdx] ?? "";

      const prevRow = rowIndex > 0 ? flatRows[rowIndex - 1] : null;
      const prevHeaders = prevRow ? prevRow.rowHeader || [] : [];
      const prev = prevHeaders[colIdx] ?? null;

      // Check if any parent header changed — if so, must render new cell
      // even if this level's text is the same (e.g. same variable in different steps)
      const parentChanged =
        colIdx > 0 &&
        prevRow != null &&
        Array.from({ length: colIdx }, (_, k) => k).some(
          (k) => (currentHeaders[k] ?? "") !== (prevHeaders[k] ?? "")
        );

      const renderCell = rowIndex === 0 || current !== prev || parentChanged;
      if (!renderCell) {
        return null;
      }
      let rowSpan = 1;
      for (let next = rowIndex + 1; next < flatRows.length; next++) {
        const nextRow = flatRows[next];
        const nextHeaders = nextRow.rowHeader || [];
        const nextVal = nextHeaders[colIdx] ?? "";
        // Stop merging when any parent header changes
        const nextParentSame =
          colIdx === 0 ||
          Array.from({ length: colIdx }, (_, k) => k).every(
            (k) => (nextHeaders[k] ?? "") === (currentHeaders[k] ?? "")
          );
        if (nextVal === current && nextParentSame) rowSpan++;
        else break;
      }
      return (
        <th
          key={`rowheader-${rowIndex}-${colIdx}`}
          rowSpan={rowSpan}
          className="border border-border bg-muted px-2 py-1 text-left text-sm font-normal whitespace-nowrap align-top"
        >
          {renderContent(current)}
        </th>
      );
    });
  };

  const renderContent = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" && /<\/?(sup|sub)>/i.test(value)) {
      return <span dangerouslySetInnerHTML={{ __html: value }} />;
    }
    return value as React.ReactNode;
  };

  const cloneNodeWithInlineStyles = (source: HTMLElement): HTMLElement => {
    const clone = source.cloneNode(true) as HTMLElement;

    const applyStyles = (src: Element, dst: Element) => {
      if (!(dst instanceof HTMLElement)) return;
      const computed = window.getComputedStyle(src);
      const dstStyle = dst.style as CSSStyleDeclaration;
      for (const prop of Array.from(computed)) {
        try {
          dstStyle.setProperty(prop, computed.getPropertyValue(prop));
        } catch {}
      }

      if ((src as HTMLElement).tagName === "TABLE") {
        dstStyle.borderCollapse = "collapse";
        if (
          !dstStyle.backgroundColor ||
          dstStyle.backgroundColor === "transparent"
        ) {
          dstStyle.backgroundColor = "#ffffff";
        }
      }

      const srcChildren = Array.from(src.children);
      const dstChildren = Array.from(dst.children);
      for (let i = 0; i < srcChildren.length; i++) {
        if (dstChildren[i]) applyStyles(srcChildren[i], dstChildren[i]);
      }
    };

    applyStyles(source, clone);
    return clone;
  };

  const handleCopyTable = async (tableId: string) => {
    try {
      const table = document.getElementById(tableId) as HTMLTableElement | null;
      if (!table) return;

      const styledClone = cloneNodeWithInlineStyles(table);
      styledClone.style.borderCollapse = "collapse";
      styledClone.style.backgroundColor =
        styledClone.style.backgroundColor || "#ffffff";
      const html = styledClone.outerHTML;
      const plain = Array.from(table.querySelectorAll("tr"))
        .map((tr) =>
          Array.from(tr.cells)
            .map((c) => (c.textContent || "").trim())
            .join("\t")
        )
        .join("\n");

      const nav = navigator as Navigator & {
        clipboard?: {
          write?: (data: unknown[]) => Promise<void>;
          writeText?: (text: string) => Promise<void>;
        };
      };
      const ClipboardItemCtor = (
        window as unknown as {
          ClipboardItem?: new (data: Record<string, Blob>) => unknown;
        }
      ).ClipboardItem;

      if (ClipboardItemCtor && nav.clipboard?.write) {
        await nav.clipboard.write([
          new ClipboardItemCtor({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
      } else if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(plain);
      }

      setCopied((prev) => ({ ...prev, [tableId]: true }));
      setTimeout(
        () => setCopied((prev) => ({ ...prev, [tableId]: false })),
        2000
      );
    } catch (err) {
      console.warn("Copy table failed:", err);
    }
  };

  const handleDownloadTableSvg = async (tableId: string, fileName: string) => {
    const table = document.getElementById(tableId) as HTMLTableElement | null;
    if (!table) return;
    const rect = table.getBoundingClientRect();
    const padding = 16;
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);
    const cloned = cloneNodeWithInlineStyles(table);
    cloned.style.width = `${width}px`;
    cloned.style.height = `${height}px`;
    const wrapper = document.createElement("div");
    wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    wrapper.style.display = "inline-block";
    wrapper.style.background = "#ffffff";
    wrapper.style.boxSizing = "border-box";
    wrapper.style.padding = `${padding}px`;
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
    wrapper.appendChild(cloned);
    const svgWidth = width + padding * 2;
    const svgHeight = height + padding * 2;
    const svg =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">` +
      `<foreignObject width="100%" height="100%">${wrapper.outerHTML}</foreignObject>` +
      `</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {parsedData.tables.map((table, tableIndex) => {
        const { title, columnHeaders, rows } = table;
        const levels = buildColumnLevels(columnHeaders);
        const maxDepth = getMaxDepth(columnHeaders);
        const flatRows = flattenRows(rows);
        if (flatRows.length === 0) return null;
        const rowHeaderCount = computeMaxRowHeaderDepth(flatRows);
        const allLeafCols = getLeafColumnKeys(columnHeaders);
        const leafCols =
          rowHeaderCount > 0 ? allLeafCols.slice(rowHeaderCount) : allLeafCols;
        const tableDomId = `data-table-${uid}-${tableIndex}`;
        return (
          <div key={tableIndex} className="mb-4">
            <div className="flex items-center justify-end gap-2 mb-2">
              <button
                className="p-2 bg-white rounded-md shadow-sm hover:bg-gray-100"
                onClick={() => handleCopyTable(tableDomId)}
                title="Copy table"
                type="button"
              >
                {copied[tableDomId] ? (
                  <Check className="w-4 h-4 inline-block mr-1" />
                ) : (
                  <Copy className="w-4 h-4 inline-block mr-1" />
                )}
                <span className="text-xs">
                  {copied[tableDomId] ? "Copied" : "Copy"}
                </span>
              </button>
              <button
                className="p-2 bg-white rounded-md shadow-sm hover:bg-gray-100"
                onClick={() =>
                  handleDownloadTableSvg(
                    tableDomId,
                    `table-${tableIndex + 1}.svg`
                  )
                }
                title="Download as SVG"
                type="button"
              >
                <Download className="w-4 h-4 inline-block mr-1" />
                <span className="text-xs">SVG</span>
              </button>
            </div>
            <table
              id={tableDomId}
              className="border-collapse border border-border text-sm rounded-md min-w-max"
            >
              <thead>
                <tr>
                  <th
                    colSpan={Math.max(1, rowHeaderCount + leafCols.length)}
                    className="border border-border bg-muted px-2 py-2 text-center font-semibold"
                  >
                    {renderContent(title)}
                  </th>
                </tr>
                {levels.map((cols, lvlIndex) =>
                  renderColumnHeaderRow(cols, lvlIndex, maxDepth)
                )}
              </thead>
              <tbody>
                {flatRows.map((row, rowIndex) => {
                  const allDataNull = leafCols.every(
                    (k) => row[k] === null || row[k] === undefined
                  );
                  const headers = row.rowHeader || [];
                  if (allDataNull && headers.every((h) => h !== ""))
                    return null;
                  return (
                    <tr key={rowIndex}>
                      {renderRowHeaderCells(
                        row,
                        rowIndex,
                        flatRows,
                        rowHeaderCount
                      )}
                      {leafCols.map((colKey, i) => (
                        <td
                          key={i}
                          className="border border-border px-2 py-1 text-center text-sm whitespace-nowrap"
                        >
                          {renderContent(row[colKey] ?? "")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>

              {table.footer && (
                <tfoot>
                  {(() => {
                    const lines: string[] =
                      typeof table.footer === "string"
                        ? table.footer.split("\n")
                        : Array.isArray(table.footer)
                        ? table.footer
                        : [];

                    return (
                      <tr>
                        <td
                          colSpan={Math.max(
                            1,
                            rowHeaderCount + leafCols.length
                          )}
                          className="border-0 border-t border-border px-3 py-2 text-left text-xs text-muted-foreground leading-5"
                        >
                          {lines.map((line, idx) => (
                            <p key={`footer-line-${idx}`}>
                              {renderContent(line)}
                            </p>
                          ))}
                        </td>
                      </tr>
                    );
                  })()}
                </tfoot>
              )}
            </table>
          </div>
        );
      })}
    </div>
  );
};

export default DataTableRenderer;
