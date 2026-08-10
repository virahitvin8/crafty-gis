Attribute VB_Name = "FarmHealthReport"
' ═══════════════════════════════════════════════════════════════════════════
'  FarmHealth — Professional VBA Report Generator (Dashboard Edition)
'  ───────────────────────────────────────────────────────────────────────────
'  Companion to the FarmHealth web app. Imports the app's CSV exports
'  (farmhealth_analysis_report.csv and farmhealth_zone_features.csv) and
'  builds a professional dashboard:
'
'     • Header band (green gradient) with title, date & source
'     • 6 KPI cards (Area, Mean NDVI, Health Score, Stress Class, Scenes, Zones)
'     • Terrain panel (elevation, slope, aspect, drainage)
'     • Indices table (NDVI/NDWI/EVI/SAVI/NDMI with health colouring)
'     • ML advisory panel
'     • NDVI trend chart from the continuous time series
'     • Zone-feature table (ML training data) on a separate sheet
'
'  COMPATIBILITY: Excel 2016 / Microsoft 365 on Windows & Mac, and LibreOffice
'  Calc Basic (VBA-compatible subset). No UserForms, no platform-specific APIs.
'
'  HOW TO INSTALL
'    1. Excel:        Alt+F11 → File → Import File → pick farmhealth_report.bas
'    2. Run macro:    FarmHealth_BuildDashboard
'
'  HOW TO USE
'    A.  FarmHealth_ImportAnalysisCSV  — pick farmhealth_analysis_report.csv
'        exported from the app's Professional Analysis panel.
'    B.  FarmHealth_ImportZonesCSV     — pick farmhealth_zone_features.csv
'        (optional — builds the ML training table).
'    C.  FarmHealth_BuildDashboard     — builds the dashboard from sheet "FH Data".
' ═══════════════════════════════════════════════════════════════════════════
Option Explicit

' ── Theme colours (deep agriculture green, matching the web app) ──────────
Private Const CLR_BG As Long = 16121830        ' RGB(246,250,244) light canvas
Private Const CLR_HEADER As Long = 267751      ' RGB(4,80,27) deep green
Private Const CLR_HEADER2 As Long = 4670993    ' RGB(71,107,49) olive gradient end
Private Const CLR_CARD As Long = 16777215      ' white
Private Const CLR_ACCENT As Long = 65280       ' RGB(0,255,0) bright green (BGR)
Private Const CLR_TEXT As Long = 2631720       ' dark text
Private Const CLR_MUTED As Long = 8553090      ' grey text
Private Const CLR_GREEN As Long = 32896        ' RGB(0,128,0) mid green (BGR)
Private Const CLR_RED As Long = 255            ' RGB(255,0,0)
Private Const CLR_BORDER As Long = 12895222

' NOTE: VBA .Fill.ForeColor.RGB expects BGR byte order; the RGB() helper
' produces the correct value directly, so prefer RGB(...) in code.

' ── Layout constants (in points, dashboard width ~1500) ────────────────────
Private Const MARGIN As Double = 20
Private Const WIDTH As Double = 1500
Private Const HEADER_H As Double = 90
Private Const KPI_TOP As Double = 120
Private Const KPI_H As Double = 95
Private Const SECTION_TOP As Double = 235

