Attribute VB_Name = "FarmHealthReport"
' ═══════════════════════════════════════════════════════════════════════════
'  FarmHealth — VBA Report Generator Add-in
'  ───────────────────────────────────────────────────────────────────────────
'  Companion to the FarmHealth web app (https://fastidious-yeot-0c0d83.netlify.app).
'  Imports the app's CSV exports (Land Records, Analysis, Journal) and builds
'  a formatted Excel report: summary stats, health status flags, conditional
'  colouring, and charts.
'
'  COMPATIBILITY: Excel 2016 / Microsoft 365 on Windows & Mac, and LibreOffice
'  Calc Basic (VBA-compatible subset). No UserForms, no platform-specific APIs.
'
'  HOW TO INSTALL
'    1. Excel (Windows):  Alt+F11 → File → Import File → pick farmhealth_report.bas
'       Excel (Mac):      Tools → Macro → Visual Basic Editor → File → Import
'       LibreOffice:      Tools → Macros → Organize Macros → Basic → Import
'    2. Run macro  FarmHealth_GenerateReport  (button or Alt+F8).
'
'  HOW TO USE
'    A.  FarmHealth_ImportClipboard   — copy a CSV block in the app ("Copy as
'        CSV"), paste into this workbook, run. Header row auto-detected.
'    B.  FarmHealth_ImportCSVFile     — pick a .csv exported from the app.
'    C.  FarmHealth_GenerateReport    — reads the FIRST sheet with land-record
'        style headers and produces the "FarmHealth Report" sheet.
' ═══════════════════════════════════════════════════════════════════════════
Option Explicit

' ── Health colour palette (matches the web app's HEALTH_CLASSES) ───────────
Private Const COL_VERY_HEALTHY As String = "2E8B57"   ' dark green
Private Const COL_HEALTHY      As String = "46C46C"   ' green
Private Const COL_MODERATE     As String = "FFD93B"   ' yellow
Private Const COL_BELOW_AVG    As String = "FF9F1C"   ' orange
Private Const COL_POOR         As String = "FF5252"   ' red
Private Const COL_BARE_SOIL    As String = "9C6B30"   ' brown
Private Const COL_HEADER_BG    As String = "1F3B2C"   ' dark green header
Private Const COL_HEADER_FG    As String = "FFFFFF"   ' white text
Private Const COL_TILE_BG      As String = "F0F7F0"   ' light green tile
Private Const COL_TILE_EDGE    As String = "2E8B57"

