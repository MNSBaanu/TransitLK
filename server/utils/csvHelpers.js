/** Parse CSV text into { headers, rows } (supports quoted fields). */
export function parseCsv(text) {
  const normalized = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()

  if (!normalized) return { headers: [], rows: [] }

  const lines = []
  let line = ''
  let inQuotes = false

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i]
    if (ch === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        line += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
        line += ch
      }
    } else if (ch === '\n' && !inQuotes) {
      if (line.trim()) lines.push(line)
      line = ''
    } else {
      line += ch
    }
  }
  if (line.trim()) lines.push(line)

  const parseLine = (raw) => {
    const cells = []
    let current = ''
    let quoted = false
    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i]
      if (ch === '"') {
        if (quoted && raw[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          quoted = !quoted
        }
      } else if (ch === ',' && !quoted) {
        cells.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    cells.push(current.trim())
    return cells
  }

  const headers = parseLine(lines[0]).map((h) => h.trim())
  const rows = lines.slice(1).map((raw, index) => {
    const values = parseLine(raw)
    const row = { __row: index + 2 }
    headers.forEach((header, colIndex) => {
      row[header] = values[colIndex] ?? ''
    })
    return row
  })

  return { headers, rows }
}

export function escapeCsvCell(value) {
  const str = value == null ? '' : String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function rowsToCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const body = rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(','))
  return [headerLine, ...body].join('\n')
}

export function parseBoolean(value, defaultValue = true) {
  if (value == null || value === '') return defaultValue
  const v = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'y'].includes(v)) return true
  if (['false', '0', 'no', 'n'].includes(v)) return false
  return defaultValue
}

export function parseOptionalDate(value) {
  if (!value?.trim()) return undefined
  const d = new Date(value.trim())
  if (Number.isNaN(d.getTime())) return null
  return d
}
