# Build embedded map template apps into frontend/static/template-apps/
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$OutRoot = Join-Path $Root 'frontend\static\template-apps'
$Shared = Join-Path $Root 'template-apps\shared'

function Install-EmbedAssets {
    param([string]$OutDir)

    foreach ($file in @('infraEmbed.js', 'infraBridgeBoot.js', 'infra-embed.css')) {
        Copy-Item (Join-Path $Shared $file) (Join-Path $OutDir $file) -Force
    }

    $indexPath = Join-Path $OutDir 'index.html'
    $index = Get-Content $indexPath -Raw
    if ($index -notmatch 'infra-embed\.css') {
        $index = $index -replace '</head>', "    <link rel=`"stylesheet`" href=`"./infra-embed.css`" />`r`n  </head>"
    }
    if ($index -notmatch 'infraBridgeBoot\.js') {
        $index = $index -replace '</body>', "    <script type=`"module`" src=`"./infraBridgeBoot.js`"></script>`r`n  </body>"
    }
    Set-Content $indexPath $index -NoNewline
}

function Apply-ReactPatches {
    param([string]$WorkDir, [string]$Name)

    Copy-Item (Join-Path $Shared 'infraEmbed.js') (Join-Path $WorkDir 'src\infraEmbed.js') -Force
    Copy-Item (Join-Path $Shared 'infra-embed.css') (Join-Path $WorkDir 'src\infra-embed.css') -Force
    Copy-Item (Join-Path $Shared 'registerBridge.js') (Join-Path $WorkDir 'src\registerBridge.js') -Force

    $app = Join-Path $WorkDir 'src\App.jsx'
    $content = Get-Content $app -Raw

    if ($content -notmatch 'registerMapTemplateBridge') {
        $content = $content -replace "import './App.css'", "import './App.css'`r`nimport { registerMapTemplateBridge, tileUrlForEmbed } from './registerBridge.js'"
        $content = $content -replace "L\.tileLayer\('https://\{s\}\.basemaps\.cartocdn\.com/dark_all/\{z\}/\{x\}/\{y\}\{r\}\.png'", "L.tileLayer(tileUrlForEmbed()"
    }

    # Always pin Leaflet +/- zoom to top-right so it never overlaps left-side UI.
    if ($content -match 'L\.map\(' -and $content -notmatch "L\.control\.zoom\(\{\s*position:\s*'topright'\s*\}\)") {
        # L.map(el).setView(...)  → disable default zoom, add topright control
        if ($content -match 'L\.map\([^,\)]+\)\.setView') {
            $content = $content -replace 'L\.map\(([^,\)]+)\)\.setView', "L.map(`$1, { zoomControl: false }).setView"
            $content = $content -replace '(const map = L\.map\([^\n]+\n)', "`$1    L.control.zoom({ position: 'topright' }).addTo(map)`r`n"
        }
        # L.map(el, { ... zoomControl: false ... }).setView(...)  → add topright control
        elseif ($content -match 'zoomControl:\s*false') {
            $content = $content -replace '(\}\)\.setView\([^\n]+\n)', "`$1      L.control.zoom({ position: 'topright' }).addTo(map)`r`n"
        }
    }

    switch ($Name) {
        'transit-propensity' {
            $analysis = Join-Path $WorkDir 'src\services\analysis.js'
            (Get-Content $analysis -Raw) -replace "const API_BASE = import\.meta\.env\.DEV[\s\S]*?: 'http://127\.0\.0\.1:8000/api'", "const API_BASE = '/api/transit-propensity'" | Set-Content $analysis -NoNewline
            $analysisContent = Get-Content $analysis -Raw
            $analysisContent = $analysisContent -replace "if \(!response\.ok\) \{\s+throw new Error\('Analysis request failed\.'\)\s+\}", "if (!response.ok) { const errBody = await response.json().catch(() => ({})); throw new Error(errBody.message || 'Analysis request failed.') }"
            $analysisContent = $analysisContent -replace "  \} catch \{\s+return \{\s+status: 'error',\s+message: 'Something went wrong while running the analysis\. Please try again\.',\s+\}\s+\}", "  } catch (error) { return { status: 'error', message: error?.message || 'Something went wrong while running the analysis. Please try again.' } }"
            Set-Content $analysis $analysisContent -NoNewline
            $bridge = @'

  useEffect(() => {
    registerMapTemplateBridge(
      () => ({
        center: mapInstanceRef.current
          ? [mapInstanceRef.current.getCenter().lat, mapInstanceRef.current.getCenter().lng]
          : MAP_CENTER,
        zoom: mapInstanceRef.current?.getZoom() ?? MAP_ZOOM,
        corridor,
        stations,
        layerVisibility,
        ioInputs,
        ioOutputs,
        lastCorridorMeta,
        lastStationMeta,
      }),
      (state) => {
        if (!state || typeof state !== 'object') return
        if (state.corridor !== undefined) setCorridor(state.corridor)
        if (state.stations) setStations(state.stations)
        if (state.layerVisibility) setLayerVisibility(state.layerVisibility)
        if (state.ioInputs !== undefined) setIoInputs(state.ioInputs)
        if (state.ioOutputs !== undefined) setIoOutputs(state.ioOutputs)
        if (state.lastCorridorMeta !== undefined) setLastCorridorMeta(state.lastCorridorMeta)
        if (state.lastStationMeta !== undefined) setLastStationMeta(state.lastStationMeta)
        const map = mapInstanceRef.current
        if (map && Array.isArray(state.center) && typeof state.zoom === 'number') {
          map.setView(state.center, state.zoom)
        }
      }
    )
  }, [corridor, stations, layerVisibility, ioInputs, ioOutputs, lastCorridorMeta, lastStationMeta])
'@
            $content = $content -replace '(\s+return \(\s+<div className="page">)', ($bridge + '$1')
        }
        'bikeability' {
            $street = Join-Path $WorkDir 'src\services\streetNetwork.js'
            (Get-Content $street -Raw) -replace "const CITY_API_URL = import\.meta\.env\.DEV[\s\S]*?: 'http://127\.0\.0\.1:8000/api/city'", "const CITY_API_URL = '/api/bikeability/city'" | Set-Content $street -NoNewline
            $streetContent = Get-Content $street -Raw
            $streetContent = $streetContent -replace "if \(!response\.ok\) \{\s+throw new Error\('City analysis request failed\.'\)\s+\}", "if (!response.ok) { const errBody = await response.json().catch(() => ({})); throw new Error(errBody.message || 'City analysis request failed.') }"
            $streetContent = $streetContent -replace "  \} catch \{\s+return \{\s+status: 'error',\s+message: 'Something went wrong while loading the street network\. Please try again\.',\s+\}\s+\}", "  } catch (error) { return { status: 'error', message: error?.message || 'Something went wrong while loading the street network. Please try again.' } }"
            Set-Content $street $streetContent -NoNewline
            $chat = Join-Path $WorkDir 'src\ChatPane.jsx'
            if (Test-Path $chat) {
                $chatContent = Get-Content $chat -Raw
                $chatContent = $chatContent -replace "    \} catch \{\s+setMessages\(\(prev\) => \[\s+\.\.\.prev,\s+\{\s+id: crypto\.randomUUID\(\),\s+role: 'assistant',\s+type: 'text',\s+text: 'Something went wrong while loading the street network\. Please try again\.',\s+\},\s+\]\)\s+\}", "    } catch (error) {`r`n      setMessages((prev) => [`r`n        ...prev,`r`n        {`r`n          id: crypto.randomUUID(),`r`n          role: 'assistant',`r`n          type: 'text',`r`n          text: error?.message || 'Something went wrong while loading the street network. Please try again.',`r`n        },`r`n      ])`r`n    }"
                Set-Content $chat $chatContent -NoNewline
            }
            $content = $content -replace 'const streetLayerRef = useRef\(null\)', "const streetLayerRef = useRef(null)`r`n  const savedStateRef = useRef({ city: '', geojson: null, options: {} })"
            $content = $content -replace 'if \(result\.status === ''success''\) \{\s+updateStreetLayer\(result\.geojson\)\s+\}', "if (result.status === 'success') {`r`n      savedStateRef.current = { city: cityName, geojson: result.geojson, options }`r`n      updateStreetLayer(result.geojson)`r`n    }"
            $bridge = @'

  useEffect(() => {
    registerMapTemplateBridge(
      () => ({
        center: mapInstanceRef.current
          ? [mapInstanceRef.current.getCenter().lat, mapInstanceRef.current.getCenter().lng]
          : MAP_CENTER,
        zoom: mapInstanceRef.current?.getZoom() ?? MAP_ZOOM,
        city: savedStateRef.current.city,
        weights: savedStateRef.current.options?.weights ?? null,
        accidentYear: savedStateRef.current.options?.accidentYear ?? null,
        streetNetwork: savedStateRef.current.geojson,
      }),
      (state) => {
        if (!state || typeof state !== 'object') return
        if (state.streetNetwork) {
          savedStateRef.current = {
            city: state.city ?? '',
            geojson: state.streetNetwork,
            options: { weights: state.weights, accidentYear: state.accidentYear },
          }
          updateStreetLayer(state.streetNetwork)
        }
        const map = mapInstanceRef.current
        if (map && Array.isArray(state.center) && typeof state.zoom === 'number') {
          map.setView(state.center, state.zoom)
        }
      }
    )
  }, [updateStreetLayer])
'@
            $content = $content -replace '(\s+return \(\s+<div className="page">)', ($bridge + '$1')
        }
        'micromobility-light' {
            $osm = Join-Path $WorkDir 'src\services\pedestrianOsm.js'
            if (Test-Path $osm) {
                (Get-Content $osm -Raw) -replace "const OVERPASS_URLS = \[[^\]]+\]", "const OVERPASS_URLS = ['/api/overpass', '/api/overpass-alt', '/api/overpass-fr']" | Set-Content $osm -NoNewline
            }
            $bridge = @'

  useEffect(() => {
    registerMapTemplateBridge(
      () => ({
        center: mapInstanceRef.current
          ? [mapInstanceRef.current.getCenter().lat, mapInstanceRef.current.getCenter().lng]
          : MAP_CENTER,
        zoom: mapInstanceRef.current?.getZoom() ?? MAP_ZOOM,
        phase: workflowPhase,
        intersectionMode,
        pickedPoints,
        pedestrianNetwork,
        analysis,
        approachCounts,
        crosswalkSignalMode,
        crosswalkSignalTiming,
      }),
      (state) => {
        if (!state || typeof state !== 'object') return
        if (state.phase) setWorkflowPhase(state.phase)
        if (state.intersectionMode !== undefined) setIntersectionMode(state.intersectionMode)
        if (state.pickedPoints) setPickedPoints(state.pickedPoints)
        if (state.pedestrianNetwork !== undefined) setPedestrianNetwork(state.pedestrianNetwork)
        if (state.analysis !== undefined) setAnalysis(state.analysis)
        if (state.approachCounts) setApproachCounts(state.approachCounts)
        if (state.crosswalkSignalMode !== undefined) setCrosswalkSignalMode(state.crosswalkSignalMode)
        if (state.crosswalkSignalTiming !== undefined) setCrosswalkSignalTiming(state.crosswalkSignalTiming)
        const map = mapInstanceRef.current
        if (map && Array.isArray(state.center) && typeof state.zoom === 'number') {
          map.setView(state.center, state.zoom)
        }
      }
    )
  }, [workflowPhase, intersectionMode, pickedPoints, pedestrianNetwork, analysis, approachCounts, crosswalkSignalMode, crosswalkSignalTiming])
'@
            $content = $content -replace '(\s+return \(\s+<div className="page">)', ($bridge + '$1')
        }
    }

    Set-Content $app $content -NoNewline

    $outDir = (Join-Path $OutRoot $Name) -replace '\\', '/'
    $viteConfig = @"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/template-apps/$Name/',
  optimizeDeps: { include: ['leaflet'] },
  build: { outDir: '$outDir', emptyOutDir: true }
})
"@
    Set-Content (Join-Path $WorkDir 'vite.config.js') $viteConfig
}

