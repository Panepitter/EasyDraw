# 📁 Struttura Progetto - Professional Drawing App

## 🗂️ File Principali

### 🔧 Configurazione Deploy
```
├── Procfile              # Railway: comando avvio (web: python server.py)
├── requirements.txt      # Dipendenze Python (Flask, flask-cors, Pillow)
├── runtime.txt           # Versione Python (3.11.9)
├── .gitignore           # File da ignorare in Git
└── .dockerignore        # File da ignorare in Docker (se usato)
```

### 💻 Codice Applicazione
```
├── server.py            # Backend Flask (311 righe)
│   ├── Routes: /, /api/save-project, /api/load-project, /api/export
│   ├── CORS abilitato
│   └── Usa PORT da env (Railway-ready)
│
├── index.html           # UI principale (403 righe)
│   ├── Toolbar con strumenti
│   ├── Canvas area
│   ├── Bottom control bar
│   ├── Pannelli laterali (Menu, Layers, Settings)
│   └── Pannelli bottom (Canvas Control, Text Tool)
│
├── app.js               # Logica applicazione (2736+ righe)
│   ├── Classe DrawingApp principale
│   ├── Sistema layer completo
│   ├── Undo/Redo cross-layer
│   ├── 9 tipi di pennello
│   ├── Text tool avanzato
│   ├── Color picker dedicati
│   └── Gesture handling (touch + mouse)
│
└── styles.css           # Stili CSS (1243+ righe)
    ├── CSS Variables per temi
    ├── Mobile-first design
    ├── Responsive layout
    └── Animazioni e transizioni
```

### 📚 Documentazione
```
├── README.md            # Documentazione principale
├── DEPLOY.md            # Guida deploy Railway
└── PROJECT_STRUCTURE.md # Questo file
```

### 📂 Directory Runtime (Gitignored)
```
├── projects/            # Progetti salvati (.json)
│   └── project_*.json  # Formato: { width, height, layers[], ... }
│
├── exports/             # Export immagini (.png, .jpg)
│   └── drawing_*.png   # Generati on-demand
│
└── venv/               # Virtual environment Python
    └── (dipendenze installate)
```

## 📊 Statistiche Codice

| File | Righe | Descrizione |
|------|-------|-------------|
| `app.js` | 2736+ | Logica principale app |
| `styles.css` | 1243+ | Stili e layout |
| `index.html` | 403 | Struttura UI |
| `server.py` | 311 | Backend Flask |
| **TOTALE** | **4693+** | Linee di codice |

## 🎨 Componenti Principali

### 1. Drawing Engine (`app.js`)
```javascript
class DrawingApp {
    // Proprietà Core
    canvas, ctx, layers[], currentLayerIndex
    history[], historyStep
    currentTool, brushType, currentColor
    
    // Sistemi
    setupEventListeners()    // Mouse + Touch
    saveState()              // Multi-layer history
    undo() / redo()          // Cross-layer
    
    // Strumenti
    drawBrush()              // 9 varianti
    drawShape()              // Forme geometriche
    drawTextPreview()        // Text tool live
    floodFill()              // Riempimento
    
    // Layer Management
    addLayer()
    deleteLayer()
    reorderLayer()
    composeLayers()          // Rendering finale
}
```

### 2. UI Components (`index.html`)

**Toolbar (Sinistra):**
- Strumenti disegno (brush, pencil, eraser, etc.)
- Forme (line, rectangle, circle)
- Text, Fill, Eyedropper

**Bottom Control Bar:**
- Color picker
- Brush size slider (1-100)
- Opacity slider (0-100)
- Pan mode toggle
- Canvas control
- Zoom controls

**Side Panels:**
- Menu (New, Save, Open, Export, Clear, Resize)
- Layers (Add, Delete, Reorder, Visibility, Opacity)
- Settings (Dark mode, Antialiasing, Smoothing, Grid, Ruler)

