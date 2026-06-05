/**
 * Generates TransitLK Agile Gantt draw.io file.
 * Run: node "diagrams/Gantt Chart/_generate-gantt.mjs"
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const DIR = dirname(fileURLToPath(import.meta.url))
const OUT = join(DIR, 'TransitLK-Gantt-Chart.drawio')

const LABEL_W = 280
const DAY_W = 30
const ROW_H = 24
const ORIGIN_X = 40
const ORIGIN_Y = 100
const TOTAL_DAYS = 32 // 8 May – 8 Jun 2026

const SPRINT_COLORS = {
  1: { fill: '#3B82F6', stroke: '#2563EB' },
  2: { fill: '#22C55E', stroke: '#16A34A' },
  3: { fill: '#F59E0B', stroke: '#D97706' },
  4: { fill: '#8B5CF6', stroke: '#7C3AED' },
  5: { fill: '#64748B', stroke: '#475569' },
}
const QA = { fill: '#94A3B8', stroke: '#64748B' }
const PLANNING = { fill: '#E0E7FF', stroke: '#6366F1' }
const REFINE = { fill: '#C7D2FE', stroke: '#6366F1' }
const UAT = { fill: '#FBCFE8', stroke: '#DB2777' }
const RELEASE = { fill: '#FEE2E2', stroke: '#DC2626' }

function taskColor(t) {
  if (t.ceremony === 'planning') return PLANNING
  if (t.ceremony === 'refine') return REFINE
  if (t.ceremony === 'uat') return UAT
  if (t.ceremony === 'release') return RELEASE
  if (t.qa) return QA
  return SPRINT_COLORS[t.sprint] || SPRINT_COLORS[5]
}

const tasks = [
  // ── Sprint 1 ──
  { label: 'Sprint 1 Planning', sprint: 1, start: 1, dur: 1, ceremony: 'planning' },
  { label: 'Requirements Analysis', sprint: 1, start: 1, dur: 3 },
  { label: 'Product Backlog', sprint: 1, start: 1, dur: 3 },
  { label: 'Architecture Diagram', sprint: 1, start: 2, dur: 3 },
  { label: 'Database Design', sprint: 1, start: 2, dur: 4 },
  { label: 'UI Setup', sprint: 1, start: 3, dur: 4 },
  { label: 'Authentication &amp; Authorization', sprint: 1, start: 3, dur: 4 },
  { label: 'User Management', sprint: 1, start: 5, dur: 3 },
  { label: 'Admin Management', sprint: 1, start: 5, dur: 3 },
  { label: 'Depot Management', sprint: 1, start: 6, dur: 2 },
  { label: 'Sprint 1 test &amp; review', sprint: 1, start: 6, dur: 2, qa: true },
  { label: 'Release v0.1.0', sprint: 1, start: 7, dur: 1, ceremony: 'release' },
  // ── Sprint 2 ──
  { label: 'Sprint 2 Planning', sprint: 2, start: 8, dur: 1, ceremony: 'planning' },
  { label: 'Fleet &amp; Driver Management', sprint: 2, start: 8, dur: 7 },
  { label: 'Vehicle Registration', sprint: 2, start: 8, dur: 4 },
  { label: 'Driver Registration', sprint: 2, start: 8, dur: 4 },
  { label: 'Availability Tracking', sprint: 2, start: 10, dur: 3 },
  { label: 'Route Planning Module', sprint: 2, start: 8, dur: 7 },
  { label: 'Route CRUD', sprint: 2, start: 8, dur: 5 },
  { label: 'Bus Assignment', sprint: 2, start: 10, dur: 3 },
  { label: 'Driver Assignment', sprint: 2, start: 10, dur: 3 },
  { label: 'Google Maps Integration', sprint: 2, start: 11, dur: 4 },
  { label: 'Sprint 2 test &amp; review', sprint: 2, start: 13, dur: 2, qa: true },
  { label: 'Release v0.2.0', sprint: 2, start: 14, dur: 1, ceremony: 'release' },
  // ── Sprint 3 ──
  { label: 'Sprint 3 Planning', sprint: 3, start: 15, dur: 1, ceremony: 'planning' },
  { label: 'Schedule Management Module', sprint: 3, start: 15, dur: 7 },
  { label: 'Daily/Weekly/Monthly Timetables', sprint: 3, start: 15, dur: 5 },
  { label: 'Route Scheduling', sprint: 3, start: 16, dur: 4 },
  { label: 'Driver Scheduling', sprint: 3, start: 16, dur: 4 },
  { label: 'Vehicle Scheduling', sprint: 3, start: 16, dur: 4 },
  { label: 'Conflict Detection', sprint: 3, start: 17, dur: 4 },
  { label: 'Fuel Logs', sprint: 3, start: 18, dur: 3 },
  { label: 'Maintenance Records', sprint: 3, start: 18, dur: 3 },
  { label: 'Sprint 3 test &amp; review', sprint: 3, start: 20, dur: 2, qa: true },
  { label: 'Release v0.3.0', sprint: 3, start: 21, dur: 1, ceremony: 'release' },
  // ── Sprint 4 ──
  { label: 'Sprint 4 Planning', sprint: 4, start: 22, dur: 1, ceremony: 'planning' },
  { label: 'Reporting &amp; Analytics', sprint: 4, start: 22, dur: 5 },
  { label: 'Trip Completion Reports', sprint: 4, start: 22, dur: 3 },
  { label: 'Route Performance Reports', sprint: 4, start: 22, dur: 3 },
  { label: 'Fuel Consumption Reports', sprint: 4, start: 23, dur: 3 },
  { label: 'Dashboard Analytics', sprint: 4, start: 23, dur: 4 },
  { label: 'PDF/CSV Export', sprint: 4, start: 24, dur: 3 },
  { label: 'Integration &amp; E2E testing', sprint: 4, start: 22, dur: 5, qa: true },
  { label: 'Bug Fixing', sprint: 4, start: 25, dur: 3 },
  { label: 'Deployment', sprint: 4, start: 27, dur: 2 },
  { label: 'Technical documentation', sprint: 4, start: 27, dur: 2 },
  { label: 'Sprint 4 test &amp; review', sprint: 4, start: 26, dur: 2, qa: true },
  { label: 'Release v1.0.0', sprint: 4, start: 28, dur: 1, ceremony: 'release' },
  // ── Release window ──
  {
    label: 'Product Backlog Refinement',
    ceremony: 'refine',
    segments: [
      { start: 5, dur: 2 },
      { start: 12, dur: 2 },
      { start: 19, dur: 2 },
      { start: 26, dur: 2 },
    ],
  },
  { label: 'User Acceptance Testing', ceremony: 'uat', start: 29, dur: 3 },
  { label: 'Deploy &amp; freeze regression', sprint: 5, start: 29, dur: 3 },
]

const sprintHeaders = [
  { label: 'Sprint 1 — Foundation', start: 1, days: 7, color: '#DBEAFE' },
  { label: 'Sprint 2 — Fleet &amp; Routes', start: 8, days: 7, color: '#DCFCE7' },
  { label: 'Sprint 3 — Schedules &amp; Logs', start: 15, days: 7, color: '#FEF3C7' },
  { label: 'Sprint 4 — Analytics', start: 22, days: 7, color: '#EDE9FE' },
  { label: 'Release', start: 29, days: 4, color: '#F1F5F9' },
]

let id = 2
const nextId = () => String(id++)

function cell(xml) {
  return xml
}

const cells = []
const gridX = ORIGIN_X + LABEL_W
const pageW = gridX + TOTAL_DAYS * DAY_W + 60
const pageH = ORIGIN_Y + tasks.length * ROW_H + 48

cells.push(cell(`        <mxCell id="${nextId()}" value="TransitLK — Agile Development Gantt Chart&lt;br&gt;&lt;font style=&quot;font-size: 12px&quot;&gt;SRMSS | 8 May – 8 June 2026 | 4 x 7-day sprints&lt;/font&gt;" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;fontStyle=1;fontSize=18;" vertex="1" parent="1">
          <mxGeometry x="${ORIGIN_X}" y="20" width="${pageW - ORIGIN_X * 2}" height="50" as="geometry"/>
        </mxCell>`))

// Sprint header bands
sprintHeaders.forEach((sh) => {
  const x = gridX + (sh.start - 1) * DAY_W
  const w = sh.days * DAY_W
  cells.push(cell(`        <mxCell id="${nextId()}" value="${sh.label}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=${sh.color};strokeColor=#666666;fontStyle=1;fontSize=11;align=center;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${ORIGIN_Y - 44}" width="${w}" height="28" as="geometry"/>
        </mxCell>`))
})

// Day numbers row (every 7 days)
for (let d = 1; d <= TOTAL_DAYS; d += 7) {
  const x = gridX + (d - 1) * DAY_W
  const dates = ['8 May', '15 May', '22 May', '29 May', '5 Jun']
  const idx = (d - 1) / 7
  cells.push(cell(`        <mxCell id="${nextId()}" value="${dates[idx] || ''}" style="text;html=1;strokeColor=none;fillColor=none;align=center;fontSize=9;fontColor=#666666;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${ORIGIN_Y - 16}" width="${7 * DAY_W}" height="16" as="geometry"/>
        </mxCell>`))
}

// Vertical grid + sprint separators
for (let d = 0; d <= TOTAL_DAYS; d++) {
  const x = gridX + d * DAY_W
  const dashed = d % 7 === 0 && d > 0 ? 'dashed=1;' : ''
  const stroke = d % 7 === 0 ? '#94A3B8' : '#E5E7EB'
  cells.push(cell(`        <mxCell id="${nextId()}" value="" style="endArrow=none;html=1;strokeColor=${stroke};${dashed}" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="${x}" y="${ORIGIN_Y}" as="sourcePoint"/>
            <mxPoint x="${x}" y="${ORIGIN_Y + tasks.length * ROW_H}" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`))
}

// Task label column background
cells.push(cell(`        <mxCell id="${nextId()}" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#F9FAFB;strokeColor=#D1D5DB;" vertex="1" parent="1">
          <mxGeometry x="${ORIGIN_X}" y="${ORIGIN_Y}" width="${LABEL_W}" height="${tasks.length * ROW_H}" as="geometry"/>
        </mxCell>`))

// Timeline background
cells.push(cell(`        <mxCell id="${nextId()}" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#D1D5DB;" vertex="1" parent="1">
          <mxGeometry x="${gridX}" y="${ORIGIN_Y}" width="${TOTAL_DAYS * DAY_W}" height="${tasks.length * ROW_H}" as="geometry"/>
        </mxCell>`))

tasks.forEach((t, i) => {
  const y = ORIGIN_Y + i * ROW_H
  const c = taskColor(t)
  const bars = t.segments || [{ start: t.start, dur: t.dur }]

  cells.push(cell(`        <mxCell id="${nextId()}" value="${t.label}" style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontSize=10;spacingLeft=8;" vertex="1" parent="1">
          <mxGeometry x="${ORIGIN_X}" y="${y}" width="${LABEL_W - 4}" height="${ROW_H}" as="geometry"/>
        </mxCell>`))

  bars.forEach((seg) => {
    const barX = gridX + (seg.start - 1) * DAY_W + 2
    const barW = seg.dur * DAY_W - 4
    const barLabel = t.ceremony === 'release' ? t.label.replace('Release ', '') : ''
    const barStyle = t.ceremony === 'release'
      ? `rounded=1;whiteSpace=wrap;html=1;fillColor=${c.fill};strokeColor=${c.stroke};fontStyle=1;fontSize=9;fontColor=#B91C1C;align=center;`
      : `rounded=1;whiteSpace=wrap;html=1;fillColor=${c.fill};strokeColor=${c.stroke};opacity=90;`
    cells.push(cell(`        <mxCell id="${nextId()}" value="${barLabel}" style="${barStyle}" vertex="1" parent="1">
          <mxGeometry x="${barX}" y="${y + 4}" width="${barW}" height="${ROW_H - 8}" as="geometry"/>
        </mxCell>`))
  })

  // Row line
  cells.push(cell(`        <mxCell id="${nextId()}" value="" style="endArrow=none;html=1;strokeColor=#E5E7EB;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="${ORIGIN_X}" y="${y + ROW_H}" as="sourcePoint"/>
            <mxPoint x="${gridX + TOTAL_DAYS * DAY_W}" y="${y + ROW_H}" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`))
})

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" agent="TransitLK" version="22.1.0" type="device">
  <diagram id="transitlk-gantt" name="TransitLK-Gantt-Chart">
    <mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageW}" pageHeight="${pageH}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`

writeFileSync(OUT, xml)
console.log(`Written ${OUT}`)