function Build-ReactApp {
    param([string]$Name, [string]$SourceDir)
    $work = Join-Path $env:TEMP "infrapedia-build-$Name"
    if (Test-Path $work) { Remove-Item $work -Recurse -Force }
    Copy-Item $SourceDir $work -Recurse
    Apply-ReactPatches -WorkDir $work -Name $Name
    Push-Location $work
    try {
        if (-not (Test-Path 'node_modules')) { npm install }
        npm run build
        Install-EmbedAssets -OutDir (Join-Path $OutRoot $Name)
    } finally {
        Pop-Location
    }
}

New-Item -ItemType Directory -Force -Path $OutRoot | Out-Null

$foodSrc = 'C:\Users\User\Downloads\Python Packages and Files\Food Journey Map Tracker v11'
$foodOut = Join-Path $OutRoot 'food-journey'
if (Test-Path $foodOut) { Remove-Item $foodOut -Recurse -Force }
New-Item -ItemType Directory -Force -Path $foodOut | Out-Null
Copy-Item (Join-Path $foodSrc '*') $foodOut -Force
Copy-Item (Join-Path $Shared 'infraEmbed.js') (Join-Path $foodOut 'infraEmbed.js') -Force

$foodBridge = @'
<script type="module">
import { initInfraBridge } from './infraEmbed.js';