' ═══════════════════════════════════════════════════════════════════════════
'  MAIN MACRO — generate the report from the active worksheet's data
' ═══════════════════════════════════════════════════════════════════════════
Public Sub FarmHealth_GenerateReport()
    On Error GoTo ErrHandler

    Dim ws As Worksheet
    Set ws = ActiveSheet
    If ws Is Nothing Then GoTo NoData

    Dim hdr As Long
    hdr = FindHeaderRow(ws)
    If hdr <= 0 Then GoTo NoData

    Dim dataFirst As Long, dataLast As Long
    dataFirst = hdr + 1
    ' Last row must come from the USED RANGE, not column A: village-only rows
    ' have empty lat/lng (columns A/B) and would be missed by End(xlUp) on A.
    dataLast = ws.UsedRange.Row + ws.UsedRange.Rows.Count - 1
    If dataLast < dataFirst Then GoTo NoData

    ' Build the report on a fresh sheet
    Dim rep As Worksheet
    DeleteOldReport
    Set rep = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
    rep.Name = "FarmHealth Report"

    ' ── 1. Title block ──
    With rep.Range("A1")
        .Value = "FarmHealth — Field & Land Report"
        .Font.Size = 16
        .Font.Bold = True
        .Font.Color = RGB(&H1F, &H3B, &H2C)
    End With
    rep.Range("A2").Value = "Generated: " & Format$(Date, "dd mmm yyyy") & "  ·  Source sheet: " & ws.Name
    rep.Range("A2").Font.Italic = True
    rep.Range("A2").Font.Color = RGB(96, 96, 96)

    ' ── 2. Summary tiles (4) ──
    Dim colLat As Long, colLng As Long, colVill As Long, colDist As Long
    Dim colSurvey As Long, colOwner As Long, colKhata As Long
    Dim colMotor As Long, colPipe As Long, colElec As Long
    colLat = FindCol(ws, hdr, "lat")
    colLng = FindCol(ws, hdr, "lng")
    colVill = FindCol(ws, hdr, "village")
    colDist = FindCol(ws, hdr, "district")
    colSurvey = FindCol(ws, hdr, "survey")
    colOwner = FindCol(ws, hdr, "owner")
    colKhata = FindCol(ws, hdr, "khata")
    colMotor = FindCol(ws, hdr, "motor")
    colPipe = FindCol(ws, hdr, "pipeline")
    colElec = FindCol(ws, hdr, "electricity")

    Dim n As Long
    n = dataLast - dataFirst + 1
    Dim withCoords As Long, withVillage As Long, withSurvey As Long, withOwner As Long
    Dim withMotor As Long, withPipe As Long, withElec As Long, invalidCoord As Long
    Dim r As Long

    For r = dataFirst To dataLast
        If Cell(ws, r, colLat) <> "" And Cell(ws, r, colLng) <> "" Then
            If IsNumeric(Cell(ws, r, colLat)) And IsNumeric(Cell(ws, r, colLng)) Then
                If Val(Cell(ws, r, colLat)) <> 0 And Val(Cell(ws, r, colLng)) <> 0 Then
                    withCoords = withCoords + 1
                Else
                    invalidCoord = invalidCoord + 1
                End If
            Else
                invalidCoord = invalidCoord + 1
            End If
        End If
        If Cell(ws, r, colVill) <> "" Then withVillage = withVillage + 1
        If Cell(ws, r, colSurvey) <> "" Then withSurvey = withSurvey + 1
        If Cell(ws, r, colOwner) <> "" Then withOwner = withOwner + 1
        If Cell(ws, r, colMotor) <> "" Then withMotor = withMotor + 1
        If Cell(ws, r, colPipe) <> "" Then withPipe = withPipe + 1
        If Cell(ws, r, colElec) <> "" Then withElec = withElec + 1
    Next r

    Dim tileRow As Long
    tileRow = 4
    DrawTile rep, tileRow, 1, "Total plots", CStr(n), "Rows imported from " & ws.Name
    DrawTile rep, tileRow, 4, "With coordinates", CStr(withCoords) & " / " & CStr(n), "Clickable on the satellite map"
    DrawTile rep, tileRow, 7, "With survey no.", CStr(withSurvey), "Khasra / survey numbers recorded"
    DrawTile rep, tileRow, 10, "With owner name", CStr(withOwner), "Owners from khatauni records"

    ' ── 3. Coverage detail table ──
    Dim dRow As Long
    dRow = 12
    With rep.Cells(dRow, 1)
        .Value = "Data coverage"
        .Font.Bold = True
        .Font.Size = 12
    End With

    Dim covHdr As Long
    covHdr = dRow + 1
    SetHeader rep.Cells(covHdr, 1), "Field"
    SetHeader rep.Cells(covHdr, 2), "Records filled"
    SetHeader rep.Cells(covHdr, 3), "Coverage %"

    Dim covData As Long
    covData = covHdr + 1
    WriteCoverageRow rep, covData, "Village / locality", withVillage, n
    WriteCoverageRow rep, covData + 1, "Survey / khasra number", withSurvey, n
    WriteCoverageRow rep, covData + 2, "Owner name", withOwner, n
    WriteCoverageRow rep, covData + 3, "Khata number", CountFilled(ws, dataFirst, dataLast, colKhata), n
    WriteCoverageRow rep, covData + 4, "Motor connection", withMotor, n
    WriteCoverageRow rep, covData + 5, "Water pipeline", withPipe, n
    WriteCoverageRow rep, covData + 6, "Electricity connection", withElec, n

    If invalidCoord > 0 Then
        rep.Cells(covData + 8, 1).Value = "⚠ " & CStr(invalidCoord) & " row(s) have 0,0 or non-numeric coordinates — treated as village-only matches (same as the web app)."
        rep.Cells(covData + 8, 1).Font.Color = RGB(&HC0, &H50, &H00)
        rep.Cells(covData + 8, 1).Font.Italic = True
    End If

    ' ── 4. Status flag column on the data itself (in place) ──
    Dim statusCol As Long
    statusCol = LastUsedCol(ws) + 1
    ws.Cells(hdr, statusCol).Value = "Status"
    SetHeader ws.Cells(hdr, statusCol), "Status"
    Dim sLat As String, sLng As String
    sLat = ColLetter(colLat): sLng = ColLetter(colLng)
    For r = dataFirst To dataLast
        If sLat <> "" And sLng <> "" Then
            ws.Cells(r, statusCol).Formula = _
                "=IF(OR(" & sLat & r & "=""""," & sLng & r & "=""""),""By village/district"",IF(AND(ISNUMBER(" & sLat & r & "),ISNUMBER(" & sLng & r & "),ABS(" & sLat & r & ")>0,ABS(" & sLng & r & ")>0),""Coordinates"",""Check data""))"
        Else
            ws.Cells(r, statusCol).Value = "By village/district"
        End If
    Next r
    ws.Columns(statusCol).ColumnWidth = 18

    ' ── 5. Conditional colouring (health classes) on the data sheet ──
    If FindCol(ws, hdr, "ndvi") > 0 Or FindCol(ws, hdr, "health") > 0 Then
        ColourHealthColumn ws, dataFirst, dataLast
    End If

    ' ── 6. Charts + village summary (placed below the coverage table) ──
    Dim nextRow As Long
    nextRow = NextFreeRow(rep)
    If colVill > 0 And withVillage > 0 Then
        nextRow = BuildVillageChart(rep, ws, hdr, dataFirst, dataLast, colVill, nextRow)
    End If
    If colVill > 0 Then
        BuildVillageSummary rep, ws, hdr, dataFirst, dataLast, colVill, colDist, colSurvey, nextRow
    End If

    ' ── 8. Finish ──
    rep.Columns("A:K").ColumnWidth = 20
    rep.Cells(1, 1).Select
    MsgBox "FarmHealth report generated. Data sheet now has a 'Status' column and colour flags.", vbInformation, "FarmHealth Report"
    Exit Sub

