# Stitch — Comprehensive Reporting & Analytics (SRMSS)

| Field | Value |
|-------|--------|
| **Project** | TransitLK |
| **Project ID** | `1696573123630363766` |
| **Screen** | Comprehensive Reporting & Analytics - SRMSS |
| **Screen ID** | `49e0f08cefbc45ddb1161a7cd2d48cae` |

## Files

| File | Description |
|------|-------------|
| `comprehensive-reporting-analytics.png` | Screenshot |
| `comprehensive-reporting-analytics.html` | Stitch HTML export |
| `get_screen-response.json` | Raw API response |

## Re-fetch

```powershell
$apiKey = $env:GOOGLE_STITCH_API_KEY
$body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_screen","arguments":{"projectId":"1696573123630363766","screenId":"49e0f08cefbc45ddb1161a7cd2d48cae"}}}'
$outDir = "docs/design/stitch/reporting-analytics"
$resp = Invoke-RestMethod -Uri "https://stitch.googleapis.com/mcp" -Method POST -Headers @{"Content-Type"="application/json"; "X-Goog-Api-Key"=$apiKey} -Body $body
# Then curl downloadUrl fields from $resp
```

## App implementation

- Page: `client/src/pages/Reports.jsx`
- API: `GET /api/reports/dashboard`, `GET /api/reports/export/csv`