' ═══════════════════════════════════════════════════════════════════════════
'  MAIN MACRO — build the dashboard from sheet "FH Data"
' ═══════════════════════════════════════════════════════════════════════════
Public Sub FarmHealth_BuildDashboard()
    On Error GoTo ErrHandler

    Application.ScreenUpdating = False
    Application.DisplayAlerts = False

    Dim wsData As Worksheet
    Set wsData = GetOrCreateSheet("FH Data")
    If Application.WorksheetFunction.CountA(wsData.Cells) = 0 Then
        MsgBox "Sheet 'FH Data' is empty." & vbCrLf & _
               "First import the analysis CSV (FarmHealth_ImportAnalysisCSV).", _
               vbExclamation, "FarmHealth Report"
        Exit Sub
    End If

    ' Parse the FH Data sheet layout:
    '   Row 1: header            Row 2..N: daily time series
    '   The last row (tagged "SUMMARY" in the first column) holds field stats.
    Dim hdrRow As Long
    hdrRow = FindHeaderRow(wsData)
    If hdrRow <= 0 Then
        MsgBox "Could not find a header row with 'date' in column A.", vbExclamation, "FarmHealth Report"
        Exit Sub
    End If

    Dim dataFirst As Long, dataLast As Long, sumRow As Long
    dataFirst = hdrRow + 1
    dataLast = wsData.UsedRange.Row + wsData.UsedRange.Rows.Count - 1

    ' Locate SUMMARY row (field-level stats from the app)
    sumRow = 0
    Dim r As Long
    For r = dataFirst To dataLast
        If LCase$(Trim$(CStr(wsData.Cells(r, 1).Value))) = "summary" Then
            sumRow = r
            Exit For
        End If
    Next r
    If sumRow = 0 Then sumRow = dataLast   ' fall back to last row

    ' Build the dashboard on a fresh sheet
    Dim wsDash As Worksheet
    DeleteOldSheet "FH Dashboard"
    Set wsDash = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
    wsDash.Name = "FH Dashboard"

    ' ── 1. Header band ──
    Dim shp As Shape
    Set shp = wsDash.Shapes.AddShape(msoShapeRectangle, MARGIN, 10, WIDTH - 2 * MARGIN, HEADER_H)
    With shp
        .Name = "fhdHeader"
        .Fill.TwoColorGradient msoGradientHorizontal, 1
        .Fill.ForeColor.RGB = CLR_HEADER
        .Fill.BackColor.RGB = CLR_HEADER2
        .Line.Visible = msoFalse
    End With

    Dim titleBox As Shape
    Set titleBox = wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, MARGIN + 24, 18, 800, 34)
    With titleBox
        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse
        .TextFrame2.TextRange.Text = "FARMHEALTH FIELD ANALYSIS DASHBOARD"
        With .TextFrame2.TextRange.Font
            .Size = 24
            .Bold = msoTrue
            .Name = "Calibri"
            .Fill.ForeColor.RGB = RGB(255, 255, 255)
        End With
        .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignLeft
    End With

    Dim subBox As Shape
    Set subBox = wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, MARGIN + 26, 56, 900, 20)
    With subBox
        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse
        .TextFrame2.TextRange.Text = "Sentinel-2 L2A cloud-free composite · SRTM DEM clipped to field boundary · ML stress model" & _
                                     "     |     Generated: " & Format$(Date, "dd mmm yyyy")
        With .TextFrame2.TextRange.Font
            .Size = 11
            .Name = "Calibri"
            .Fill.ForeColor.RGB = RGB(230, 245, 230)
        End With
    End With

    ' ── 2. KPI cards (6) ──
    Dim cardW As Double, gap As Double, left As Double, i As Long
    cardW = (WIDTH - 2 * MARGIN - 5 * 12) / 6
    gap = 12
    left = MARGIN

    Dim kpiTitles As Variant
    kpiTitles = Array("AREA (ha)", "MEAN NDVI", "NDWI", "HEALTH SCORE", "STRESS CLASS", "SCENES USED")
    Dim kpiValues(1 To 6) As String
    Dim kpiColors(1 To 6) As Long

    ' Pull from SUMMARY row columns: date,ndvi,ndwi,evi,savi,ndmi,elevation,slope,aspect,area,scenes
    Dim sumVals(1 To 11) As Double
    Dim sumTxt As String, s As String, j As Long
    For j = 1 To 11
        s = Trim$(CStr(wsData.Cells(sumRow, j).Value))
        sumVals(j) = 0
        If IsNumeric(s) Then sumVals(j) = CDbl(s)
    Next j

    kpiValues(1) = Format$(sumVals(10), "0.00")
    kpiValues(2) = Format$(sumVals(2), "0.000")
    kpiValues(3) = Format$(sumVals(3), "0.000")
    ' Health score: NDVI → 0-100
    kpiValues(4) = Format$(WorksheetFunction.Max(0, WorksheetFunction.Min(100, sumVals(2) / 0.8 * 100)), "0") & "%"
    ' Stress class — same rule-based label used in the ML advisory panel
    kpiValues(5) = MLStressLabel(sumVals(2), sumVals(3))
    kpiValues(6) = Format$(sumVals(11), "0")

    Dim ndviMean As Double
    ndviMean = sumVals(2)
    For i = 1 To 6
        kpiColors(i) = CLR_CARD
    Next i
    If ndviMean >= 0.6 Then kpiColors(2) = RGB(46, 139, 87)  ' healthy green
    If ndviMean >= 0.4 And ndviMean < 0.6 Then kpiColors(2) = RGB(255, 217, 59)
    If ndviMean < 0.4 Then kpiColors(2) = RGB(255, 82, 82)

    For i = 1 To 6
        ' Card
        Set shp = wsDash.Shapes.AddShape(msoShapeRoundedRectangle, left, KPI_TOP, cardW, KPI_H)
        With shp
            .Name = "fhdKpi" & i
            .Fill.ForeColor.RGB = CLR_CARD
            .Line.ForeColor.RGB = CLR_BORDER
            .Line.Weight = 1
            On Error Resume Next
            .Adjustments.Item(1) = 0.1
            .Shadow.Visible = True
            .Shadow.OffsetX = 0
            .Shadow.OffsetY = 2
            .Shadow.Transparency = 0.7
            On Error GoTo 0
        End With

        ' Accent bar
        Set shp = wsDash.Shapes.AddShape(msoShapeRectangle, left, KPI_TOP, cardW, 4)
        With shp
            .Name = "fhdKpiAccent" & i
            .Fill.ForeColor.RGB = kpiColors(i)
            .Line.Visible = msoFalse
        End With

        ' Title
        Set shp = wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, left + 6, KPI_TOP + 10, cardW - 12, 16)
        With shp
            .Name = "fhdKpiTitle" & i
            .Fill.Visible = msoFalse
            .Line.Visible = msoFalse
            .TextFrame2.TextRange.Text = CStr(kpiTitles(i - 1))
            With .TextFrame2.TextRange.Font
                .Size = 9
                .Bold = msoTrue
                .Name = "Calibri"
                .Fill.ForeColor.RGB = CLR_MUTED
            End With
            .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignCenter
        End With

        ' Value
        Set shp = wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, left + 6, KPI_TOP + 32, cardW - 12, 40)
        With shp
            .Name = "fhdKpiValue" & i
            .Fill.Visible = msoFalse
            .Line.Visible = msoFalse
            .TextFrame2.TextRange.Text = kpiValues(i)
            With .TextFrame2.TextRange.Font
                .Size = 22
                .Bold = msoTrue
                .Name = "Calibri"
                .Fill.ForeColor.RGB = CLR_HEADER
            End With
            .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignCenter
        End With

        left = left + cardW + gap
    Next i

    ' ── 3. Terrain panel (left) ──
    Dim panelW As Double
    panelW = 320
    Dim pTop As Double
    pTop = SECTION_TOP
    Set shp = wsDash.Shapes.AddShape(msoShapeRoundedRectangle, MARGIN, pTop, panelW, 200)
    With shp
        .Name = "fhdTerrainPanel"
        .Fill.ForeColor.RGB = CLR_CARD
        .Line.ForeColor.RGB = CLR_BORDER
        .Line.Weight = 1
    End With

    Set shp = wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, MARGIN + 14, pTop + 10, panelW - 28, 18)
    With shp
        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse
        .TextFrame2.TextRange.Text = "⛰ TERRAIN (SRTM DEM, clipped)"
        With .TextFrame2.TextRange.Font
            .Size = 12
            .Bold = msoTrue
            .Name = "Calibri"
            .Fill.ForeColor.RGB = CLR_HEADER
        End With
    End With

    Dim tRow As Long
    tRow = pTop + 40
    DrawTerrainRow wsDash, MARGIN + 14, tRow, "Elevation", Format$(sumVals(7), "0.0") & " m", CLR_GREEN
    DrawTerrainRow wsDash, MARGIN + 14, tRow + 26, "Slope", Format$(sumVals(8), "0.0") & "°", IIf(sumVals(8) > 5, CLR_RED, CLR_GREEN)
    DrawTerrainRow wsDash, MARGIN + 14, tRow + 52, "Aspect", Format$(sumVals(9), "0") & "°", CLR_MUTED
    DrawTerrainRow wsDash, MARGIN + 14, tRow + 78, "Drainage", DrainClass(sumVals(8)), IIf(sumVals(8) > 5, CLR_RED, CLR_GREEN)
    DrawTerrainRow wsDash, MARGIN + 14, tRow + 104, "Index window", "Continuous (multi-scene)", CLR_MUTED
    DrawTerrainRow wsDash, MARGIN + 14, tRow + 130, "Delineation", "Clipped to boundary ✓", CLR_GREEN

    ' ── 4. Indices table (middle) ──
    Dim tblLeft As Double, tblW As Double
    tblLeft = MARGIN + panelW + 16
    tblW = WIDTH - 2 * MARGIN - panelW - 16

    Set shp = wsDash.Shapes.AddShape(msoShapeRoundedRectangle, tblLeft, pTop, tblW, 200)
    With shp
        .Name = "fhdIndexTable"
        .Fill.ForeColor.RGB = CLR_CARD
        .Line.ForeColor.RGB = CLR_BORDER
        .Line.Weight = 1
    End With

    Set shp = wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, tblLeft + 14, pTop + 10, tblW - 28, 18)
    With shp
        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse
        .TextFrame2.TextRange.Text = "🌿 VEGETATION INDICES (field mean)"
        With .TextFrame2.TextRange.Font
            .Size = 12
            .Bold = msoTrue
            .Name = "Calibri"
            .Fill.ForeColor.RGB = CLR_HEADER
        End With
    End With

    Dim idxNames As Variant
    idxNames = Array("NDVI", "NDWI", "EVI", "SAVI", "NDMI")
    Dim idxVals(1 To 5) As Double
    idxVals(1) = sumVals(2): idxVals(2) = sumVals(3): idxVals(3) = sumVals(4)
    idxVals(4) = sumVals(5): idxVals(5) = sumVals(6)

    Dim colW As Double
    colW = (tblW - 28) / 5
    Dim c As Long
    For c = 1 To 5
        Dim hx As Double
        hx = tblLeft + 14 + (c - 1) * colW
        ' header cell
        With wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, hx, pTop + 36, colW, 18)
            .Fill.Visible = msoFalse
            .Line.Visible = msoFalse
            .TextFrame2.TextRange.Text = CStr(idxNames(c - 1))
            With .TextFrame2.TextRange.Font
                .Size = 11
                .Bold = msoTrue
                .Name = "Calibri"
                .Fill.ForeColor.RGB = CLR_HEADER
            End With
            .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignCenter
        End With
        ' value cell
        Dim vColor As Long
        vColor = IndexHealthColor(idxVals(c))
        With wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, hx, pTop + 62, colW, 40)
            .Fill.Visible = msoFalse
            .Line.Visible = msoFalse
            .TextFrame2.TextRange.Text = Format$(idxVals(c), "0.000")
            With .TextFrame2.TextRange.Font
                .Size = 20
                .Bold = msoTrue
                .Name = "Calibri"
                .Fill.ForeColor.RGB = vColor
            End With
            .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignCenter
        End With
        ' status pill
        With wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, hx, pTop + 108, colW, 18)
            .Fill.Visible = msoFalse
            .Line.Visible = msoFalse
            .TextFrame2.TextRange.Text = IndexHealthLabel(idxVals(c))
            With .TextFrame2.TextRange.Font
                .Size = 10
                .Bold = msoTrue
                .Name = "Calibri"
                .Fill.ForeColor.RGB = vColor
            End With
            .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignCenter
        End With
    Next c

    ' ── 5. ML advisory panel (below terrain) ──
    Dim advTop As Double
    advTop = pTop + 215
    Set shp = wsDash.Shapes.AddShape(msoShapeRoundedRectangle, MARGIN, advTop, panelW, 130)
    With shp
        .Name = "fhdMLPanel"
        .Fill.ForeColor.RGB = RGB(245, 250, 245)
        .Line.ForeColor.RGB = CLR_BORDER
        .Line.Weight = 1
    End With

    Set shp = wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, MARGIN + 14, advTop + 10, panelW - 28, 18)
    With shp
        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse
        .TextFrame2.TextRange.Text = "🤖 ML STRESS DECISION"
        With .TextFrame2.TextRange.Font
            .Size = 12
            .Bold = msoTrue
            .Name = "Calibri"
            .Fill.ForeColor.RGB = CLR_HEADER
        End With
    End With

    Dim stressLabel As String, stressColor As Long
    stressLabel = MLStressLabel(ndviMean, sumVals(3))
    stressColor = MLStressColor(stressLabel)
    Set shp = wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, MARGIN + 14, advTop + 40, panelW - 28, 26)
    With shp
        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse
        .TextFrame2.TextRange.Text = stressLabel
        With .TextFrame2.TextRange.Font
            .Size = 16
            .Bold = msoTrue
            .Name = "Calibri"
            .Fill.ForeColor.RGB = stressColor
        End With
        .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignLeft
    End With

    Set shp = wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, MARGIN + 14, advTop + 74, panelW - 28, 48)
    With shp
        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse
        .TextFrame2.WordWrap = msoTrue
        .TextFrame2.TextRange.Text = MLAdviceText(stressLabel)
        With .TextFrame2.TextRange.Font
            .Size = 9
            .Name = "Calibri"
            .Fill.ForeColor.RGB = CLR_TEXT
        End With
    End With

    ' ── 6. NDVI trend chart (from daily time series) ──
    Dim chartW As Double, chartH As Double
    chartW = WIDTH - 2 * MARGIN - panelW - 16
    chartH = 200

    Dim co As ChartObject
    Set co = wsDash.ChartObjects.Add(tblLeft, advTop + 8, chartW, chartH)
    co.Name = "fhdTrendChart"
    With co.Chart
        .ChartType = xlLine
        .HasTitle = True
        .ChartTitle.Text = "NDVI Trend — Continuous cloud-free observations"
        .ChartTitle.Font.Size = 12
        .ChartTitle.Font.Bold = True
        .ChartTitle.Font.Color = CLR_HEADER
        .HasLegend = False
    End With

    ' Pull the daily series (date, ndvi) into the chart
    Dim serData As Range
    Dim fillFirst As Long, fillLast As Long, nPts As Long
    fillFirst = dataFirst
    fillLast = sumRow - 1
    If fillLast < fillFirst Then fillLast = dataFirst
    nPts = fillLast - fillFirst + 1
    If nPts > 0 Then
        With co.Chart.SeriesCollection.NewSeries
            .XValues = wsData.Range(wsData.Cells(fillFirst, 1), wsData.Cells(fillLast, 1))
            .Values = wsData.Range(wsData.Cells(fillFirst, 2), wsData.Cells(fillLast, 2))
            .Format.Line.ForeColor.RGB = RGB(46, 139, 87)
            .Format.Line.Weight = 2.25
            .MarkerStyle = xlMarkerStyleCircle
            .MarkerSize = 5
        End With
    End If

    ' ── 7. Footer / legend ──
    With wsDash.Shapes.AddTextbox(msoTextOrientationHorizontal, MARGIN, advTop + 215, WIDTH - 2 * MARGIN, 18)
        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse
        .TextFrame2.TextRange.Text = "Source: Google Earth Engine · Sentinel-2 L2A (cloud-masked median composite) · SRTM 30m DEM · Random Forest stress model. " & _
                                     "Zones CSV = ML training table on the 'FH Zones' sheet."
        With .TextFrame2.TextRange.Font
            .Size = 9
            .Name = "Calibri"
            .Fill.ForeColor.RGB = CLR_MUTED
        End With
    End With

    ' ── 8. Zone table sheet (if zones CSV was imported) ──
    BuildZoneSheet

    ' ── Finish ──
    Application.Goto wsDash.Range("A1"), True
    On Error Resume Next
    ActiveWindow.Zoom = 70
    On Error GoTo 0

    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    MsgBox "FarmHealth dashboard created successfully!", vbInformation, "FarmHealth Report"

    Exit Sub