NoData:
    MsgBox "No data found. Copy the app's CSV export into this sheet first (header row required: lat, lng, survey, khata, owner, motor, pipeline, electricity, village, district, state, pincode).", vbExclamation, "FarmHealth Report"
    Exit Sub

ErrHandler:
    MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical, "FarmHealth Report"
End Sub

' ═══════════════════════════════════════════════════════════════════════════
'  IMPORT MACROS
' ═══════════════════════════════════════════════════════════════════════════

' Paste a CSV block copied from the web app (or any source) as real cells
Public Sub FarmHealth_ImportClipboard()
    On Error GoTo ErrHandler
    Dim ws As Worksheet
    Set ws = ActiveSheet
    Dim data As Variant
    data = ClipboardAsArray()
    If UBound(data) < 0 Then
        MsgBox "Clipboard does not contain text. In the web app use 'Copy as CSV', then try again.", vbExclamation, "FarmHealth"
        Exit Sub
    End If
    ws.Range(ws.Cells(1, 1), ws.Cells(UBound(data, 1), UBound(data, 2))).Value = data
    ws.Columns.AutoFit
    MsgBox "Imported " & CStr(UBound(data, 1)) & " row(s) x " & CStr(UBound(data, 2)) & " column(s). Run FarmHealth_GenerateReport to build the report.", vbInformation, "FarmHealth"
    Exit Sub
ErrHandler:
    MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical, "FarmHealth"
End Sub

