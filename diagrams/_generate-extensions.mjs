/**
 * Generates extension TransitLK draw.io files (SEQ-06…11, ST-05).
 * Run: node diagrams/_generate-extensions.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const SEQ_DIR = join(ROOT, 'sequence')
const ST_DIR = join(ROOT, 'state-transition')

mkdirSync(SEQ_DIR, { recursive: true })
mkdirSync(ST_DIR, { recursive: true })

let cellId = 2
const resetIds = () => { cellId = 2 }
const nextId = () => String(cellId++)

function wrapDiagram(name, cells, width = 1100, height = 720) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" agent="TransitLK" version="22.1.0" type="device">
  <diagram id="${name}" name="${name}">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${width}" pageHeight="${height}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`
}

function title(text, w = 900) {
  const id = nextId()
  return `        <mxCell id="${id}" value="${text}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;fontStyle=1;fontSize=16;" vertex="1" parent="1">
          <mxGeometry x="120" y="20" width="${w}" height="36" as="geometry"/>
        </mxCell>`
}

function note(text, x, y, w = 300, h = 50) {
  const id = nextId()
  return `        <mxCell id="${id}" value="${text}" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor=#fff2cc;strokeColor=#d6b656;size=12;align=left;spacingLeft=8;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>
        </mxCell>`
}

function participant(label, x, color = '#dae8fc', stroke = '#6c8ebf') {
  const id = nextId()
  const lid = nextId()
  return {
    cx: x + 60,
    xml: `        <mxCell id="${id}" value="${label}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${color};strokeColor=${stroke};fontStyle=1;align=center;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="70" width="120" height="40" as="geometry"/>
        </mxCell>
        <mxCell id="${lid}" value="" style="endArrow=none;dashed=1;html=1;strokeColor=#999999;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="${x + 60}" y="110" as="sourcePoint"/>
            <mxPoint x="${x + 60}" y="600" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`,
  }
}

function msg(label, x1, x2, y, dashed = false) {
  const id = nextId()
  const d = dashed ? 'dashed=1;' : ''
  const arrow = x1 < x2 ? 'endArrow=blockThin;endFill=1;startArrow=none;' : 'startArrow=blockThin;startFill=1;endArrow=none;'
  return `        <mxCell id="${id}" value="${label}" style="${arrow}${d}html=1;strokeColor=#333333;fontSize=11;verticalAlign=bottom;labelBackgroundColor=#ffffff;" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="${x1}" y="${y}" as="sourcePoint"/>
            <mxPoint x="${x2}" y="${y}" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`
}

function buildSequence(filename, diagramTitle, parts, messages, extraNotes = [], h = 680) {
  resetIds()
  const cells = [title(diagramTitle)]
  const actors = parts.map((p, i) => participant(p.label, 40 + i * 160, p.fill, p.stroke))
  actors.forEach((a) => cells.push(a.xml))
  messages.forEach((m) => cells.push(msg(m.text, actors[m.from].cx, actors[m.to].cx, m.y, m.dashed)))
  extraNotes.forEach((n) => cells.push(note(n.text, n.x, n.y, n.w, n.h)))
  writeFileSync(join(SEQ_DIR, filename), wrapDiagram(filename.replace('.drawio', ''), cells.join('\n'), 1100, h))
}

function stateNode(label, x, y, fill = '#d5e8d4', stroke = '#82b366') {
  const id = nextId()
  return { id, geom: { x, y, w: 150, h: 48 }, xml: `        <mxCell id="${id}" value="${label}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};align=center;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="150" height="48" as="geometry"/>
        </mxCell>` }
}

function initialState(x, y) {
  const id = nextId()
  return { id, geom: { x, y, w: 24, h: 24 }, xml: `        <mxCell id="${id}" value="" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#000000;strokeColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="24" height="24" as="geometry"/>
        </mxCell>` }
}

function transition(label, from, to, curved = false) {
  const id = nextId()
  const style = curved
    ? 'endArrow=blockThin;html=1;strokeColor=#333333;fontSize=10;edgeStyle=orthogonalEdgeStyle;curved=1;'
    : 'endArrow=blockThin;html=1;strokeColor=#333333;fontSize=10;'
  const fx = from.geom.x + from.geom.w / 2
  const fy = from.geom.y + from.geom.h
  const tx = to.geom.x + to.geom.w / 2
  const ty = to.geom.y
  return `        <mxCell id="${id}" value="${label}" style="${style}" edge="1" parent="1" source="${from.id}" target="${to.id}">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="${fx}" y="${fy}" as="sourcePoint"/>
            <mxPoint x="${tx}" y="${ty}" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`
}

function buildState(filename, diagramTitle, nodes, edges, notes = [], h = 520) {
  resetIds()
  const cells = [title(diagramTitle, 400)]
  const map = {}
  nodes.forEach((n) => {
    if (n.type === 'initial') {
      const init = initialState(n.x, n.y)
      map[n.key] = init
      cells.push(init.xml)
    } else {
      const sn = stateNode(n.label, n.x, n.y, n.fill, n.stroke)
      map[n.key] = sn
      cells.push(sn.xml)
    }
  })
  edges.forEach((e) => cells.push(transition(e.label, map[e.from], map[e.to], e.curved)))
  notes.forEach((n) => cells.push(note(n.text, n.x, n.y, n.w, n.h)))
  writeFileSync(join(ST_DIR, filename), wrapDiagram(filename.replace('.drawio', ''), cells.join('\n'), 560, h))
}

// ─── SEQ-06 Dashboard ────────────────────────────────────────────────────────

buildSequence(
  '06-dashboard-summary.drawio',
  'Sequence: Dashboard Summary Load (TransitLK)',
  [
    { label: 'Depot Manager&lt;br&gt;/ Admin', fill: '#f5f5f5', stroke: '#666666' },
    { label: 'Dashboard&lt;br&gt;(React)', fill: '#dae8fc', stroke: '#6c8ebf' },
    { label: 'Dashboard API&lt;br&gt;(Express)', fill: '#fff2cc', stroke: '#d6b656' },
    { label: 'MongoDB', fill: '#d5e8d4', stroke: '#82b366' },
  ],
  [
    { from: 0, to: 1, y: 140, text: '1. open /dashboard' },
    { from: 1, to: 2, y: 180, text: '2. GET /api/dashboard (+ JWT)' },
    { from: 2, to: 3, y: 220, text: '3. Bus.find() — fleet counts' },
    { from: 2, to: 3, y: 260, text: '4. Driver.find() — on-duty count' },
    { from: 2, to: 3, y: 300, text: '5. Maintenance.find() — alerts' },
    { from: 2, to: 3, y: 340, text: '6. Schedule.find() — trip stats' },
    { from: 2, to: 3, y: 380, text: '7. Route.find() — active routes' },
    { from: 3, to: 2, y: 420, text: '8. aggregated documents', dashed: true },
    { from: 2, to: 1, y: 460, text: '9. summary JSON', dashed: true },
    { from: 1, to: 0, y: 500, text: '10. render KPI cards &amp; lists' },
  ],
  [{ text: 'Roles: administrator, depot_manager.&lt;br&gt;Single-depot MVP (no depot filter yet).', x: 40, y: 540, w: 320, h: 50 }],
  620
)

// ─── SEQ-07 Driver trips ─────────────────────────────────────────────────────

buildSequence(
  '07-driver-view-trips.drawio',
  'Sequence: Driver View Assigned Trips (TransitLK)',
  [
    { label: 'Driver', fill: '#f5f5f5', stroke: '#666666' },
    { label: 'My Trips&lt;br&gt;(React)', fill: '#dae8fc', stroke: '#6c8ebf' },
    { label: 'Schedule API', fill: '#fff2cc', stroke: '#d6b656' },
    { label: 'MongoDB&lt;br&gt;(schedules)', fill: '#d5e8d4', stroke: '#82b366' },
  ],
  [
    { from: 0, to: 1, y: 140, text: '1. open /my-trips' },
    { from: 1, to: 2, y: 180, text: '2. GET /api/schedules?fromDate&amp;toDate' },
    { from: 2, to: 3, y: 220, text: '3. find where driverId = req.user.driverId' },
    { from: 3, to: 2, y: 260, text: '4. populated trips[]', dashed: true },
    { from: 2, to: 1, y: 300, text: '5. JSON trip list', dashed: true },
    { from: 1, to: 0, y: 340, text: '6. show route, times, status badges' },
  ],
  [{ text: 'Driver role only.&lt;br&gt;Date window: past 7 days → next 30 days.', x: 40, y: 420, w: 300, h: 50 }],
  500
)

// ─── SEQ-08 Maintenance ──────────────────────────────────────────────────────

buildSequence(
  '08-log-maintenance.drawio',
  'Sequence: Log Vehicle Maintenance (TransitLK)',
  [
    { label: 'Fleet Manager', fill: '#f5f5f5', stroke: '#666666' },
    { label: 'Maintenance&lt;br&gt;Page', fill: '#dae8fc', stroke: '#6c8ebf' },
    { label: 'Maintenance API', fill: '#fff2cc', stroke: '#d6b656' },
    { label: 'MongoDB', fill: '#d5e8d4', stroke: '#82b366' },
  ],
  [
    { from: 0, to: 1, y: 140, text: '1. select bus, date, work, cost' },
    { from: 1, to: 2, y: 180, text: '2. POST /api/maintenance (+ JWT)' },
    { from: 2, to: 3, y: 220, text: '3. Bus.findById(bus_id)' },
    { from: 3, to: 2, y: 260, text: '4. bus document', dashed: true },
    { from: 2, to: 3, y: 300, text: '5. Maintenance.create()' },
    { from: 2, to: 3, y: 340, text: '6. Bus.update status=maintenance' },
    { from: 3, to: 2, y: 380, text: '7. record saved', dashed: true },
    { from: 2, to: 1, y: 420, text: '8. 201 maintenance record', dashed: true },
    { from: 1, to: 0, y: 460, text: '9. refresh list; bus unavailable for schedule' },
  ],
  [{ text: 'Auto-sets bus → maintenance.&lt;br&gt;Fleet Manager role required.', x: 40, y: 500, w: 300, h: 50 }],
  580
)

// ─── SEQ-09 Fuel ─────────────────────────────────────────────────────────────

buildSequence(
  '09-log-fuel.drawio',
  'Sequence: Log Fuel Entry (TransitLK)',
  [
    { label: 'Fleet Manager', fill: '#f5f5f5', stroke: '#666666' },
    { label: 'Maintenance&lt;br&gt;Page', fill: '#dae8fc', stroke: '#6c8ebf' },
    { label: 'Fuel API', fill: '#fff2cc', stroke: '#d6b656' },
    { label: 'MongoDB&lt;br&gt;(fuellogs)', fill: '#d5e8d4', stroke: '#82b366' },
  ],
  [
    { from: 0, to: 1, y: 140, text: '1. select bus, date, litres, amount' },
    { from: 1, to: 2, y: 180, text: '2. POST /api/fuel (+ JWT)' },
    { from: 2, to: 3, y: 220, text: '3. Bus.findById(bus_id)' },
    { from: 3, to: 2, y: 260, text: '4. bus found / 404', dashed: true },
    { from: 2, to: 3, y: 300, text: '5. FuelLog.create()' },
    { from: 3, to: 2, y: 340, text: '6. fuel log document', dashed: true },
    { from: 2, to: 1, y: 380, text: '7. 201 fuel log', dashed: true },
    { from: 1, to: 0, y: 420, text: '8. update fuel table &amp; summary' },
    { from: 1, to: 2, y: 460, text: '9. GET /api/fuel/summary (optional)' },
    { from: 2, to: 1, y: 500, text: '10. aggregated fuel KPIs', dashed: true },
  ],
  [{ text: 'Feeds analytics / report PDF.&lt;br&gt;Collection: fuellogs.', x: 40, y: 540, w: 280, h: 50 }],
  620
)

// ─── SEQ-10 Staff user ───────────────────────────────────────────────────────

buildSequence(
  '10-create-staff-user.drawio',
  'Sequence: Create Staff User Account (TransitLK)',
  [
    { label: 'Administrator', fill: '#f5f5f5', stroke: '#666666' },
    { label: 'Users Page&lt;br&gt;(React)', fill: '#dae8fc', stroke: '#6c8ebf' },
    { label: 'User API / Auth', fill: '#fff2cc', stroke: '#d6b656' },
    { label: 'MongoDB&lt;br&gt;(users)', fill: '#d5e8d4', stroke: '#82b366' },
  ],
  [
    { from: 0, to: 1, y: 140, text: '1. name, email, role, depot, password' },
    { from: 1, to: 2, y: 180, text: '2. POST /api/users OR /api/auth/register' },
    { from: 2, to: 3, y: 220, text: '3. validate role in STAFF_ROLES' },
    { from: 2, to: 3, y: 260, text: '4. bcrypt hash password' },
    { from: 2, to: 3, y: 300, text: '5. User.create(isActive: true)' },
    { from: 3, to: 2, y: 340, text: '6. user document', dashed: true },
    { from: 2, to: 1, y: 380, text: '7. 201 user profile', dashed: true },
    { from: 1, to: 0, y: 420, text: '8. staff listed in Users module' },
  ],
  [{ text: 'Roles: transport_scheduler, fleet_manager, depot_manager.&lt;br&gt;depotId required.', x: 40, y: 460, w: 340, h: 50 }],
  540
)

// ─── SEQ-11 Depot ────────────────────────────────────────────────────────────

buildSequence(
  '11-create-depot.drawio',
  'Sequence: Create Depot (TransitLK)',
  [
    { label: 'Super-&lt;br&gt;administrator', fill: '#f5f5f5', stroke: '#666666' },
    { label: 'Depots Page&lt;br&gt;(React)', fill: '#dae8fc', stroke: '#6c8ebf' },
    { label: 'Depot API', fill: '#fff2cc', stroke: '#d6b656' },
    { label: 'MongoDB&lt;br&gt;(depots)', fill: '#d5e8d4', stroke: '#82b366' },
  ],
  [
    { from: 0, to: 1, y: 140, text: '1. depotCode, region, name, contacts' },
    { from: 1, to: 2, y: 180, text: '2. POST /api/depots (+ JWT)' },
    { from: 2, to: 3, y: 220, text: '3. validate + normalize depotCode' },
    { from: 3, to: 2, y: 260, text: '4. duplicate code → 400', dashed: true },
    { from: 3, to: 2, y: 300, text: '5. depot document', dashed: true },
    { from: 2, to: 1, y: 340, text: '6. 201 depot JSON', dashed: true },
    { from: 1, to: 0, y: 380, text: '7. depot available for user/bus assignment' },
  ],
  [{ text: 'Superadministrator only.&lt;br&gt;Unique depotCode enforced.', x: 40, y: 460, w: 300, h: 50 }],
  540
)

// ─── SEQ-12 Fleet (Driver & Vehicle Management) ──────────────────────────────

buildSequence(
  '12-manage-fleet-driver-vehicle.drawio',
  'Sequence: Driver &amp; Vehicle Management (TransitLK)',
  [
    { label: 'Fleet Manager', fill: '#f5f5f5', stroke: '#666666' },
    { label: 'Buses / Drivers&lt;br&gt;Pages', fill: '#dae8fc', stroke: '#6c8ebf' },
    { label: 'Bus / Driver API', fill: '#fff2cc', stroke: '#d6b656' },
    { label: 'MongoDB', fill: '#d5e8d4', stroke: '#82b366' },
  ],
  [
    { from: 0, to: 1, y: 140, text: '1. open Fleet module (/buses or /drivers)' },
    { from: 1, to: 2, y: 180, text: '2a. POST /api/buses — regNumber, capacity, depotId' },
    { from: 2, to: 3, y: 220, text: '3a. validate unique regNumber' },
    { from: 3, to: 2, y: 260, text: '4a. bus saved (status: available)', dashed: true },
    { from: 1, to: 2, y: 300, text: '2b. POST /api/drivers — licenseNo, hours, depotId' },
    { from: 2, to: 3, y: 340, text: '3b. validate unique licenseNo' },
    { from: 3, to: 2, y: 380, text: '4b. driver saved (status: available)', dashed: true },
    { from: 0, to: 1, y: 420, text: '5. update status (available / in-service / on-leave)' },
    { from: 1, to: 2, y: 460, text: '6. PUT /api/buses/:id OR /api/drivers/:id' },
    { from: 2, to: 3, y: 500, text: '7. persist status change' },
    { from: 3, to: 2, y: 540, text: '8. updated document', dashed: true },
    { from: 2, to: 1, y: 580, text: '9. refresh fleet list', dashed: true },
  ],
  [{ text: 'Fleet Manager role.&lt;br&gt;See ST-03 (bus) and ST-04 (driver) for status lifecycles.', x: 40, y: 620, w: 380, h: 50 }],
  700
)

// ─── ST-05 Staff activation ──────────────────────────────────────────────────

buildState(
  '05-staff-account-activation.drawio',
  'State: Staff Account Activation — Vertical Flow (users)',
  [
    { type: 'initial', key: 'init', x: 283, y: 72 },
    { key: 'active', label: 'active&lt;br&gt;(isActive: true)', x: 220, y: 128, fill: '#d5e8d4' },
    { key: 'deactivated', label: 'deactivated&lt;br&gt;(isActive: false)', x: 220, y: 228, fill: '#f8cecc' },
  ],
  [
    { from: 'init', to: 'active', label: 'POST /api/users (default)' },
    { from: 'active', to: 'deactivated', label: 'PUT isActive: false' },
    { from: 'deactivated', to: 'active', label: 'PUT isActive: true' },
  ],
  [{ text: 'Deactivated → login returns 403.&lt;br&gt;Administrator updates via Users module.', x: 30, y: 320, w: 400, h: 40 }],
  400
)

// ─── ST-06 Auth session (Login) ──────────────────────────────────────────────

buildState(
  '06-auth-session.drawio',
  'State: Authentication Session — Vertical Flow (Login)',
  [
    { type: 'initial', key: 'init', x: 283, y: 72 },
    { key: 'unauth', label: 'unauthenticated', x: 220, y: 128, fill: '#f8cecc' },
    { key: 'auth', label: 'authenticated&lt;br&gt;(JWT stored)', x: 220, y: 228, fill: '#d5e8d4' },
    { key: 'loggedout', label: 'logged out', x: 220, y: 328, fill: '#fff2cc' },
  ],
  [
    { from: 'init', to: 'unauth', label: 'open /login' },
    { from: 'unauth', to: 'auth', label: 'POST /api/auth/login OK' },
    { from: 'unauth', to: 'unauth', label: '401 invalid credentials', curved: true },
    { from: 'auth', to: 'loggedout', label: 'logout() clears token' },
    { from: 'loggedout', to: 'unauth', label: 'redirect /login' },
    { from: 'auth', to: 'unauth', label: '401 on /auth/me → re-login', curved: true },
  ],
  [{ text: 'Staff isActive:false → 403 at login.&lt;br&gt;All roles share same session pattern.', x: 30, y: 400, w: 400, h: 40 }],
  480
)

// ─── ST-07 Driver trip view (My Trips) ───────────────────────────────────────

buildState(
  '07-driver-trip-view.drawio',
  'State: Driver Trip View — Vertical Flow (My Trips / schedules)',
  [
    { type: 'initial', key: 'init', x: 283, y: 72 },
    { key: 'scheduled', label: 'scheduled / approved', x: 220, y: 128, fill: '#dae8fc' },
    { key: 'ontime', label: 'on-time', x: 220, y: 218, fill: '#d5e8d4' },
    { key: 'delayed', label: 'delayed', x: 420, y: 218, fill: '#ffe6cc' },
    { key: 'completed', label: 'completed', x: 220, y: 308, fill: '#e1d5e7' },
    { key: 'cancelled', label: 'cancelled', x: 20, y: 308, fill: '#f8cecc' },
  ],
  [
    { from: 'init', to: 'scheduled', label: 'GET /api/schedules (driver filter)' },
    { from: 'scheduled', to: 'ontime', label: 'PUT status on-time' },
    { from: 'scheduled', to: 'delayed', label: 'trip adjustment / delay' },
    { from: 'scheduled', to: 'cancelled', label: 'cancel trip' },
    { from: 'ontime', to: 'completed', label: 'trip ends' },
    { from: 'delayed', to: 'completed', label: 'trip ends' },
    { from: 'delayed', to: 'cancelled', label: 'cancel trip' },
  ],
  [{ text: 'Driver sees assigned trips only.&lt;br&gt;Full lifecycle in ST-01 (includes draft/pending).', x: 30, y: 380, w: 420, h: 40 }],
  460
)

// ─── ST-08 Bus maintenance cycle (Fuel & Maintenance) ────────────────────────

buildState(
  '08-bus-maintenance-cycle.drawio',
  'State: Bus Maintenance Cycle — Vertical Flow (Fuel &amp; Maintenance)',
  [
    { type: 'initial', key: 'init', x: 283, y: 72 },
    { key: 'available', label: 'available', x: 220, y: 128, fill: '#d5e8d4' },
    { key: 'maintenance', label: 'maintenance', x: 220, y: 228, fill: '#fff2cc' },
    { key: 'inservice', label: 'in-service', x: 420, y: 228, fill: '#dae8fc' },
  ],
  [
    { from: 'init', to: 'available', label: 'bus registered' },
    { from: 'available', to: 'maintenance', label: 'POST /api/maintenance' },
    { from: 'inservice', to: 'maintenance', label: 'POST /api/maintenance (breakdown)' },
    { from: 'maintenance', to: 'available', label: 'PUT bus status (service done)' },
    { from: 'maintenance', to: 'inservice', label: 'PUT bus status (return to route)' },
    { from: 'available', to: 'inservice', label: 'assigned to trip' },
    { from: 'inservice', to: 'available', label: 'trip completed' },
  ],
  [{ text: 'Maintenance log auto-sets bus → maintenance.&lt;br&gt;Fuel logs do not change bus status.', x: 30, y: 400, w: 420, h: 40 }],
  480
)

console.log('Generated extension draw.io files: SEQ-06…12, ST-05…08')
