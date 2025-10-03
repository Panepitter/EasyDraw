# 🎨 Professional Drawing Web App

Un'applicazione web professionale per il disegno digitale, ottimizzata per dispositivi mobili e desktop.

## ✨ Caratteristiche Principali

### 🖌️ Strumenti di Disegno
- **Pennelli**: Round, Calligrafia, Marker, Soft, Dynamic, Textured, Splatter, Neon, Watercolor
- **Matita**: Per disegni precisi
- **Gomma**: Cancella con precisione
- **Forme**: Linee, Rettangoli, Cerchi
- **Testo**: Con anteprima live, posizionamento interattivo, rotazione e scelta font
- **Riempimento**: Fill tool con algoritmo avanzato
- **Contagocce**: Preleva colori dal canvas

### 🎨 Sistema Colori
- Color picker con palette predefinite
- Colori recenti (ultimi 16)
- Native color picker integrato
- Colori separati per pennelli e testo

### 📚 Sistema Layer
- Creazione multipla di layer
- Visibilità e opacità regolabili
- Lock/Unlock layer
- Riordino drag & drop
- Eliminazione selettiva

### ↩️ Undo/Redo
- Sistema avanzato cross-layer
- Mantiene lo stato di tutti i layer
- Fino a 50 stati salvati
- Funziona indipendentemente dal layer attivo

### 🔧 Controlli Avanzati
- **Zoom**: Pinch-to-zoom, rotella mouse, pulsanti
- **Pan Mode**: Sposta il canvas liberamente
- **Griglia**: Per allineamenti precisi
- **Righello**: Guide di misura
- **Dark Mode**: Tema scuro/chiaro

### 💾 Gestione Progetti
- Salvataggio progetti in formato JSON
- Caricamento progetti salvati
- Export PNG/JPG
- Ridimensionamento canvas

### 📱 Mobile-Optimized
- UI compatta e touch-friendly
- Gesture support (pinch, pan, drag)
- Pannelli slide-up/slide-out
- Pulsanti dimensionati per touch
- Responsive design

## 🚀 Deploy

### Railway
Il progetto è pronto per il deploy su Railway:

```bash
# 1. Crea un nuovo progetto su Railway
# 2. Connetti questo repository
# 3. Railway rileverà automaticamente:
#    - Procfile
#    - requirements.txt
#    - runtime.txt
# 4. Deploy automatico!
```

### Locale
```bash
# Installa dipendenze
pip install -r requirements.txt

# Avvia il server
python server.py

# Apri http://localhost:5000
```

## 📋 Requisiti

- Python 3.11+
- Flask 3.0.0
- flask-cors 4.0.0
- Pillow 10.2.0+

## 🛠️ Tecnologie

**Backend:**
- Flask (Python)
- Flask-CORS
- Pillow (per elaborazione immagini)

**Frontend:**
- HTML5 Canvas
- Vanilla JavaScript (ES6+)
- CSS3 (Custom Properties, Grid, Flexbox)

## 📁 Struttura Progetto

```
draw-game/
├── server.py           # Server Flask
├── app.js             # Logica applicazione
├── index.html         # UI principale
├── styles.css         # Stili CSS
├── requirements.txt   # Dipendenze Python
├── Procfile          # Config Railway
├── runtime.txt       # Versione Python
├── projects/         # Progetti salvati (gitignored)
└── exports/          # Export immagini (gitignored)
```

## 🎯 Features Avanzate

### Text Tool
- Anteprima live mentre scrivi
- 8 font disponibili
- Dimensione: 12-200px
- Peso: Light, Normal, Semi-Bold, Bold, Black
- Posizionamento interattivo con drag
- Rotazione a step di 15°
- Colore indipendente dai pennelli

### Brush System
- 9 tipi di pennello diversi
- Interpolazione punti per tratti fluidi
- Effetti dinamici (splatter, neon, watercolor)
- Dimensione: 1-100px
- Opacità: 0-100%

### Layer System
- Salvataggio stato completo di tutti i layer
- Undo/Redo cross-layer
- Compositing in tempo reale
- Clear all layers

## 📝 Licenza

Questo progetto è stato creato per uso personale e didattico.

## 🤝 Contributi

Progetto sviluppato con l'assistenza di Claude AI.

---

**Creato con ❤️ e 🎨**