' Pick a .csv file exported from the web app and import it into a new sheet
Public Sub FarmHealth_ImportCSVFile()
    On Error GoTo ErrHandler
    Dim f As String
    f = PickCSVFile()
    If f = "" Then Exit Sub

    Dim dest As Worksheet
    Set dest = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
    Dim q As Long
    q = OpenTextIntoSheet(dest, f)
    If q > 0 Then
        dest.Columns.AutoFit
        MsgBox "Imported " & CStr(q - 1) & " data row(s) from:" & vbCrLf & f, vbInformation, "FarmHealth"
    Else
        MsgBox "Could not import the file. Check that it is a comma-separated CSV with a header row.", vbExclamation, "FarmHealth"
    End If
    Exit Sub
ErrHandler:
    MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical, "FarmHealth"
End Sub

' ═══════════════════════════════════════════════════════════════════════════
'  HELPERS
' ═══════════════════════════════════════════════════════════════════════════

' Find the first row whose first cell is a header token (case-insensitive)
Private Function FindHeaderRow(ws As Worksheet) As Long
    Dim r As Long
    For r = 1 To 10
        Dim v As String
        v = LCase$(Trim$(CStr(ws.Cells(r, 1).Value)))
        If v = "lat" Or v = "lng" Or v = "survey" Or v = "village" Or v = "khata" Or v = "owner" Then
            FindHeaderRow = r
            Exit Function
        End If
    Next r
    FindHeaderRow = 0
End Function

' Find a column by header name (any row, case-insensitive, whitespace-stripped)
Private Function FindCol(ws As Worksheet, hdr As Long, name As String) As Long
    Dim target As String
    target = NormalizeKey(name)
    Dim c As Long
    For c = 1 To 40
        If NormalizeKey(CStr(ws.Cells(hdr, c).Value)) = target Then
            FindCol = c
            Exit Function
        End If
    Next c
    FindCol = 0
End Function

Private Function NormalizeKey(s As String) As String
    Dim t As String
    t = LCase$(s)
    Dim out As String
    out = ""
    Dim i As Long
    For i = 1 To Len(t)
        Dim ch As String
        ch = Mid$(t, i, 1)
        If ch >= "a" And ch <= "z" Or ch >= "0" And ch <= "9" Then out = out & ch
    Next i
    NormalizeKey = out
End Function

Private Function Cell(ws As Worksheet, r As Long, c As Long) As String
    If c <= 0 Then
        Cell = ""
    Else
        Cell = Trim$(CStr(ws.Cells(r, c).Value))
    End If
End Function

Private Function CountFilled(ws As Worksheet, first As Long, last As Long, col As Long) As Long
    Dim n As Long, r As Long
    n = 0
    If col > 0 Then
        For r = first To last
            If Cell(ws, r, col) <> "" Then n = n + 1
        Next r
    End If
    CountFilled = n
End Function

Private Function LastUsedCol(ws As Worksheet) As Long
    Dim c As Long
    c = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    If c < 1 Then c = 1
    LastUsedCol = c
End Function

Private Function ColLetter(c As Long) As String
    If c < 1 Then
        ColLetter = ""
        Exit Function
    End If
    Dim s As String
    s = ""
    Dim n As Long
    n = c
    Do While n > 0
        Dim m As Long
        m = (n - 1) Mod 26
        s = Chr$(65 + m) & s
        n = (n - 1) \ 26
    Loop
    ColLetter = s
End Function

Private Sub SetHeader(cell As Range, text As String)
    With cell
        .Value = text
        .Font.Bold = True
        .Font.Color = RGB(&HFF, &HFF, &HFF)
        .Interior.Color = RGB(&H1F, &H3B, &H2C)
        .Borders(xlEdgeBottom).LineStyle = xlContinuous
        .Borders(xlEdgeBottom).Weight = xlMedium
    End With
End Sub