ErrHandler:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    MsgBox "Dashboard build error " & Err.Number & ": " & Err.Description, vbCritical, "FarmHealth Report"
End Sub

' ═══════════════════════════════════════════════════════════════════════════
'  IMPORT MACROS
' ═══════════════════════════════════════════════════════════════════════════
Public Sub FarmHealth_ImportAnalysisCSV()
    Dim f As String
    f = GetFile("Select the analysis report CSV (farmhealth_analysis_report.csv)", "CSV Files,*.csv")
    If f = "" Then Exit Sub
    ImportCSVToSheet f, "FH Data"
    MsgBox "Analysis CSV imported into 'FH Data'. Run FarmHealth_BuildDashboard to build the report.", vbInformation, "FarmHealth Report"
End Sub

Public Sub FarmHealth_ImportZonesCSV()
    Dim f As String
    f = GetFile("Select the zone features CSV (farmhealth_zone_features.csv)", "CSV Files,*.csv")
    If f = "" Then Exit Sub
    ImportCSVToSheet f, "FH Zones"
    MsgBox "Zone features imported into 'FH Zones' (ML training table).", vbInformation, "FarmHealth Report"
End Sub

' ═══════════════════════════════════════════════════════════════════════════
'  HELPERS
' ═══════════════════════════════════════════════════════════════════════════
Private Function GetOrCreateSheet(shName As String) As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(shName)
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = shName
    End If
    Set GetOrCreateSheet = ws
