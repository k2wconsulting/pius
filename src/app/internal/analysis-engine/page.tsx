"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

/* ===================== Types ===================== */

type ColumnInfo = {
  name: string;
  isNumeric: boolean;
};

type Stats = {
  count: number;
  min: number;
  max: number;
  mean: number;
};

type HeaderValidation = {
  isValid: boolean;
  issues: string[];
};

/* ===================== Component ===================== */

export default function AnalysisEnginePage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  const [headerRow, setHeaderRow] = useState<number>(1);
  const [previewRows, setPreviewRows] = useState<any[][]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnInfo, setColumnInfo] = useState<ColumnInfo[]>([]);

  const [selectedNumericColumn, setSelectedNumericColumn] =
    useState<string>("");

  const [stats, setStats] = useState<Stats | null>(null);

  const [headerValidation, setHeaderValidation] =
    useState<HeaderValidation | null>(null);

  /* ===================== File Load ===================== */

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setPreviewRows([]);
    setColumns([]);
    setColumnInfo([]);
    setSelectedNumericColumn("");
    setStats(null);
    setHeaderValidation(null);

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Please upload an Excel file (.xlsx or .xls).");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        setError("No sheets found in this Excel file.");
        return;
      }

      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      setSelectedSheet(wb.SheetNames[0]);
    } catch (err: any) {
      setError(err?.message || "Failed to read Excel file.");
    }
  }

  /* ===================== Header Validation ===================== */

  function validateHeaderRow(header: any[]): HeaderValidation {
    const issues: string[] = [];
    const total = header.length;

    const numericCount = header.filter(
      c => c !== "" && !isNaN(Number(c))
    ).length;

    const emptyCount = header.filter(
      c => c === "" || c === null || c === undefined
    ).length;

    const uniqueValues = new Set(
      header.map(c => String(c).trim())
    );

    if (numericCount / total > 0.5) {
      issues.push("Header row appears to contain mostly numeric values.");
    }

    if (emptyCount / total > 0.3) {
      issues.push("Header row contains too many empty cells.");
    }

    if (uniqueValues.size !== header.length) {
      issues.push("Duplicate column names detected.");
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /* ===================== Preview + Schema ===================== */

  function updatePreviewAndSchema(
    sheetName: string,
    headerRowNum: number
  ) {
    if (!workbook) return;

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
    }) as any[][];

    const headerIndex = headerRowNum - 1;
    const header = rows[headerIndex] || [];
    const dataRows = rows.slice(headerIndex + 1);

    const preview = rows.slice(headerIndex, headerIndex + 5);
    setPreviewRows(preview);

    const validation = validateHeaderRow(header);
    setHeaderValidation(validation);

    if (!validation.isValid) {
      setColumns([]);
      setColumnInfo([]);
      setStats(null);
      setSelectedNumericColumn("");
      return;
    }

    const cleanedColumns = header.map((c: any, idx: number) =>
      c ? String(c).trim() : `Column_${idx + 1}`
    );

    setColumns(cleanedColumns);

    const info: ColumnInfo[] = cleanedColumns.map((col, colIdx) => {
      const values = dataRows
        .map(r => r[colIdx])
        .filter(v => v !== "" && v !== null && v !== undefined);

      const numericValues = values.filter(v => !isNaN(Number(v)));

      const isNumeric =
        numericValues.length > 0 &&
        numericValues.length / values.length >= 0.8;

      return { name: col, isNumeric };
    });

    setColumnInfo(info);
    setSelectedNumericColumn("");
    setStats(null);
  }

  /* ===================== Basic Stats ===================== */

  function runBasicStats() {
    if (!workbook || !selectedSheet || !selectedNumericColumn) return;

    const sheet = workbook.Sheets[selectedSheet];
    if (!sheet) return;

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
    }) as any[][];

    const dataStartIndex = headerRow;
    const colIndex = columns.indexOf(selectedNumericColumn);

    const values = rows
      .slice(dataStartIndex)
      .map(r => Number(r[colIndex]))
      .filter(v => !isNaN(v));

    if (values.length === 0) return;

    const count = values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean =
      values.reduce((a, b) => a + b, 0) / count;

    setStats({ count, min, max, mean });
  }

  /* ===================== UI ===================== */

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Analysis Engine (Internal)</h1>
      <p>Validated data ingestion and basic analysis engine.</p>

      <hr />

      <h3>Upload Excel</h3>
      <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />

      {fileName && <p>File: <strong>{fileName}</strong></p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {sheetNames.length > 0 && (
        <>
          <hr />

          <h3>Select Sheet</h3>
          <select
            value={selectedSheet}
            onChange={(e) => {
              const sheet = e.target.value;
              setSelectedSheet(sheet);
              updatePreviewAndSchema(sheet, headerRow);
            }}
          >
            {sheetNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <hr />

          <h3>Header Row</h3>
          <input
            type="number"
            min={1}
            value={headerRow}
            onChange={(e) => {
              const val = Number(e.target.value);
              setHeaderRow(val);
              updatePreviewAndSchema(selectedSheet, val);
            }}
          />

          {previewRows.length > 0 && (
            <>
              <hr />
              <h3>Preview</h3>
              <table border={1} cellPadding={6}>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, cidx) => (
                        <td key={cidx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {headerValidation && !headerValidation.isValid && (
            <>
              <hr />
              <h3 style={{ color: "orange" }}>
                Header Validation Warning
              </h3>
              <ul>
                {headerValidation.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
              <p>
                Please select the correct header row before proceeding
                with analysis.
              </p>
            </>
          )}

          {columnInfo.length > 0 && (
            <>
              <hr />
              <h3>Column Classification</h3>
              <ul>
                {columnInfo.map(col => (
                  <li key={col.name}>
                    {col.name} —{" "}
                    <strong>
                      {col.isNumeric ? "Numeric" : "Non-numeric"}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          )}

          {columnInfo.some(c => c.isNumeric) && (
            <>
              <hr />
              <h3>Basic Analysis</h3>

              <select
                value={selectedNumericColumn}
                onChange={(e) => {
                  setSelectedNumericColumn(e.target.value);
                  setStats(null);
                }}
              >
                <option value="">Select numeric column</option>
                {columnInfo
                  .filter(c => c.isNumeric)
                  .map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </select>

              <div style={{ marginTop: 12 }}>
                <button
                  onClick={runBasicStats}
                  disabled={!selectedNumericColumn}
                >
                  Run Basic Stats
                </button>
              </div>

              {stats && (
                <div style={{ marginTop: 16 }}>
                  <p>Count: <strong>{stats.count}</strong></p>
                  <p>Min: <strong>{stats.min}</strong></p>
                  <p>Max: <strong>{stats.max}</strong></p>
                  <p>Mean: <strong>{stats.mean.toFixed(3)}</strong></p>
                </div>
              )}
            </>
          )}
        </>
      )}

      <hr />
      <a href="/internal">← Back to Internal Tools</a>
    </main>
  );
}
