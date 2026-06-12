import { useRef, useState } from 'react'
import api from '../../services/api'
import Icon from '../Icon'
import { ModuleSecondaryButton } from '../layout/ModuleLayout'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function ImportResultPanel({ result, onClose }) {
  if (!result) return null
  const issues = result.errors || []

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <h3 className="text-lg font-semibold text-neutral-900">Import complete</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-4 text-sm">
          <p className="text-neutral-700">
            <span className="font-semibold text-green-700">{result.imported}</span> imported
            {result.skipped > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-amber-700">{result.skipped}</span> skipped
              </>
            )}
          </p>
          {issues.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
                Row notes
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-amber-950">
                {issues.map((item, index) => (
                  <li key={`${item.row}-${index}`}>
                    Row {item.row}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="border-t border-outline-variant px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CsvImportButtons({
  type,
  depotId,
  onSuccess,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const downloadSample = async () => {
    setError('')
    try {
      const { data } = await api.get(`/import/sample/${type}`, { responseType: 'blob' })
      const filenames = {
        vehicles: 'transitlk-vehicles-sample.csv',
        drivers: 'transitlk-drivers-sample.csv',
        routes: 'transitlk-routes-sample.csv',
        users: 'transitlk-users-sample.csv',
        maintenance: 'transitlk-maintenance-sample.csv',
      }
      const filename = filenames[type] || `transitlk-${type}-sample.csv`
      downloadBlob(data, filename)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not download sample CSV')
    }
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setLoading(true)
    setError('')
    try {
      const csv = await file.text()
      const { data } = await api.post(`/import/${type}`, {
        csv,
        ...(depotId ? { depotId } : {}),
      })
      setResult(data)
      onSuccess?.(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ModuleSecondaryButton
        icon="download"
        onClick={downloadSample}
        disabled={disabled || loading}
      >
        Sample CSV
      </ModuleSecondaryButton>
      <ModuleSecondaryButton
        icon="upload"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || loading}
      >
        {loading ? 'Importing…' : 'Import CSV'}
      </ModuleSecondaryButton>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />
      {error && (
        <p className="w-full text-xs text-red-600 sm:w-auto" role="alert">
          {error}
        </p>
      )}
      <ImportResultPanel result={result} onClose={() => setResult(null)} />
    </>
  )
}