Private Sub DrawTile(rep As Worksheet, row As Long, col As Long, label As String, value As String, sub As String)
    Dim c As Range
    Set c = rep.Cells(row, col)
    c.Value = label
    c.Font.Bold = True
    c.Font.Color = RGB(&H1F, &H3B, &H2C)
    c.Font.Size = 10
    With rep.Cells(row + 1, col)
        .Value = value
        .Font.Bold = True
        .Font.Size = 20
        .Font.Color = RGB(&H2E, &H8B, &H57)
    End With
    With rep.Cells(row + 2, col)
        .Value = sub
        .Font.Size = 8
        .Font.Italic = True
        .Font.Color = RGB(96, 96, 96)
    End With
    With rep.Range(rep.Cells(row, col), rep.Cells(row + 2, col + 2))
        .Interior.Color = RGB(&HF0, &HF7, &HF0)
        .Borders.LineStyle = xlContinuous
        .Borders.Color = RGB(&H2E, &H8B, &H57)
    End With
End Sub

Private Sub WriteCoverageRow(rep As Worksheet, r As Long, label As String, filled As Long, total As Long)
    rep.Cells(r, 1).Value = label
    rep.Cells(r, 2).Value = filled
    Dim pct As Double
    pct = 0
    If total > 0 Then pct = filled / total * 100
    rep.Cells(r, 3).Value = pct
    rep.Cells(r, 3).NumberFormat = "0.0""%"""
    ' colour the % cell
    Dim colr As Long
    If pct >= 90 Then
        colr = RGB(&H2E, &H8B, &H57)
    ElseIf pct >= 50 Then
        colr = RGB(&HE0, &H8B, &H00)
    Else
        colr = RGB(&HC0, &H40, &H40)
    End If
    rep.Cells(r, 3).Font.Color = colr
    rep.Cells(r, 3).Font.Bold = True
End Sub

' Colour the NDVI/health column cells according to the app's palette
Private Sub ColourHealthColumn(ws As Worksheet, first As Long, last As Long)
    Dim hdr As Long
    hdr = first - 1
    Dim colN As Long, colH As Long
    colN = FindCol(ws, hdr, "ndvi")
    colH = FindCol(ws, hdr, "health")
    Dim r As Long, v As Double
    For r = first To last
        Dim cellR As Range
        If colH > 0 Then
            Set cellR = ws.Cells(r, colH)
        ElseIf colN > 0 Then
            Set cellR = ws.Cells(r, colN)
        Else
            Exit For
        End If
        Dim raw As String
        raw = Trim$(CStr(cellR.Value))
        If IsNumeric(raw) Then
            v = Val(raw)
            Select Case True
                Case v < 0.15:  cellR.Interior.Color = RGB(&H9C, &H6B, &H30)
                Case v < 0.32:  cellR.Interior.Color = RGB(&HFF, &H52, &H52)
                Case v < 0.44:  cellR.Interior.Color = RGB(&HFF, &H9F, &H1C)
                Case v < 0.58:  cellR.Interior.Color = RGB(&HFF, &HD9, &H3B)
                Case v < 0.72:  cellR.Interior.Color = RGB(&H46, &HC4, &H6C)
                Case Else:      cellR.Interior.Color = RGB(&H2E, &H8B, &H57)
            End Select
        ElseIf raw = "poor" Or raw = "stressed" Or raw = "red" Then
            cellR.Interior.Color = RGB(&HFF, &H52, &H52)
        ElseIf raw = "moderate" Or raw = "yellow" Then
            cellR.Interior.Color = RGB(&HFF, &HD9, &H3B)
        ElseIf raw = "healthy" Or raw = "very healthy" Or raw = "green" Then
            cellR.Interior.Color = RGB(&H2E, &H8B, &H57)
        End If
    Next r
End Sub