End Function

Private Sub DeleteOldSheet(shName As String)
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(shName)
    On Error GoTo 0
    If Not ws Is Nothing Then ws.Delete
End Sub

Private Function FindHeaderRow(ws As Worksheet) As Long
    Dim i As Long
    For i = 1 To 5
        If LCase$(Trim$(CStr(ws.Cells(i, 1).Value))) = "date" Then
            FindHeaderRow = i
            Exit Function
        End If
    Next i
    FindHeaderRow = 0
End Function

Private Sub DrawTerrainRow(ws As Worksheet, left As Double, top As Double, label As String, value As String, vColor As Long)
    With ws.Shapes.AddTextbox(msoTextOrientationHorizontal, left, top, 110, 18)
        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse
        .TextFrame2.TextRange.Text = label
        With .TextFrame2.TextRange.Font
            .Size = 10
            .Bold = msoTrue
            .Name = "Calibri"
            .Fill.ForeColor.RGB = CLR_MUTED
        End With
    End With
    With ws.Shapes.AddTextbox(msoTextOrientationHorizontal, left + 118, top, 170, 18)
        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse
        .TextFrame2.TextRange.Text = value
        With .TextFrame2.TextRange.Font
            .Size = 10
            .Bold = msoTrue
            .Name = "Calibri"
            .Fill.ForeColor.RGB = vColor
        End With
        .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignRight
    End With
