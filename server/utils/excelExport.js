/** Excel SpreadsheetML export with TransitLK depot-navy theme (opens in Excel with colors) */

const SHEET_COLS = 6
const COL_WIDTH = 120

const THEME = {
  navy: '#1E3A8A',
  navyLight: '#EEF2FB',
  navyMid: '#4A6FD4',
  white: '#FFFFFF',
  ink: '#1A1D26',
  amber: '#FEF3C7',
  amberText: '#92400E',
  green: '#D1FAE5',
  greenText: '#065F46',
  blue: '#DBEAFE',
  blueText: '#1E40AF',
  stripe: '#F8FAFC',
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cell(value, styleId, type = 'String') {
  const v = value ?? ''
  const dataType = type === 'Number' && v !== '' && !Number.isNaN(Number(v)) ? 'Number' : 'String'
  const dataValue = dataType === 'Number' ? Number(v) : xmlEscape(v)
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="${dataType}">${dataValue}</Data></Cell>`
}

function mergedCell(value, styleId, mergeAcross = SHEET_COLS - 1, type = 'String') {
  const v = value ?? ''
  const dataType = type === 'Number' && v !== '' && !Number.isNaN(Number(v)) ? 'Number' : 'String'
  const dataValue = dataType === 'Number' ? Number(v) : xmlEscape(v)
  return `<Cell ss:StyleID="${styleId}" ss:MergeAcross="${mergeAcross}"><Data ss:Type="${dataType}">${dataValue}</Data></Cell>`
}

function row(cells) {
  return `<Row>${cells.join('')}</Row>`
}

function emptyRow() {
  return '<Row ss:Height="6"/>'
}

function fullWidthRow(value, styleId) {
  return row([mergedCell(value, styleId, SHEET_COLS - 1)])
}

function padRowCells(cells, styleId) {
  const padded = [...cells]
  while (padded.length < SHEET_COLS) {
    padded.push(cell('', styleId))
  }
  return padded
}

function buildColumnWidths() {
  return Array.from({ length: SHEET_COLS }, (_, i) =>
    `<Column ss:Index="${i + 1}" ss:Width="${COL_WIDTH}"/>`
  ).join('\n      ')
}

function buildStyles() {
  const border = `
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C5D0E6"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C5D0E6"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C5D0E6"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C5D0E6"/>
    </Borders>`

  const mkStyle = (id, interior, fontColor, bold = false, extra = '') =>
    `<Style ss:ID="${id}">
      <Font ss:FontName="Calibri" ss:Size="10" ss:Color="${fontColor}"${bold ? ' ss:Bold="1"' : ''}/>
      <Interior ss:Color="${interior}" ss:Pattern="Solid"/>
      ${border}
      ${extra}
    </Style>`

  const wrapAlign = '<Alignment ss:WrapText="1" ss:Vertical="Top" ss:Horizontal="Left"/>'

  return `<Styles>
    ${mkStyle('Title', THEME.navy, THEME.white, true, '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>')}
    ${mkStyle('MetaLabel', THEME.navyLight, THEME.ink, true)}
    ${mkStyle('MetaValue', THEME.navyLight, THEME.ink, false, wrapAlign)}
    ${mkStyle('Section', THEME.navyMid, THEME.white, true, '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>')}
    ${mkStyle('Header', THEME.navy, THEME.white, true, '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>')}
    ${mkStyle('RowEven', THEME.white, THEME.ink, false, '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>')}
    ${mkStyle('RowOdd', THEME.stripe, THEME.ink, false, '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>')}
    ${mkStyle('RowHighlight', THEME.amber, THEME.amberText, true, '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>')}
    ${mkStyle('InsightWarning', THEME.amber, THEME.amberText, false, wrapAlign)}
    ${mkStyle('InsightSuccess', THEME.green, THEME.greenText, false, wrapAlign)}
    ${mkStyle('InsightInfo', THEME.blue, THEME.blueText, false, wrapAlign)}
    ${mkStyle('InsightTypeWarning', THEME.amber, THEME.amberText, true, '<Alignment ss:Horizontal="Center" ss:Vertical="Top"/>')}
    ${mkStyle('InsightTypeSuccess', THEME.green, THEME.greenText, true, '<Alignment ss:Horizontal="Center" ss:Vertical="Top"/>')}
    ${mkStyle('InsightTypeInfo', THEME.blue, THEME.blueText, true, '<Alignment ss:Horizontal="Center" ss:Vertical="Top"/>')}
    ${mkStyle('KvLabel', THEME.navyLight, THEME.ink, true)}
    ${mkStyle('KvValue', THEME.white, THEME.ink, false, wrapAlign)}
    ${mkStyle('KvValueAlt', THEME.stripe, THEME.ink, false, wrapAlign)}
  </Styles>`
}

function sectionTitle(title) {
  return [fullWidthRow(title, 'Section'), emptyRow()]
}

function metaRow(label, value) {
  return row([cell(label, 'MetaLabel'), mergedCell(value, 'MetaValue', SHEET_COLS - 2)])
}

function keyValueSection(title, pairs) {
  const lines = [...sectionTitle(title)]
  pairs.forEach(([label, value], i) => {
    const valueStyle = i % 2 === 0 ? 'KvValue' : 'KvValueAlt'
    lines.push(row([cell(label, 'KvLabel'), mergedCell(value, valueStyle, SHEET_COLS - 2)]))
  })
  lines.push(emptyRow())
  return lines
}

function tableSection(title, headers, dataRows, { highlightRow } = {}) {
  const lines = [...sectionTitle(title)]
  lines.push(row(padRowCells(headers.map((h) => cell(h, 'Header')), 'Header')))
  dataRows.forEach((dataRow, i) => {
    const isHighlight = highlightRow?.(dataRow, i)
    const style = isHighlight ? 'RowHighlight' : i % 2 === 0 ? 'RowEven' : 'RowOdd'
    lines.push(row(padRowCells(dataRow.map((v) => cell(v, style)), style)))
  })
  lines.push(emptyRow())
  return lines
}

function insightTypeStyle(type) {
  if (type === 'warning') return 'InsightTypeWarning'
  if (type === 'success') return 'InsightTypeSuccess'
  return 'InsightTypeInfo'
}

function insightMessageStyle(type) {
  if (type === 'warning') return 'InsightWarning'
  if (type === 'success') return 'InsightSuccess'
  return 'InsightInfo'
}

export function buildFuelMaintenanceReportSpreadsheet(data) {
  const { period, combined, fuel, maintenance, insights, vehiclesOfConcern } = data
  const generatedAt = new Date().toISOString()
  const concernRows = vehiclesOfConcern || fuel.byVehicle?.filter((v) => v.highUsage) || []

  const body = [
    fullWidthRow('TransitLK Fuel & Maintenance Report', 'Title'),
    emptyRow(),
    metaRow('Generated at', generatedAt),
    metaRow('Period', period.mode),
    metaRow('From', period.from),
    metaRow('To', period.to),
    emptyRow(),
    ...keyValueSection('Fuel Summary', [
      ['Total liters', fuel.totalLiters],
      ['Total cost (LKR)', fuel.totalCost],
      ['Avg liters per entry', fuel.avgLitersPerEntry],
      ['Fleet avg liters per trip', fuel.fleetAvgLitersPerTrip ?? '—'],
      ['Top route', fuel.topRoute ? `${fuel.topRoute.routeName} (${fuel.topRoute.liters} L)` : '—'],
    ]),
    ...keyValueSection('Maintenance Summary', [
      ['Total cost (LKR)', maintenance.totalCost],
      ['Service jobs', maintenance.totalEntries],
      ['Vehicles serviced', maintenance.vehiclesServiced],
      ['Fuel share (%)', combined.fuelSharePct],
      ['Maintenance share (%)', combined.maintenanceSharePct],
      [
        'Top service type',
        maintenance.topServiceType
          ? `${maintenance.topServiceType.type} (${maintenance.topServiceType.cost} LKR)`
          : '—',
      ],
    ]),
    ...sectionTitle('Findings & recommendations'),
    ...(insights || []).map((i) =>
      row([
        cell(i.type, insightTypeStyle(i.type)),
        mergedCell(i.text, insightMessageStyle(i.type), SHEET_COLS - 2),
      ])
    ),
    emptyRow(),
    ...tableSection(
      period.mode === 'weekly' ? 'Daily fuel trend' : 'Weekly fuel trend',
      ['Period bucket', 'Liters', 'Cost (LKR)'],
      (fuel.trend || []).map((t) => [t.label, t.liters, t.cost])
    ),
    ...tableSection(
      period.mode === 'weekly' ? 'Daily maintenance cost' : 'Weekly maintenance cost',
      ['Period bucket', 'Cost (LKR)'],
      (maintenance.trend || []).map((t) => [t.label, t.cost])
    ),
    ...((data.routesOfConcern || []).length > 0
      ? tableSection(
          'High-usage routes',
          ['Route', 'Liters', 'Fleet share (%)'],
          data.routesOfConcern.map((r) => [r.routeName, r.liters, r.fuelShare])
        )
      : []),
    ...((data.inefficientVehicles || []).length > 0
      ? tableSection(
          'Inefficient driving patterns',
          ['Vehicle', 'Liters per trip', 'Fleet avg L/trip'],
          data.inefficientVehicles.map((v) => [
            v.regNumber,
            v.litersPerTrip,
            fuel.fleetAvgLitersPerTrip ?? '—',
          ])
        )
      : []),
    ...(concernRows.length > 0
      ? tableSection(
          'Vehicles requiring attention',
          ['Registration number', 'Liters', 'Fleet share (%)'],
          concernRows.map((v) => [v.regNumber, v.liters, v.fuelShare ?? '']),
          { highlightRow: () => true }
        )
      : []),
    ...tableSection(
      'Maintenance cost breakdown',
      ['Service type', 'Count', 'Cost (LKR)'],
      (maintenance.byServiceType || []).slice(0, 5).map((r) => [r.type, r.count, r.cost])
    ),
  ]

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${buildStyles()}
  <Worksheet ss:Name="Fuel &amp; Maintenance">
    <Table ss:ExpandedColumnCount="${SHEET_COLS}" ss:DefaultRowHeight="20">
      ${buildColumnWidths()}
      ${body.join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`
}
