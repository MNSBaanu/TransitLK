# Stitch — Advanced Route Management (SRMSS)

Design reference for the Route Planning UI.

| Field | Value |
|-------|--------|
| **Project** | TransitLK |
| **Project ID** | `1696573123630363766` |
| **Screen** | Advanced Route Management - SRMSS |
| **Screen ID** | `3eb3c49a973946d5a8a410a3970fa523` |
| **Device** | Desktop (2560×2048) |

## Files in this folder

| File | Description |
|------|-------------|
| `advanced-route-management.png` | Screenshot from Stitch |
| `advanced-route-management.html` | Full HTML/Tailwind export from Stitch |

## Layout (from design)

1. **Sidebar** — Depot name, nav (Dashboard, Route Management active, Schedules, Fleet, Maintenance, Analytics), “Assign New Trip”, Logout
2. **Top bar** — “SRMSS Depot”, search routes, Support, notifications, profile
3. **Left panel** — “EXISTING ROUTES” list with route cards (code, status, name, start→end, edit/delete)
4. **Center** — Route form: name, distance, start/end, stops, bus/driver assignment
5. **Right** — Map preview area with route visualization

## Re-fetch from Stitch (URLs expire)

```powershell
# get_screen via Stitch MCP — replace API key from stitch.withgoogle.com/settings
$body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_screen","arguments":{"projectId":"1696573123630363766","screenId":"3eb3c49a973946d5a8a410a3970fa523"}}}'
# Then curl -L the screenshot.downloadUrl and htmlCode.downloadUrl from the response
```

## Implementation target

- React page: `client/src/pages/Routes.jsx`
- API: `GET/POST/PUT/DELETE /api/routes`
- Match existing app shell: `Sidebar.jsx`, `Layout` (do not duplicate full-page sidebar from HTML export)