' Bar chart: plots per village. Returns the next free report row.
' The chart itself is best-effort: if the host (e.g. LibreOffice) rejects the
' Excel chart enum, the tally table is still written and the report survives.
Private Function BuildVillageChart(rep As Worksheet, ws As Worksheet, hdr As Long, first As Long, last As Long, colVill As Long, startRow As Long) As Long
    ' Tally villages
    Dim dict As Object
    Set dict = CreateObject("Scripting.Dictionary")
    Dim r As Long, k As String
    For r = first To last
        k = Trim$(CStr(ws.Cells(r, colVill).Value))
        If k <> "" Then
            If dict.Exists(k) Then
                dict(k) = CLng(dict(k)) + 1
            Else
                dict.Add k, CLng(1)
            End If
        End If
    Next r

    ' Write tally table
    Dim tblStart As Long
    tblStart = startRow
    rep.Cells(tblStart, 1).Value = "Village"
    rep.Cells(tblStart, 2).Value = "Plots"
    Dim i As Long
    i = 1
    Dim kk As Variant
    For Each kk In dict.Keys
        rep.Cells(tblStart + i, 1).Value = CStr(kk)
        rep.Cells(tblStart + i, 2).Value = dict(kk)
        i = i + 1
    Next kk
    BuildVillageChart = tblStart + i + 1

    ' Chart is best-effort only — never let it kill the report
    On Error Resume Next
    Dim cht As Chart
    Set cht = rep.ChartObjects.Add(rep.Cells(tblStart + 1, 5).Left, rep.Cells(tblStart + 1, 5).Top, 340, 220).Chart
    cht.SetSourceData Source:=rep.Range(rep.Cells(tblStart, 1), rep.Cells(tblStart + i - 1, 2))
    cht.ChartType = xlColumnClustered
    cht.HasTitle = True
    cht.ChartTitle.Text = "Plots per village"
    On Error GoTo 0
End Function

' Small table: per-village record counts + survey coverage
Private Sub BuildVillageSummary(rep As Worksheet, ws As Worksheet, hdr As Long, first As Long, last As Long, colVill As Long, colDist As Long, colSurvey As Long, startRow As Long)
    Dim dict As Object
    Set dict = CreateObject("Scripting.Dictionary")
    Dim r As Long, k As String, dk As String, sk As String
    For r = first To last
        k = Trim$(CStr(ws.Cells(r, colVill).Value))
        If k = "" Then k = "(no village)"
        dk = ""
        If colDist > 0 Then dk = Trim$(CStr(ws.Cells(r, colDist).Value))
        sk = ""
        If colSurvey > 0 Then sk = Trim$(CStr(ws.Cells(r, colSurvey).Value))
        If Not dict.Exists(k) Then
            dict.Add k, Array(CLng(1), dk, IIf(sk <> "", 1, 0))
        Else
            Dim old As Variant
            old = dict(k)
            dict(k) = Array(CLng(old(0)) + 1, IIf(dk <> "", dk, old(1)), CLng(old(2)) + IIf(sk <> "", 1, 0))
        End If
    Next r

    Dim base As Long
    base = startRow
    rep.Cells(base, 1).Value = "Village summary"
    rep.Cells(base, 1).Font.Bold = True
    rep.Cells(base, 1).Font.Size = 12
    SetHeader rep.Cells(base + 1, 1), "Village"
    SetHeader rep.Cells(base + 1, 2), "District"
    SetHeader rep.Cells(base + 1, 3), "Plots"
    SetHeader rep.Cells(base + 1, 4), "With survey no."
    Dim i As Long
    i = 1
    Dim kk As Variant
    For Each kk In dict.Keys
        Dim vals As Variant
        vals = dict(kk)
        rep.Cells(base + 1 + i, 1).Value = CStr(kk)
        rep.Cells(base + 1 + i, 2).Value = CStr(vals(1))
        rep.Cells(base + 1 + i, 3).Value = CLng(vals(0))
        rep.Cells(base + 1 + i, 4).Value = CLng(vals(2))
        i = i + 1
    Next kk
End Sub

' Next empty row on a sheet (after the last used row, plus a 1-row gap)
Private Function NextFreeRow(ws As Worksheet) As Long
    Dim lastRow As Long
    lastRow = ws.UsedRange.Row + ws.UsedRange.Rows.Count - 1
    If lastRow < 1 Then lastRow = 1
    NextFreeRow = lastRow + 2
End Function