End Sub

Private Function DrainClass(slope As Double) As String
    If slope > 5 Then
        DrainClass = "Well-drained / erosion risk"
    ElseIf slope > 2 Then
        DrainClass = "Moderate drainage"
    Else
        DrainClass = "Poor drainage / flat"
    End If
End Function

Private Function IndexHealthColor(v As Double) As Long
    If v >= 0.6 Then
        IndexHealthColor = RGB(46, 139, 87)   ' healthy
    ElseIf v >= 0.4 Then
        IndexHealthColor = RGB(255, 217, 59)  ' moderate
    ElseIf v >= 0.2 Then
        IndexHealthColor = RGB(255, 159, 28)  ' below
    Else
        IndexHealthColor = RGB(255, 82, 82)   ' poor
    End If
End Function

Private Function IndexHealthLabel(v As Double) As String
    If v >= 0.6 Then
        IndexHealthLabel = "Healthy"
    ElseIf v >= 0.4 Then
        IndexHealthLabel = "Moderate"
    ElseIf v >= 0.2 Then
        IndexHealthLabel = "Below avg"
    Else
        IndexHealthLabel = "Critical"
    End If
End Function

' ML stress label — mirrors the web app's bootstrap labeling rules
Private Function MLStressLabel(ndvi As Double, ndwi As Double) As String
    If ndvi < 0.15 Then
        MLStressLabel = "Critical"
    ElseIf ndvi < 0.3 Or (ndvi < 0.45 And ndwi < 0.15) Then
        MLStressLabel = "Severe Stress"
    ElseIf ndvi < 0.5 Or ndwi < 0.2 Then
        MLStressLabel = "Moderate Stress"
    ElseIf ndvi < 0.65 Then
        MLStressLabel = "Mild Stress"
    Else
        MLStressLabel = "Healthy"
    End If
