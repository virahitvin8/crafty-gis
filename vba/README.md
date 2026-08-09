# FarmHealth — VBA Report Generator (Excel / LibreOffice)

A companion add-in to the FarmHealth web app. It imports the app's **CSV exports**
(Land Records, Analysis, Journal) into Excel and builds a formatted report:

- **Summary tiles** — total plots, plots with coordinates, survey numbers, owners
- **Data coverage table** — % of records filled for village / survey / owner / khata / motor / pipeline / electricity
- **Status column** added to your data — `Coordinates` vs `By village/district` (same rule as the web app)
- **NDVI / health colouring** — cells coloured with the app's exact health palette
- **Village summary + bar chart** — plots per village (chart is best-effort: on hosts that reject Excel chart enums, e.g. some LibreOffice builds, the summary table still appears)
- Detects `0,0` / non-numeric coordinates and flags them (they match by village, like the web app)
- Village-only rows (empty `lat`/`lng`) are fully counted — the report reads the whole used range, not just column A

Compatible with **Excel 2016 / Microsoft 365 (Windows & Mac)** and **LibreOffice Calc** (VBA-compatible subset). No UserForms, no Windows-only APIs except the optional file-picker (falls back gracefully).

---

## Install

### Excel (Windows)
1. Open any workbook (or a new blank one).
2. Press `Alt+F11` to open the VBA editor.
3. Menu **File → Import File…** → select `vba/farmhealth_report.bas`.
4. Close the editor. Now `Alt+F8` lists the macros.

### Excel (Mac)
1. `Tools → Macro → Visual Basic Editor` (or `Option+F11`).
2. **File → Import File…** → select `vba/farmhealth_report.bas`.

### LibreOffice Calc
1. `Tools → Macros → Organize Macros → Basic…`
2. **Import…** → select `vba/farmhealth_report.bas` → choose a library → **OK**.

> Tip for a reusable add-in: in Excel, save the workbook as `xlam` after importing the module, then load it via **File → Options → Add-ins → Excel Add-ins**.

---

## Usage — three macros

| Macro | What it does |
|---|---|
| `FarmHealth_ImportClipboard` | Paste CSV text copied from the web app (or anywhere) into real cells on the active sheet. |
| `FarmHealth_ImportCSVFile` | Pick a `.csv` file exported from the web app; imports it into a new sheet. |
| `FarmHealth_GenerateReport` | **Main report.** Reads the sheet with land-record headers (`lat,lng,survey,…`) and produces the `FarmHealth Report` sheet. |

### Step-by-step

1. **Get your data out of the web app:**
   - Land records: use the app's CSV export, or copy the rows from your spreadsheet.
   - Alternatively paste a CSV block on the clipboard and run `FarmHealth_ImportClipboard`.
2. **Run `FarmHealth_GenerateReport`** — it auto-detects the header row (it does **not** need to be row 1, but the first column header must be one of `lat`, `lng`, `survey`, `village`, `khata`, `owner`).
3. The report sheet appears with the summary + charts; your data sheet gains a **Status** column and colour flags.

### Expected column headers (all optional, case/space-insensitive)

```
lat, lng, survey, khata, owner, motor, pipeline, electricity, village, district, state, pincode
```

- Only **village** and/or **district** are required per row — coordinates are optional, exactly like the web app.
- Extra columns (e.g. `ndvi`, `health`) are recognised for colour coding.
- The header row is detected by its **first column** (must be one of `lat`, `lng`, `survey`, `village`, `khata`, `owner`) — keep any `id`/serial column after those, or rename the first column to one of the expected names.

### Notes

- `FarmHealth_ImportCSVFile` reads the file line-by-line (handles UTF-8, CRLF, BOM safely).
- Charts use Excel chart types; LibreOffice may silently skip the chart but always keeps the tally and summary tables.

---

## Notes & limits

- **LibreOffice**: the optional file-picker dialog may not be available — use
  `FarmHealth_ImportClipboard` or paste data directly. Conditional colours and
  the summary tables work in both; the bar chart is best-effort (Excel chart
  enums may be rejected and the chart silently skipped).
- **Mac**: the clipboard macro uses a Windows-only COM object, so prefer
  `FarmHealth_ImportCSVFile` or paste + `FarmHealth_GenerateReport` on Mac.
- The importer treats every non-empty line after the header as a data row
  (no comment rows — same rule as the web app).
- Deleting the old `FarmHealth Report` sheet is automatic; your data sheet is
  **never modified except** for the added `Status` column and colour fills.