function exportFoodState() {
  const mapObj = window.__foodMap;
  return {
    center: mapObj ? [mapObj.getCenter().lat, mapObj.getCenter().lng] : [1.3521, 103.8198],
    zoom: mapObj ? mapObj.getZoom() : 12,
    ratings: JSON.parse(localStorage.getItem('foodRatings') || '{}'),
    filterFood: document.querySelector('select')?.value || '',
    customPlaces: JSON.parse(localStorage.getItem('customFoodPlaces') || '[]')
  };
}

function importFoodState(state) {
  if (!state || typeof state !== 'object') return;
  if (state.ratings) localStorage.setItem('foodRatings', JSON.stringify(state.ratings));
  if (state.customPlaces) localStorage.setItem('customFoodPlaces', JSON.stringify(state.customPlaces));
  sessionStorage.setItem('infraFoodRestore', JSON.stringify({ center: state.center, zoom: state.zoom, filterFood: state.filterFood }));
  location.reload();
}

initInfraBridge(exportFoodState, importFoodState);
</script>
'@

$index = Get-Content (Join-Path $foodOut 'index.html') -Raw
$index = $index -replace '</body>', ($foodBridge + '</body>')
Set-Content (Join-Path $foodOut 'index.html') $index -NoNewline

$script = Get-Content (Join-Path $foodOut 'script.js') -Raw
if ($script -match "let map = L\.map\('map'\)\.setView\(") {
    $script = $script -replace "let map = L\.map\('map'\)\.setView\(", "let map = L.map('map', { zoomControl: false }); window.__foodMap = map; L.control.zoom({ position: 'topright' }).addTo(map); map.setView("
} elseif ($script -match "zoomControl:\s*false" -and $script -notmatch 'window\.__foodMap') {
    $script = $script -replace "let map = L\.map\('map',\s*\{\s*zoomControl:\s*false\s*\}\);\s*", "let map = L.map('map', { zoomControl: false }); window.__foodMap = map; "
}
$script += @'

const restoreRaw = sessionStorage.getItem('infraFoodRestore');
if (restoreRaw) {
  try {
    const restore = JSON.parse(restoreRaw);
    if (Array.isArray(restore.center) && typeof restore.zoom === 'number') {
      map.setView(restore.center, restore.zoom);
    }
    sessionStorage.removeItem('infraFoodRestore');
  } catch {}
}
'@
Set-Content (Join-Path $foodOut 'script.js') $script -NoNewline
Install-EmbedAssets -OutDir $foodOut

Build-ReactApp -Name 'transit-propensity' -SourceDir 'C:\Users\User\TransitPropensity\frontend'
Build-ReactApp -Name 'bikeability' -SourceDir 'C:\Users\User\BikeabilityApp\frontend'
Build-ReactApp -Name 'micromobility-light' -SourceDir 'C:\Users\User\micromobility-light\frontend'

Write-Host 'Template apps built to' $OutRoot