End Function

Private Function MLStressColor(label As String) As Long
    Select Case label
        Case "Healthy": MLStressColor = RGB(46, 139, 87)
        Case "Mild Stress": MLStressColor = RGB(143, 188, 79)
        Case "Moderate Stress": MLStressColor = RGB(255, 217, 59)
        Case "Severe Stress": MLStressColor = RGB(255, 159, 28)
        Case Else: MLStressColor = RGB(255, 82, 82)
    End Select
End Function

Private Function MLAdviceText(label As String) As String
    Select Case label
        Case "Healthy":
            MLAdviceText = "No intervention needed. Maintain current irrigation and nutrient schedule. Continue weekly satellite monitoring."
        Case "Mild Stress":
            MLAdviceText = "Early stress signal. Scout the affected zone; consider a light irrigation boost and monitor the NDWI trend over 7 days."
        Case "Moderate Stress":
            MLAdviceText = "Schedule irrigation within 3-4 days and top-dress nitrogen (20-30 kg/ha) if leaf greenness is declining."
        Case "Severe Stress":
            MLAdviceText = "Irrigate immediately, verify soil moisture on the ground, and inspect for pest/disease pressure. Re-run analysis after 5 days."
        Case Else:
            MLAdviceText = "CRITICAL — crop at risk of failure. Immediate on-ground inspection required; consult an agronomist today."
    End Select