**Bottom Panels:**
- Canvas Control (Resize, Fit, Center, Reset Zoom)
- Text Tool (Input, Font, Size, Weight, Color, Apply/Cancel)

### 3. Styling System (`styles.css`)

**CSS Variables:**
```css
:root {
    --primary: #6366f1;
    --bg-primary: #ffffff;
    --text-primary: #1f2937;
    /* ... */
}

[data-theme="dark"] {
    --bg-primary: #1f2937;
    --text-primary: #f3f4f6;
    /* ... */
}
```

**Layout:**
- Flexbox per control bar
- Grid per palette e tool grid
- Fixed positioning per pannelli
- Transform per animazioni

**Responsive:**
- Mobile-first approach
- Touch-friendly (min 32px)
- Compact controls
- Slide-up panels

### 4. Backend API (`server.py`)

**Endpoints:**
```python
GET  /                    # Serve index.html
GET  /<path>              # Serve static files
POST /api/save-project    # Salva progetto JSON
GET  /api/load-project/:id # Carica progetto
POST /api/export          # Export PNG/JPG
GET  /api/projects        # Lista progetti salvati
```

**Features:**
- CORS abilitato per tutti gli origin
- JSON serialization per progetti
- Base64 decode per export immagini
- File system storage (projects/, exports/)

## 🔄 Flusso Dati

### Disegno
```
User Input (Mouse/Touch)
    ↓
getCoordinates() → Normalizza coordinate
    ↓
startDrawing() → Inizializza stroke
    ↓
draw() → Disegna su layer corrente
    ↓
stopDrawing() → Finalizza + saveState()
    ↓
composeLayers() → Renderizza tutti i layer sul canvas principale
```

### Layer System
```
layers[] = [
    {
        id: timestamp,
        name: "Livello 1",
        visible: true,
        opacity: 1,
        canvas: HTMLCanvasElement,
        locked: false
    },
    // ... altri layer
]
```

### History System
```
history[] = [
    {
        layers: [
            "data:image/png;base64,...",  // Layer 1 stato
            "data:image/png;base64,..."   // Layer 2 stato
        ],
        currentLayerIndex: 0
    },
    // ... altri stati
]
```

## 🎯 Design Patterns Usati

1. **Singleton**: `DrawingApp` classe unica
2. **Observer**: Event listeners per UI
3. **Command**: Undo/Redo con history
4. **State**: `isDrawing`, `isPlacingText`, etc.
5. **Factory**: Brush types con switch/case
6. **Composite**: Layer system gerarchico

## 🚀 Performance Optimizations

- **Canvas off-screen**: Layer separati
- **Debounce**: Resize, zoom events
- **Request Animation Frame**: Smooth animations
- **Image preloading**: History undo/redo
- **Event delegation**: Touch/mouse handling
- **CSS transforms**: Hardware-accelerated animations

## 📦 Dipendenze

**Python:**
- Flask 3.0.0 (Web framework)
- flask-cors 4.0.0 (CORS support)
- Pillow ≥10.2.0 (Image processing)

**Frontend:**
- Vanilla JavaScript (No frameworks!)
- HTML5 Canvas API
- CSS3 (Custom Properties, Grid, Flexbox)

## 🔒 Security

- CORS configurato (produzione: specifico origin)
- File upload validation (dimensione, tipo)
- Path traversal prevention
- XSS protection (no innerHTML dinamico)
- CSRF protection (in sviluppo)

## 📝 Convenzioni Codice

**JavaScript:**
- camelCase per variabili e metodi
- PascalCase per classi
- UPPER_SNAKE_CASE per costanti
- Commenti descrittivi per logica complessa

**CSS:**
- kebab-case per classi
- BEM-like naming (`panel-header`, `control-icon-btn`)
- Mobile-first media queries
- CSS Variables per theming

**Python:**
- PEP 8 compliant
- snake_case per funzioni
- Type hints quando possibile
- Docstrings per funzioni pubbliche

---

**Struttura pulita, codice organizzato, pronto per il deploy! 🚀**