Private Sub DeleteOldReport()
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        If ws.Name = "FarmHealth Report" Then
            Application.DisplayAlerts = False
            ws.Delete
            Application.DisplayAlerts = True
            Exit Sub
        End If
    Next ws
End Sub

' Read the OS clipboard as a 2-D variant array (text only)
Private Function ClipboardAsArray() As Variant
    Dim dataObj As Object
    On Error GoTo NoClipboard
    Set dataObj = CreateObject("New:{1C3B4210-F441-11CE-B9EA-00AA006B1A69}")
    dataObj.GetFromClipboard
    Dim txt As String
    txt = dataObj.GetText
    If Len(txt) = 0 Then GoTo NoClipboard
    Dim lines As Variant
    lines = SplitLines(txt)
    If UBound(lines) < 0 Then GoTo NoClipboard
    Dim rows As Long
    rows = UBound(lines) + 1
    Dim cols As Long
    cols = 1
    Dim i As Long
    For i = 0 To UBound(lines)
        Dim parts As Variant
        parts = Split(lines(i), ",")
        If UBound(parts) + 1 > cols Then cols = UBound(parts) + 1
    Next i
    Dim out() As String
    ReDim out(0 To rows - 1, 0 To cols - 1)
    Dim r As Long, c As Long
    For r = 0 To rows - 1
        parts = Split(lines(r), ",")
        For c = 0 To cols - 1
            If c <= UBound(parts) Then out(r, c) = Trim$(parts(c)) Else out(r, c) = ""
        Next c
    Next r
    ClipboardAsArray = out
    Exit Function
NoClipboard:
    ClipboardAsArray = Array()
End Function

' Cross-platform line splitter (handles CRLF, LF, and lone CR)
Private Function SplitLines(txt As String) As Variant
    Dim t As String
    t = Replace$(txt, vbCrLf, vbLf)
    t = Replace$(t, vbCr, vbLf)
    SplitLines = Split(t, vbLf)
End Function

' File picker for a .csv file (works in Excel 2016/365 Win+Mac)
Private Function PickCSVFile() As String
    On Error GoTo NoDialog
    Dim fd As FileDialog
    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    fd.Title = "Select the CSV exported from FarmHealth"
    fd.Filters.Clear
    fd.Filters.Add "CSV files", "*.csv"
    If fd.Show = -1 Then
        PickCSVFile = fd.SelectedItems(1)
    Else
        PickCSVFile = ""
    End If
    Exit Function
NoDialog:
    PickCSVFile = ""
End Function

' Import a CSV file into a destination sheet (simple, portable parser)
Private Function OpenTextIntoSheet(dest As Worksheet, f As String) As Long
    On Error GoTo FailImport
    Dim ff As Integer
    ff = FreeFile
    ' Read line-by-line: LOF() is unreliable for text-mode files (Unicode/BOM)
    Dim all As String
    all = ""
    Open f For Input As #ff
    Do While Not EOF(ff)
        Dim oneLine As String
        Line Input #ff, oneLine
        all = all & oneLine & vbLf
    Loop
    Close #ff
    Dim lines As Variant
    lines = SplitLines(all)
    If UBound(lines) < 0 Then GoTo FailImport
    Dim rows As Long
    rows = UBound(lines) + 1
    Dim cols As Long
    cols = 1
    Dim i As Long
    For i = 0 To UBound(lines)
        Dim parts As Variant
        parts = Split(lines(i), ",")
        If UBound(parts) + 1 > cols Then cols = UBound(parts) + 1
    Next i
    Dim out() As String
    ReDim out(0 To rows - 1, 0 To cols - 1)
    Dim r As Long, c As Long
    For r = 0 To rows - 1
        parts = Split(lines(r), ",")
        For c = 0 To cols - 1
            If c <= UBound(parts) Then out(r, c) = Trim$(parts(c)) Else out(r, c) = ""
        Next c
    Next r
    dest.Range(dest.Cells(1, 1), dest.Cells(rows, cols)).Value = out
    OpenTextIntoSheet = rows
    Exit Function
FailImport:
    OpenTextIntoSheet = 0
End Function