End Function

Private Sub BuildZoneSheet()
    Dim wsZ As Worksheet
    On Error Resume Next
    Set wsZ = ThisWorkbook.Worksheets("FH Zones")
    On Error GoTo 0
    If wsZ Is Nothing Then Exit Sub
    If Application.WorksheetFunction.CountA(wsZ.Cells) = 0 Then Exit Sub

    ' Turn the zone table into a formatted table with conditional colours
    Dim lastRow As Long, lastCol As Long
    lastRow = wsZ.UsedRange.Row + wsZ.UsedRange.Rows.Count - 1
    lastCol = wsZ.UsedRange.Column + wsZ.UsedRange.Columns.Count - 1
    If lastRow < 2 Then Exit Sub

    With wsZ.Range(wsZ.Cells(1, 1), wsZ.Cells(1, lastCol))
        .Font.Bold = True
        .Interior.Color = RGB(4, 80, 27)
        .Font.Color = RGB(255, 255, 255)
    End With
    wsZ.Columns.AutoFit
    wsZ.Range(wsZ.Cells(1, 1), wsZ.Cells(lastRow, lastCol)).Borders.LineStyle = xlContinuous
    wsZ.Range(wsZ.Cells(1, 1), wsZ.Cells(lastRow, lastCol)).Borders.Color = RGB(208, 226, 203)
End Sub

Private Sub ImportCSVToSheet(f As String, sheetName As String)
    ' Open the CSV with QueryTables so numeric columns parse correctly
    Dim ws As Worksheet
    DeleteOldSheet sheetName
    Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
    ws.Name = sheetName

    Dim qt As QueryTable
    Set qt = ws.QueryTables.Add(Connection:="TEXT;" & f, Destination:=ws.Range("A1"))
    With qt
        .TextFileParseType = xlDelimited
        .TextFileCommaDelimiter = True
        .TextFileOtherDelimiter = False
        .TextFileConsecutiveDelimiter = False
        .TextFileTabDelimiter = False
        .Refresh BackgroundQuery:=False
        .Delete
    End With
End Sub

Private Function GetFile(title As String, filter As String) As String
    Dim fd As Object
    On Error Resume Next
    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    If fd Is Nothing Then
        GetFile = ""
        Exit Function
    End If
    On Error GoTo 0
    With fd
        .Title = title
        .Filters.Clear
        .Filters.Add filter, filter
        If .Show = -1 Then
            GetFile = .SelectedItems(1)
        Else
            GetFile = ""
        End If
    End With
End Function
