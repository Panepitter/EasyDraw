class DrawingApp {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d', { 
            willReadFrequently: false,
            alpha: true
        });
        
        this.currentTool = 'brush';
        this.brushType = 'round';
        this.currentColor = '#000000';
        this.brushSize = 5;
        this.opacity = 100;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        
        this.layers = [];
        this.currentLayerIndex = 0;
        this.history = [];
        this.historyStep = -1;
        this.isRestoringState = false;
        
        this.smoothing = true;
        this.antialiasing = true;
        this.showGrid = false;
        this.showRuler = false;
        
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        this.touchPoints = [];
        this.lastTouchDistance = 0;
        this.isPanning = false;
        this.panMode = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        
        // Text tool properties
        this.textSettings = {
            font: 'Arial',
            size: 32,
            weight: '400',
            text: '',
            x: 0,
            y: 0,
            rotation: 0,
            color: '#000000'  // Colore separato per il testo
        };
        this.isPlacingText = false;
        this.textPreviewActive = false;
        
        this.pixelRatio = window.devicePixelRatio || 1;
        this.points = [];
        
        this.lastDrawTime = 0;
        this.lastSpeed = 0;
        this.lastAngle = 0;
        
        this.activeToasts = [];
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.createDefaultLayer();
        this.setupEventListeners();
        this.setupUIControls();
        this.loadSettings();
        
        // Salva lo stato iniziale dopo che tutto è pronto
        // Questo permette di avere un punto di partenza per l'undo
        setTimeout(() => {
            this.saveState();
        }, 100);
    }

    setupCanvas() {
        const container = document.querySelector('.canvas-container');
        const rect = container.getBoundingClientRect();
        
        const padding = 40;
        const availableWidth = rect.width - padding;
        const availableHeight = rect.height - padding;
        
        const defaultWidth = 1920;
        const defaultHeight = 1080;
        
        const canvasWidth = Math.min(availableWidth, defaultWidth);
        const canvasHeight = Math.min(availableHeight, defaultHeight);
        
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        
        this.canvas.width = Math.floor(canvasWidth * dpr);
        this.canvas.height = Math.floor(canvasHeight * dpr);
        
        this.canvas.style.width = canvasWidth + 'px';
        this.canvas.style.height = canvasHeight + 'px';
        
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        this.actualDpr = dpr;
        this.displayWidth = canvasWidth;
        this.displayHeight = canvasHeight;
        
        this.applyTransform();
        this.clearCanvas();
    }

    createDefaultLayer() {
        const layer = {
            id: Date.now(),
            name: 'Livello 1',
            visible: true,
            opacity: 1,
            canvas: document.createElement('canvas'),
            locked: false
        };
        layer.canvas.width = this.canvas.width;
        layer.canvas.height = this.canvas.height;
        
        const ctx = layer.canvas.getContext('2d', { alpha: true });
        
        this.layers.push(layer);
        this.updateLayersUI();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        this.canvas.addEventListener('click', () => this.dismissToasts());
        
        window.addEventListener('blur', () => this.dismissToasts());
        window.addEventListener('resize', this.debounce(() => this.handleResize(), 250));
    }

    setupUIControls() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                
                // Se è il tool testo, apri il pannello
                if (this.currentTool === 'text') {
                    this.togglePanel('textPanel');
                    // Aggiorna il colore preview quando si apre
                    const textColorPreview = document.getElementById('textColorPreview');
                    if (textColorPreview) {
                        textColorPreview.style.backgroundColor = this.textSettings.color;
                    }
                }
                
                if (btn.dataset.brushType) {
                    this.brushType = btn.dataset.brushType;
                    this.showToast(this.getBrushTypeName(this.brushType), 'info');
                } else {
                    this.showToast(this.getToolName(this.currentTool), 'info');
                }
            });
        });

        const colorPicker = document.getElementById('colorPicker');
        colorPicker.addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            this.updateColorDisplay(e.target.value);
        });

        // Modern Color Picker
        this.recentColors = JSON.parse(localStorage.getItem('recentColors') || '[]');
        this.setupColorPicker();

        const brushSize = document.getElementById('brushSize');
        const brushSizeValue = document.getElementById('brushSizeValue');
        brushSize.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = this.brushSize;
        });

        const opacity = document.getElementById('opacity');
        const opacityValue = document.getElementById('opacityValue');
        opacity.addEventListener('input', (e) => {
            this.opacity = parseInt(e.target.value);
            opacityValue.textContent = this.opacity + '%';
        });

        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        
        document.getElementById('menuBtn').addEventListener('click', () => this.togglePanel('menuPanel'));
        document.getElementById('layersBtn').addEventListener('click', () => this.togglePanel('layersPanel'));
        document.getElementById('settingsBtn').addEventListener('click', () => this.togglePanel('settingsPanel'));
        
        document.getElementById('closeMenuBtn').addEventListener('click', () => this.togglePanel('menuPanel'));
        document.getElementById('closeLayersBtn').addEventListener('click', () => this.togglePanel('layersPanel'));
        document.getElementById('closeSettingsBtn').addEventListener('click', () => this.togglePanel('settingsPanel'));
        
        document.getElementById('newProjectBtn').addEventListener('click', () => this.newProject());
        document.getElementById('saveProjectBtn').addEventListener('click', () => this.saveProject());
        document.getElementById('openProjectBtn').addEventListener('click', () => this.openProject());
        document.getElementById('exportPngBtn').addEventListener('click', () => this.exportImage('png'));
        document.getElementById('exportJpgBtn').addEventListener('click', () => this.exportImage('jpg'));
        document.getElementById('clearCanvasBtn').addEventListener('click', () => this.confirmClear());
        document.getElementById('resizeCanvasBtn').addEventListener('click', () => this.resizeCanvas());
        
        document.getElementById('addLayerBtn').addEventListener('click', () => this.addLayer());
        
        document.getElementById('darkModeToggle').addEventListener('change', (e) => this.toggleDarkMode(e.target.checked));
        document.getElementById('antialiasingToggle').addEventListener('change', (e) => {
            this.antialiasing = e.target.checked;
            this.ctx.imageSmoothingEnabled = this.antialiasing;
            this.saveSettings();
        });
        document.getElementById('smoothingToggle').addEventListener('change', (e) => {
            this.smoothing = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('gridToggle').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.redrawCanvas();
            this.saveSettings();
        });
        document.getElementById('rulerToggle').addEventListener('change', (e) => {
            this.showRuler = e.target.checked;
            this.redrawCanvas();
            this.saveSettings();
        });
        
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomResetBtn').addEventListener('click', () => this.zoomReset());
        
        document.getElementById('canvasControlBtn').addEventListener('click', () => this.togglePanel('canvasControlPanel'));
        document.getElementById('closeCanvasPanelBtn').addEventListener('click', () => this.togglePanel('canvasControlPanel'));
        document.getElementById('resizeCanvasBtn2').addEventListener('click', () => {
            this.togglePanel('canvasControlPanel');
            this.resizeCanvas();
        });
        document.getElementById('fitCanvasBtn').addEventListener('click', () => {
            this.fitToScreen();
            this.togglePanel('canvasControlPanel');
        });
        document.getElementById('centerCanvasBtn').addEventListener('click', () => {
            this.centerCanvas();
            this.togglePanel('canvasControlPanel');
        });
        document.getElementById('resetZoomBtn').addEventListener('click', () => {
            this.zoomReset();
            this.togglePanel('canvasControlPanel');
        });
        
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        // Pan Mode Button
        document.getElementById('panModeBtn').addEventListener('click', () => this.togglePanMode());
        
        // Text Tool Setup
        this.setupTextTool();
        
        // Chiudi pannelli quando si clicca fuori
        this.setupPanelClickOutside();
        
        this.updateCanvasSizeDisplay();
    }

    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Coordinate del click relative al canvas visualizzato
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Normalizza coordinate (0-1)
        const normalizedX = clickX / rect.width;
        const normalizedY = clickY / rect.height;
        
        // Moltiplica per le dimensioni FISICHE del canvas (con DPR)
        // Perché ora i layer NON sono scalati
        const x = normalizedX * this.canvas.width;
        const y = normalizedY * this.canvas.height;
        
        return { x, y };
    }

    startDrawing(e) {
        this.dismissToasts();
        
        const coords = this.getCoordinates(e);
        
        // Se stiamo posizionando testo, gestisci i controlli
        if (this.isPlacingText) {
            // Check se clicca sul bottone conferma
            if (this.textConfirmBtn && this.isPointInCircle(
                coords.x, coords.y,
                this.textConfirmBtn.x + this.textConfirmBtn.size/2,
                this.textConfirmBtn.y + this.textConfirmBtn.size/2,
                this.textConfirmBtn.size/2
            )) {
                this.confirmTextPlacement();
                return;
            }
            
            // Check se clicca sul bottone rotazione
            if (this.textRotateBtn && this.isPointInCircle(
                coords.x, coords.y,
                this.textRotateBtn.x + this.textRotateBtn.size/2,
                this.textRotateBtn.y + this.textRotateBtn.size/2,
                this.textRotateBtn.size/2
            )) {
                this.textSettings.rotation += 15;
                if (this.textSettings.rotation >= 360) this.textSettings.rotation = 0;
                this.drawTextPreview();
                return;
            }
            
            // Altrimenti inizia drag del testo
            this.isDraggingText = true;
            this.textDragOffsetX = coords.x - this.textSettings.x;
            this.textDragOffsetY = coords.y - this.textSettings.y;
            return;
        }
        
        // Se pan mode è attivo, inizia il pan invece di disegnare
        if (this.panMode) {
            this.isPanning = true;
            this.isDrawing = false; // Assicurati che non disegni
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            return; // Return qui è ok perché isPanning è true
        }
        
        if (this.layers[this.currentLayerIndex]?.locked) {
            this.showToast('Livello bloccato', 'warning');
            return;
        }
        
        this.isDrawing = true;
        this.isPanning = false; // Assicurati che non panni
        this.lastX = coords.x;
        this.lastY = coords.y;
        
        this.points = [{x: coords.x, y: coords.y}];
        
        if (this.currentTool === 'eyedropper') {
            this.pickColor(coords.x, coords.y);
            this.isDrawing = false;
        } else if (this.currentTool === 'fill') {
            this.floodFill(coords.x, coords.y);
            this.saveState();
            this.isDrawing = false;
        } else if (this.currentTool === 'brush' || this.currentTool === 'pencil') {
            // Non disegnare nulla qui - il disegno inizia in draw() quando ci sono almeno 2 punti
            // Questo evita il cerchio pieno iniziale nei pennelli speciali
        }
    }

    draw(e) {
        // Se stiamo draggando il testo, aggiorna la posizione
        if (this.isDraggingText) {
            const coords = this.getCoordinates(e);
            this.textSettings.x = coords.x - this.textDragOffsetX;
            this.textSettings.y = coords.y - this.textDragOffsetY;
            this.drawTextPreview();
            return;
        }
        
        // Se stiamo pannando, muovi il canvas
        if (this.isPanning) {
            const deltaX = e.clientX - this.lastPanX;
            const deltaY = e.clientY - this.lastPanY;
            
            const currentTransform = this.canvas.style.transform || '';
            const translateMatch = currentTransform.match(/translate\(\s*([+-]?\d+\.?\d*)px?\s*,?\s*([+-]?\d+\.?\d*)px?\s*\)/);
            
            let currentX = 0, currentY = 0;
            if (translateMatch) {
                currentX = parseFloat(translateMatch[1]) || 0;
                currentY = parseFloat(translateMatch[2]) || 0;
            }
            
            const newX = currentX + deltaX;
            const newY = currentY + deltaY;
            
            this.canvas.style.transform = `translate(${newX}px, ${newY}px) scale(${this.zoom})`;
            this.canvas.style.transformOrigin = 'center center';
            
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            return;
        }
        
        // Per il disegno normale
        if (!this.isDrawing) return;
        
        const coords = this.getCoordinates(e);
        
        if (['line', 'rectangle', 'circle'].includes(this.currentTool)) {
            this.currentX = coords.x;
            this.currentY = coords.y;
            this.redrawWithPreview();
            return;
        }
        
        const layerCanvas = this.layers[this.currentLayerIndex].canvas;
        const layerCtx = layerCanvas.getContext('2d');
        
        layerCtx.globalAlpha = this.opacity / 100;
        layerCtx.strokeStyle = this.currentColor;
        layerCtx.fillStyle = this.currentColor;
        layerCtx.lineWidth = this.brushSize;
        layerCtx.lineCap = 'round';
        layerCtx.lineJoin = 'round';
        
        switch (this.currentTool) {
            case 'brush':
                this.drawBrushType(layerCtx, coords.x, coords.y);
                break;
            case 'pencil':
                this.drawPencil(layerCtx, coords.x, coords.y);
                break;
            case 'eraser':
                this.drawEraser(layerCtx, coords.x, coords.y);
                break;
        }
        
        this.lastX = coords.x;
        this.lastY = coords.y;
        
        this.composeLayers();
    }
    
    redrawWithPreview() {
        this.composeLayers();
        
        this.ctx.save();
        this.ctx.globalAlpha = this.opacity / 100;
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.fillStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.setLineDash([5, 5]);
        
        switch (this.currentTool) {
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(this.lastX, this.lastY);
                this.ctx.lineTo(this.currentX, this.currentY);
                this.ctx.stroke();
                break;
            case 'rectangle':
                this.ctx.strokeRect(
                    this.lastX, 
                    this.lastY, 
                    this.currentX - this.lastX, 
                    this.currentY - this.lastY
                );
                break;
            case 'circle':
                const radius = Math.sqrt(
                    Math.pow(this.currentX - this.lastX, 2) + 
                    Math.pow(this.currentY - this.lastY, 2)
                );
                this.ctx.beginPath();
                this.ctx.arc(this.lastX, this.lastY, radius, 0, Math.PI * 2);
                this.ctx.stroke();
                break;
        }
        
        this.ctx.setLineDash([]);
        this.ctx.restore();
    }

    stopDrawing(e) {
        // Se stava draggando il testo, ferma il drag
        if (this.isDraggingText) {
            this.isDraggingText = false;
            return;
        }
        
        // Se stavamo pannando, ferma il pan
        if (this.isPanning) {
            this.isPanning = false;
            if (this.panMode) {
                this.canvas.style.cursor = 'grab';
            }
            return;
        }
        
        if (!this.isDrawing) return;
        
        // Flag per sapere se abbiamo disegnato qualcosa
        let hasDrawn = false;
        
        // Per le forme geometriche, disegna la forma finale
        if (['line', 'rectangle', 'circle'].includes(this.currentTool)) {
            if (this.currentX !== undefined && this.currentY !== undefined) {
                this.drawShape(this.currentX, this.currentY);
                hasDrawn = true;
            }
        } else if (['brush', 'pencil', 'eraser'].includes(this.currentTool)) {
            // Per brush/pencil/eraser, controlla se abbiamo almeno 2 punti (movimento minimo)
            hasDrawn = this.points.length > 1;
        }
        
        // Salva lo stato SOLO se abbiamo effettivamente disegnato qualcosa
        if (hasDrawn) {
            this.saveState();
        }
        
        this.isDrawing = false;
        this.points = [];
        this.currentX = undefined;
        this.currentY = undefined;
    }

    drawBrushType(ctx, x, y) {
        switch (this.brushType) {
            case 'round':
                this.drawBrush(ctx, x, y);
                break;
            case 'airbrush':
                this.drawAirbrush(ctx, x, y);
                break;
            case 'calligraphy':
                this.drawCalligraphy(ctx, x, y);
                break;
            case 'marker':
                this.drawMarker(ctx, x, y);
                break;
            case 'soft':
                this.drawSoftBrush(ctx, x, y);
                break;
            case 'dynamic':
                this.drawDynamicBrush(ctx, x, y);
                break;
            case 'textured':
                this.drawTexturedBrush(ctx, x, y);
                break;
            case 'splatter':
                this.drawSplatterBrush(ctx, x, y);
                break;
            case 'neon':
                this.drawNeonBrush(ctx, x, y);
                break;
            case 'watercolor':
                this.drawWatercolorBrush(ctx, x, y);
                break;
            default:
                this.drawBrush(ctx, x, y);
        }
    }

    drawBrush(ctx, x, y) {
        ctx.globalCompositeOperation = 'source-over';
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const steps = Math.max(Math.ceil(distance / 0.5), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                this.points.push({x: interpX, y: interpY});
            }
            
            const startIdx = Math.max(0, this.points.length - steps - 2);
            
            for (let i = startIdx; i < this.points.length - 2; i++) {
                const p0 = this.points[i];
                const p1 = this.points[i + 1];
                const p2 = this.points[i + 2];
                
                if (this.smoothing) {
                    const midX1 = (p0.x + p1.x) / 2;
                    const midY1 = (p0.y + p1.y) / 2;
                    const midX2 = (p1.x + p2.x) / 2;
                    const midY2 = (p1.y + p2.y) / 2;
                    
                    ctx.beginPath();
                    ctx.moveTo(midX1, midY1);
                    ctx.quadraticCurveTo(p1.x, p1.y, midX2, midY2);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        } else {
            this.points.push({x, y});
            ctx.beginPath();
            ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawAirbrush(ctx, x, y) {
        ctx.globalCompositeOperation = 'source-over';
        const originalAlpha = ctx.globalAlpha;
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const steps = Math.max(Math.ceil(distance / 2), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                
                const radius = this.brushSize;
                const density = 50;
                
                for (let j = 0; j < density; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * radius;
                    const offsetX = Math.cos(angle) * dist;
                    const offsetY = Math.sin(angle) * dist;
                    
                    ctx.globalAlpha = originalAlpha * 0.05;
                    ctx.fillStyle = this.currentColor;
                    ctx.beginPath();
                    ctx.arc(interpX + offsetX, interpY + offsetY, 0.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else {
            const radius = this.brushSize;
            const density = 50;
            
            for (let i = 0; i < density; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * radius;
                const offsetX = Math.cos(angle) * distance;
                const offsetY = Math.sin(angle) * distance;
                
                ctx.globalAlpha = originalAlpha * 0.05;
                ctx.fillStyle = this.currentColor;
                ctx.beginPath();
                ctx.arc(x + offsetX, y + offsetY, 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        this.points.push({x, y});
        ctx.globalAlpha = originalAlpha;
    }
    
    drawCalligraphy(ctx, x, y) {
        ctx.globalCompositeOperation = 'source-over';
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const steps = Math.max(Math.ceil(distance / 0.5), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                
                const angle = Math.atan2(dy, dx);
                const width = this.brushSize;
                const height = this.brushSize * 0.3;
                
                ctx.save();
                ctx.translate(interpX, interpY);
                ctx.rotate(angle);
                
                ctx.beginPath();
                ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        } else {
            ctx.beginPath();
            ctx.ellipse(x, y, this.brushSize / 2, this.brushSize * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        this.points.push({x, y});
    }
    
    drawMarker(ctx, x, y) {
        ctx.globalCompositeOperation = 'multiply';
        const originalAlpha = ctx.globalAlpha;
        ctx.globalAlpha = originalAlpha * 0.6;
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const steps = Math.max(Math.ceil(distance / 0.5), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                this.points.push({x: interpX, y: interpY});
            }
            
            const startIdx = Math.max(0, this.points.length - steps - 2);
            
            for (let i = startIdx; i < this.points.length - 2; i++) {
                const p0 = this.points[i];
                const p1 = this.points[i + 1];
                const p2 = this.points[i + 2];
                
                if (this.smoothing) {
                    const midX1 = (p0.x + p1.x) / 2;
                    const midY1 = (p0.y + p1.y) / 2;
                    const midX2 = (p1.x + p2.x) / 2;
                    const midY2 = (p1.y + p2.y) / 2;
                    
                    ctx.lineCap = 'square';
                    ctx.beginPath();
                    ctx.moveTo(midX1, midY1);
                    ctx.quadraticCurveTo(p1.x, p1.y, midX2, midY2);
                    ctx.stroke();
                } else {
                    ctx.lineCap = 'square';
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        } else {
            this.points.push({x, y});
            ctx.lineCap = 'square';
            ctx.beginPath();
            ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = originalAlpha;
        ctx.lineCap = 'round';
    }
    
    drawSoftBrush(ctx, x, y) {
        ctx.globalCompositeOperation = 'source-over';
        const originalAlpha = ctx.globalAlpha;
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const steps = Math.max(Math.ceil(distance / 1), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                
                const radius = this.brushSize;
                const gradient = ctx.createRadialGradient(interpX, interpY, 0, interpX, interpY, radius);
                gradient.addColorStop(0, this.currentColor);
                
                const rgbColor = this.hexToRgb(this.currentColor);
                gradient.addColorStop(0.5, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${originalAlpha * 0.5})`);
                gradient.addColorStop(1, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(interpX, interpY, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            const radius = this.brushSize;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, this.currentColor);
            
            const rgbColor = this.hexToRgb(this.currentColor);
            gradient.addColorStop(0.5, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${originalAlpha * 0.5})`);
            gradient.addColorStop(1, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        this.points.push({x, y});
    }

    drawPencil(ctx, x, y) {
        ctx.globalCompositeOperation = 'source-over';
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const steps = Math.max(Math.ceil(distance / 0.3), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                
                ctx.beginPath();
                ctx.moveTo(lastPoint.x + dx * (t - 1/steps), lastPoint.y + dy * (t - 1/steps));
                ctx.lineTo(interpX, interpY);
                ctx.stroke();
            }
        }
        
        this.points.push({x, y});
    }

    drawEraser(ctx, x, y) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawDynamicBrush(ctx, x, y) {
        ctx.globalCompositeOperation = 'source-over';
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const now = Date.now();
            const timeDelta = (now - this.lastDrawTime) || 16;
            const speed = distance / timeDelta;
            this.lastSpeed = speed;
            this.lastDrawTime = now;
            
            const angle = Math.atan2(dy, dx);
            this.lastAngle = angle;
            
            const steps = Math.max(Math.ceil(distance / 0.5), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                
                const pressureSize = this.brushSize * (0.3 + Math.min(speed * 50, 0.7));
                const directionWidth = pressureSize * (0.6 + Math.abs(Math.sin(angle)) * 0.4);
                const directionHeight = pressureSize * (0.6 + Math.abs(Math.cos(angle)) * 0.4);
                
                ctx.save();
                ctx.translate(interpX, interpY);
                ctx.rotate(angle);
                
                ctx.beginPath();
                ctx.ellipse(0, 0, directionWidth / 2, directionHeight / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        } else {
            this.lastDrawTime = Date.now();
            ctx.beginPath();
            ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        this.points.push({x, y});
    }

    drawTexturedBrush(ctx, x, y) {
        ctx.globalCompositeOperation = 'source-over';
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const steps = Math.max(Math.ceil(distance / 0.3), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                
                const particleCount = Math.floor(this.brushSize / 3);
                for (let j = 0; j < particleCount; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * this.brushSize * 0.5;
                    const offsetX = Math.cos(angle) * dist;
                    const offsetY = Math.sin(angle) * dist;
                    const size = Math.random() * 2 + 0.5;
                    
                    ctx.globalAlpha = (this.opacity / 100) * (0.3 + Math.random() * 0.4);
                    ctx.beginPath();
                    ctx.arc(interpX + offsetX, interpY + offsetY, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else {
            const particleCount = Math.floor(this.brushSize / 3);
            for (let j = 0; j < particleCount; j++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * this.brushSize * 0.5;
                const offsetX = Math.cos(angle) * dist;
                const offsetY = Math.sin(angle) * dist;
                const size = Math.random() * 2 + 0.5;
                
                ctx.globalAlpha = (this.opacity / 100) * (0.3 + Math.random() * 0.4);
                ctx.beginPath();
                ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        this.points.push({x, y});
        ctx.globalAlpha = this.opacity / 100;
    }

    drawSplatterBrush(ctx, x, y) {
        ctx.globalCompositeOperation = 'source-over';
        const originalAlpha = ctx.globalAlpha;
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const now = Date.now();
            const timeDelta = (now - this.lastDrawTime) || 16;
            const speed = distance / timeDelta;
            this.lastSpeed = speed;
            this.lastDrawTime = now;
            
            const angle = Math.atan2(dy, dx);
            
            const steps = Math.max(Math.ceil(distance / 3), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                
                const splatterCount = Math.floor(3 + speed * 50);
                
                for (let j = 0; j < splatterCount; j++) {
                    const spreadAngle = angle + (Math.random() - 0.5) * Math.PI;
                    const spreadDist = Math.random() * this.brushSize * (0.5 + speed * 10);
                    const offsetX = Math.cos(spreadAngle) * spreadDist;
                    const offsetY = Math.sin(spreadAngle) * spreadDist;
                    const size = Math.random() * this.brushSize * 0.15;
                    
                    ctx.globalAlpha = originalAlpha * (0.2 + Math.random() * 0.5);
                    ctx.beginPath();
                    ctx.arc(interpX + offsetX, interpY + offsetY, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else {
            this.lastDrawTime = Date.now();
            for (let j = 0; j < 5; j++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * this.brushSize * 0.5;
                const offsetX = Math.cos(angle) * dist;
                const offsetY = Math.sin(angle) * dist;
                const size = Math.random() * this.brushSize * 0.15;
                
                ctx.globalAlpha = originalAlpha * (0.2 + Math.random() * 0.5);
                ctx.beginPath();
                ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        this.points.push({x, y});
        ctx.globalAlpha = originalAlpha;
    }

    drawNeonBrush(ctx, x, y) {
        ctx.globalCompositeOperation = 'lighter';
        const originalAlpha = ctx.globalAlpha;
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const steps = Math.max(Math.ceil(distance / 0.5), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                
                const rgbColor = this.hexToRgb(this.currentColor);
                
                for (let layer = 2; layer >= 0; layer--) {
                    const radius = this.brushSize * (0.5 + layer * 0.3);
                    const alpha = originalAlpha * (0.6 - layer * 0.15);
                    
                    const gradient = ctx.createRadialGradient(interpX, interpY, 0, interpX, interpY, radius);
                    gradient.addColorStop(0, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${alpha})`);
                    gradient.addColorStop(0.5, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${alpha * 0.5})`);
                    gradient.addColorStop(1, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0)`);
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(interpX, interpY, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else {
            const rgbColor = this.hexToRgb(this.currentColor);
            
            for (let layer = 2; layer >= 0; layer--) {
                const radius = this.brushSize * (0.5 + layer * 0.3);
                const alpha = originalAlpha * (0.6 - layer * 0.15);
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${alpha})`);
                gradient.addColorStop(0.5, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${alpha * 0.5})`);
                gradient.addColorStop(1, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        this.points.push({x, y});
        ctx.fillStyle = this.currentColor;
    }

    drawWatercolorBrush(ctx, x, y) {
        ctx.globalCompositeOperation = 'multiply';
        const originalAlpha = ctx.globalAlpha;
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const steps = Math.max(Math.ceil(distance / 1.5), 1);
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = lastPoint.x + dx * t;
                const interpY = lastPoint.y + dy * t;
                
                const rgbColor = this.hexToRgb(this.currentColor);
                
                const blobCount = Math.floor(8 + Math.random() * 5);
                for (let j = 0; j < blobCount; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * this.brushSize * 0.8;
                    const offsetX = Math.cos(angle) * dist;
                    const offsetY = Math.sin(angle) * dist;
                    const blobSize = this.brushSize * (0.5 + Math.random() * 0.5);
                    
                    const gradient = ctx.createRadialGradient(
                        interpX + offsetX, interpY + offsetY, 0,
                        interpX + offsetX, interpY + offsetY, blobSize
                    );
                    gradient.addColorStop(0, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${originalAlpha * 0.15})`);
                    gradient.addColorStop(0.6, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${originalAlpha * 0.08})`);
                    gradient.addColorStop(1, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0)`);
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(interpX + offsetX, interpY + offsetY, blobSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else {
            const rgbColor = this.hexToRgb(this.currentColor);
            
            const blobCount = Math.floor(8 + Math.random() * 5);
            for (let j = 0; j < blobCount; j++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * this.brushSize * 0.8;
                const offsetX = Math.cos(angle) * dist;
                const offsetY = Math.sin(angle) * dist;
                const blobSize = this.brushSize * (0.5 + Math.random() * 0.5);
                
                const gradient = ctx.createRadialGradient(
                    x + offsetX, y + offsetY, 0,
                    x + offsetX, y + offsetY, blobSize
                );
                gradient.addColorStop(0, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${originalAlpha * 0.15})`);
                gradient.addColorStop(0.6, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${originalAlpha * 0.08})`);
                gradient.addColorStop(1, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x + offsetX, y + offsetY, blobSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        this.points.push({x, y});
        ctx.fillStyle = this.currentColor;
    }

    drawShape(x, y) {
        const layerCanvas = this.layers[this.currentLayerIndex].canvas;
        const layerCtx = layerCanvas.getContext('2d');
        
        layerCtx.save();
        layerCtx.globalAlpha = this.opacity / 100;
        layerCtx.strokeStyle = this.currentColor;
        layerCtx.lineWidth = this.brushSize;
        layerCtx.lineCap = 'round';
        layerCtx.lineJoin = 'round';
        
        switch (this.currentTool) {
            case 'line':
                layerCtx.beginPath();
                layerCtx.moveTo(this.lastX, this.lastY);
                layerCtx.lineTo(x, y);
                layerCtx.stroke();
                break;
            case 'rectangle':
                layerCtx.strokeRect(this.lastX, this.lastY, x - this.lastX, y - this.lastY);
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(x - this.lastX, 2) + Math.pow(y - this.lastY, 2));
                layerCtx.beginPath();
                layerCtx.arc(this.lastX, this.lastY, radius, 0, Math.PI * 2);
                layerCtx.stroke();
                break;
        }
        
        layerCtx.restore();
        this.composeLayers();
    }

    pickColor(x, y) {
        const pixel = this.ctx.getImageData(x, y, 1, 1).data;
        const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
        this.currentColor = hex;
        document.getElementById('colorPicker').value = hex;
        this.updateColorDisplay(hex);
        this.addRecentColor(hex);
        this.showToast(`Colore: ${hex}`, 'success');
    }

    floodFill(startX, startY) {
        const layerCanvas = this.layers[this.currentLayerIndex].canvas;
        const layerCtx = layerCanvas.getContext('2d');
        
        // Le coordinate sono già nello spazio fisico del canvas
        const x = Math.floor(startX);
        const y = Math.floor(startY);
        
        const imageData = layerCtx.getImageData(0, 0, layerCanvas.width, layerCanvas.height);
        const pixels = imageData.data;
        const width = layerCanvas.width;
        const height = layerCanvas.height;
        
        if (x < 0 || x >= width || y < 0 || y >= height) {
            this.showToast('Punto fuori dall\'area', 'warning');
            return;
        }
        
        const startPos = (y * width + x) * 4;
        const startR = pixels[startPos];
        const startG = pixels[startPos + 1];
        const startB = pixels[startPos + 2];
        const startA = pixels[startPos + 3];
        
        const fillColor = this.hexToRgb(this.currentColor);
        fillColor.a = Math.floor((this.opacity / 100) * 255);
        
        if (startR === fillColor.r && startG === fillColor.g && 
            startB === fillColor.b && startA === fillColor.a) {
            return;
        }
        
        // Tolleranza massima per catturare completamente i bordi antialiased
        const tolerance = 100;
        
        const matchesStart = (pos) => {
            const r = pixels[pos];
            const g = pixels[pos + 1];
            const b = pixels[pos + 2];
            const a = pixels[pos + 3];
            
            // Se il pixel è molto trasparente, è parte dell'area da riempire
            if (a < 200) return true;
            
            // Usa distanza euclidea per migliore matching dei colori simili
            const dr = r - startR;
            const dg = g - startG;
            const db = b - startB;
            const da = a - startA;
            const colorDistance = Math.sqrt(dr*dr + dg*dg + db*db + da*da);
            
            return colorDistance <= tolerance;
        };
        
        const pixelStack = [[x, y]];
        const visited = new Set();
        
        while (pixelStack.length > 0) {
            const [x, y] = pixelStack.pop();
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            const key = y * width + x;
            if (visited.has(key)) continue;
            
            let currentPos = key * 4;
            
            if (!matchesStart(currentPos)) continue;
            
            visited.add(key);
            
            let leftX = x;
            let rightX = x;
            
            while (leftX > 0) {
                const leftPos = (y * width + (leftX - 1)) * 4;
                if (!matchesStart(leftPos)) break;
                leftX--;
            }
            
            while (rightX < width - 1) {
                const rightPos = (y * width + (rightX + 1)) * 4;
                if (!matchesStart(rightPos)) break;
                rightX++;
            }
            
            for (let i = leftX; i <= rightX; i++) {
                currentPos = (y * width + i) * 4;
                pixels[currentPos] = fillColor.r;
                pixels[currentPos + 1] = fillColor.g;
                pixels[currentPos + 2] = fillColor.b;
                pixels[currentPos + 3] = fillColor.a;
                
                const currentKey = y * width + i;
                visited.add(currentKey);
                
                if (y > 0) {
                    const topKey = (y - 1) * width + i;
                    if (!visited.has(topKey) && matchesStart(topKey * 4)) {
                        pixelStack.push([i, y - 1]);
                    }
                }
                if (y < height - 1) {
                    const bottomKey = (y + 1) * width + i;
                    if (!visited.has(bottomKey) && matchesStart(bottomKey * 4)) {
                        pixelStack.push([i, y + 1]);
                    }
                }
            }
        }
        
        layerCtx.putImageData(imageData, 0, 0);
        this.composeLayers();
        this.showToast('Riempimento completato', 'success');
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    handleTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 2) {
            // Zoom con 2 dita - ferma il disegno
            this.lastTouchDistance = this.getTouchDistance(e.touches);
            this.isDrawing = false;
            this.isPanning = false;
            this.isDraggingText = false;
        } else if (e.touches.length === 1) {
            const touch = e.touches[0];
            
            // Se stiamo posizionando testo, gestisci touch come click/drag
            if (this.isPlacingText) {
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.startDrawing(mouseEvent);
                return;
            }
            
            // Se pan mode è attivo, inizia il pan invece di disegnare
            if (this.panMode) {
                this.isPanning = true;
                this.isDrawing = false;
                this.lastPanX = touch.clientX;
                this.lastPanY = touch.clientY;
                this.canvas.style.cursor = 'grabbing';
            } else {
                // Disegno normale con 1 dito
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            }
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 2) {
            // Zoom con 2 dita
            const currentDistance = this.getTouchDistance(e.touches);
            const delta = currentDistance - this.lastTouchDistance;
            
            if (Math.abs(delta) > 5) {
                this.zoom += delta * 0.01;
                this.zoom = Math.max(0.5, Math.min(5, this.zoom));
                this.lastTouchDistance = currentDistance;
                this.applyTransform();
            }
        } else if (e.touches.length === 1) {
            const touch = e.touches[0];
            
            // Se stiamo draggando il testo
            if (this.isDraggingText) {
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.draw(mouseEvent);
                return;
            }
            
            // Se stiamo pannando, muovi il canvas
            if (this.isPanning) {
                const deltaX = touch.clientX - this.lastPanX;
                const deltaY = touch.clientY - this.lastPanY;
                
                const currentTransform = this.canvas.style.transform || '';
                const translateMatch = currentTransform.match(/translate\(\s*([+-]?\d+\.?\d*)px?\s*,?\s*([+-]?\d+\.?\d*)px?\s*\)/);
                
                let currentX = 0, currentY = 0;
                if (translateMatch) {
                    currentX = parseFloat(translateMatch[1]) || 0;
                    currentY = parseFloat(translateMatch[2]) || 0;
                }
                
                const newX = currentX + deltaX;
                const newY = currentY + deltaY;
                
                this.canvas.style.transform = `translate(${newX}px, ${newY}px) scale(${this.zoom})`;
                this.canvas.style.transformOrigin = 'center center';
                
                this.lastPanX = touch.clientX;
                this.lastPanY = touch.clientY;
            } else if (this.isDrawing) {
                // Disegno con 1 dito
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            }
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        
        if (e.touches.length === 0) {
            // Ferma drag del testo
            if (this.isDraggingText) {
                this.isDraggingText = false;
                return;
            }
            
            // Ferma pan o disegno
            if (this.isPanning) {
                this.isPanning = false;
                if (this.panMode) {
                    this.canvas.style.cursor = 'grab';
                }
            } else {
                const mouseEvent = new MouseEvent('mouseup', {});
                this.canvas.dispatchEvent(mouseEvent);
            }
        }
    }

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    applyTransform() {
        // Preserva il translate esistente se presente
        const currentTransform = this.canvas.style.transform || '';
        
        // Estrai translate con regex più robusto
        let translateX = 0;
        let translateY = 0;
        
        // Match per translate(Xpx, Ypx) o translate(X, Y)
        const translateMatch = currentTransform.match(/translate\(\s*([+-]?\d+\.?\d*)px?\s*,?\s*([+-]?\d+\.?\d*)px?\s*\)/);
        if (translateMatch) {
            translateX = parseFloat(translateMatch[1]) || 0;
            translateY = parseFloat(translateMatch[2]) || 0;
        }
        
        // Costruisci il transform mantenendo il translate
        let transform = '';
        if (translateX !== 0 || translateY !== 0) {
            transform = `translate(${translateX}px, ${translateY}px) scale(${this.zoom})`;
        } else {
            transform = `scale(${this.zoom})`;
        }
        
        this.canvas.style.transform = transform;
        this.canvas.style.transformOrigin = 'center center';
        
        const zoomPercent = Math.round(this.zoom * 100) + '%';
        document.getElementById('zoomValue').textContent = zoomPercent;
        
        const zoomDisplay = document.getElementById('canvasZoomDisplay');
        if (zoomDisplay) {
            zoomDisplay.textContent = zoomPercent;
        }
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom + 0.1, 5);
        this.applyTransform();
        this.showToast(`Zoom: ${Math.round(this.zoom * 100)}%`, 'info');
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom - 0.1, 0.1);
        this.applyTransform();
        this.showToast(`Zoom: ${Math.round(this.zoom * 100)}%`, 'info');
    }

    zoomReset() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        // Reset completo - rimuove translate e imposta scale a 1
        this.canvas.style.transform = `scale(1)`;
        this.canvas.style.transformOrigin = 'center center';
        this.showToast('Zoom reset', 'success');
    }

    handleWheel(e) {
        e.preventDefault();
        
        if (e.ctrlKey || e.metaKey) {
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            this.zoom = Math.max(0.1, Math.min(5, this.zoom + delta));
            this.applyTransform();
        }
    }

    panCanvas(deltaX, deltaY) {
        const currentTransform = this.canvas.style.transform;
        
        const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        let currentX = 0, currentY = 0;
        if (translateMatch) {
            currentX = parseFloat(translateMatch[1]) || 0;
            currentY = parseFloat(translateMatch[2]) || 0;
        }
        
        const newX = currentX + deltaX;
        const newY = currentY + deltaY;
        
        this.canvas.style.transform = `translate(${newX}px, ${newY}px) scale(${this.zoom})`;
        this.showToast('Canvas spostato', 'info');
    }

    centerCanvas() {
        // Rimuove il translate, mantiene solo lo zoom
        this.canvas.style.transform = `scale(${this.zoom})`;
        this.canvas.style.transformOrigin = 'center center';
        this.showToast('Canvas centrato', 'success');
    }

    fitToScreen() {
        const container = document.querySelector('.canvas-container');
        const containerRect = container.getBoundingClientRect();
        
        const canvasWidth = parseInt(this.canvas.style.width) || this.canvas.width / this.actualDpr;
        const canvasHeight = parseInt(this.canvas.style.height) || this.canvas.height / this.actualDpr;
        
        const scaleX = (containerRect.width - 40) / canvasWidth;
        const scaleY = (containerRect.height - 40) / canvasHeight;
        
        this.zoom = Math.min(scaleX, scaleY, 1);
        this.applyTransform();
        this.showToast('Canvas adattato', 'success');
    }

    updateCanvasSizeDisplay() {
        const displayWidth = Math.floor(this.canvas.width / this.actualDpr);
        const displayHeight = Math.floor(this.canvas.height / this.actualDpr);
        document.getElementById('canvasSizeDisplay').textContent = `${displayWidth} × ${displayHeight}`;
    }

    composeLayers() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
        if (this.showGrid) this.drawGrid();
        if (this.showRuler) this.drawRuler();
        
        this.layers.forEach(layer => {
            if (layer.visible) {
                this.ctx.save();
                this.ctx.globalAlpha = layer.opacity;
                this.ctx.drawImage(layer.canvas, 0, 0);
                this.ctx.restore();
            }
        });
    }

    drawGrid() {
        const gridSize = 50;
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawRuler() {
        const rulerSize = 20;
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, rulerSize);
        this.ctx.fillRect(0, 0, rulerSize, this.canvas.height);
        
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 1;
        this.ctx.font = '10px sans-serif';
        this.ctx.fillStyle = '#666';
        
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, 10);
            this.ctx.stroke();
            this.ctx.fillText(x, x + 2, 15);
        }
        
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(10, y);
            this.ctx.stroke();
            this.ctx.save();
            this.ctx.translate(5, y - 2);
            this.ctx.rotate(-Math.PI / 2);
            this.ctx.fillText(y, 0, 0);
            this.ctx.restore();
        }
    }

    addLayer() {
        const layer = {
            id: Date.now(),
            name: `Livello ${this.layers.length + 1}`,
            visible: true,
            opacity: 1,
            canvas: document.createElement('canvas'),
            locked: false
        };
        layer.canvas.width = this.canvas.width;
        layer.canvas.height = this.canvas.height;
        
        const ctx = layer.canvas.getContext('2d', { alpha: true });
        
        this.layers.push(layer);
        this.currentLayerIndex = this.layers.length - 1;
        this.updateLayersUI();
        
        this.showToast('Nuovo livello aggiunto', 'success');
    }

    updateLayersUI() {
        const layersList = document.getElementById('layersList');
        layersList.innerHTML = '';
        
        this.layers.slice().reverse().forEach((layer, index) => {
            const actualIndex = this.layers.length - 1 - index;
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item' + (actualIndex === this.currentLayerIndex ? ' active' : '');
            layerItem.innerHTML = `
                <canvas class="layer-preview" width="50" height="50"></canvas>
                <div class="layer-info">
                    <div class="layer-name">${layer.name}</div>
                    <div class="layer-details">${layer.visible ? 'Visibile' : 'Nascosto'} • ${Math.round(layer.opacity * 100)}%</div>
                </div>
                <div class="layer-actions">
                    <button class="layer-btn" onclick="app.toggleLayerVisibility(${actualIndex})">
                        <svg viewBox="0 0 24 24"><path d="${layer.visible ? 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z' : 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z'}"/></svg>
                    </button>
                    <button class="layer-btn" onclick="app.deleteLayer(${actualIndex})">
                        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            `;
            
            const previewCanvas = layerItem.querySelector('.layer-preview');
            const previewCtx = previewCanvas.getContext('2d');
            previewCtx.drawImage(layer.canvas, 0, 0, 50, 50);
            
            layerItem.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-btn')) {
                    this.currentLayerIndex = actualIndex;
                    this.updateLayersUI();
                }
            });
            
            layersList.appendChild(layerItem);
        });
    }

    toggleLayerVisibility(index) {
        this.layers[index].visible = !this.layers[index].visible;
        this.updateLayersUI();
        this.composeLayers();
    }

    deleteLayer(index) {
        if (this.layers.length === 1) {
            this.showToast('Non puoi eliminare l\'ultimo livello', 'warning');
            return;
        }
        this.layers.splice(index, 1);
        this.currentLayerIndex = Math.min(this.currentLayerIndex, this.layers.length - 1);
        this.updateLayersUI();
        this.composeLayers();
        this.showToast('Livello eliminato', 'success');
    }

    saveState() {
        if (this.layers.length === 0) return;
        
        // Previeni salvataggi durante undo/redo
        if (this.isRestoringState) return;
        
        // Salva TUTTI i layer con metadati completi
        const state = {
            layers: this.layers.map(layer => ({
                data: layer.canvas.toDataURL(),
                name: layer.name,
                visible: layer.visible,
                opacity: layer.opacity,
                locked: layer.locked,
                id: layer.id
            })),
            currentLayerIndex: this.currentLayerIndex,
            timestamp: Date.now()
        };
        
        this.historyStep++;
        this.history = this.history.slice(0, this.historyStep);
        this.history.push(state);
        
        // Mantieni solo ultimi 50 stati
        if (this.history.length > 50) {
            this.history.shift();
            this.historyStep--;
        }
    }

    async undo() {
        // Resetta stato testo se attivo
        if (this.isPlacingText || this.textPreviewActive) {
            this.isPlacingText = false;
            this.textPreviewActive = false;
            this.isDraggingText = false;
            this.textSettings.text = '';
            this.textSettings.x = 0;
            this.textSettings.y = 0;
            this.textSettings.rotation = 0;
        }
        
        if (this.historyStep <= 0 || this.history.length === 0) {
            this.showToast('Niente da annullare', 'warning');
            return;
        }
        
        // Previeni operazioni multiple simultanee
        if (this.isRestoringState) return;
        this.isRestoringState = true;
        
        this.historyStep--;
        const state = this.history[this.historyStep];
        
        try {
            await this.restoreState(state);
            this.showToast('Annulla', 'success');
        } catch (error) {
            console.error('Errore durante undo:', error);
            this.showToast('Errore durante annulla', 'error');
            this.historyStep++;
        } finally {
            this.isRestoringState = false;
        }
    }

    async redo() {
        // Resetta stato testo se attivo
        if (this.isPlacingText || this.textPreviewActive) {
            this.isPlacingText = false;
            this.textPreviewActive = false;
            this.isDraggingText = false;
            this.textSettings.text = '';
            this.textSettings.x = 0;
            this.textSettings.y = 0;
            this.textSettings.rotation = 0;
        }
        
        if (this.historyStep >= this.history.length - 1) {
            this.showToast('Niente da ripetere', 'warning');
            return;
        }
        
        // Previeni operazioni multiple simultanee
        if (this.isRestoringState) return;
        this.isRestoringState = true;
        
        this.historyStep++;
        const state = this.history[this.historyStep];
        
        try {
            await this.restoreState(state);
            this.showToast('Ripeti', 'success');
        } catch (error) {
            console.error('Errore durante redo:', error);
            this.showToast('Errore durante ripeti', 'error');
            this.historyStep--;
        } finally {
            this.isRestoringState = false;
        }
    }

    async restoreState(state) {
        if (!state || !state.layers) {
            throw new Error('Stato non valido');
        }
        
        // Assicurati che il numero di layer corrisponda
        const targetLayerCount = state.layers.length;
        const currentLayerCount = this.layers.length;
        
        // Se ci sono più layer nello stato salvato che attualmente
        if (targetLayerCount > currentLayerCount) {
            for (let i = currentLayerCount; i < targetLayerCount; i++) {
                const layer = {
                    id: Date.now() + i,
                    name: `Livello ${i + 1}`,
                    visible: true,
                    opacity: 1,
                    canvas: document.createElement('canvas'),
                    locked: false
                };
                layer.canvas.width = this.canvas.width;
                layer.canvas.height = this.canvas.height;
                this.layers.push(layer);
            }
        }
        
        // Se ci sono meno layer nello stato salvato che attualmente
        if (targetLayerCount < currentLayerCount) {
            this.layers = this.layers.slice(0, targetLayerCount);
        }
        
        // Carica tutti i layer in sequenza (uno alla volta)
        for (let i = 0; i < state.layers.length; i++) {
            const layerState = state.layers[i];
            const layer = this.layers[i];
            
            // Ripristina metadati del layer
            if (layerState.name) layer.name = layerState.name;
            if (layerState.visible !== undefined) layer.visible = layerState.visible;
            if (layerState.opacity !== undefined) layer.opacity = layerState.opacity;
            if (layerState.locked !== undefined) layer.locked = layerState.locked;
            
            // Carica l'immagine in modo sincrono (await)
            const imageData = layerState.data || layerState;
            await this.loadImageToLayer(layer, imageData);
        }
        
        // Ripristina l'indice del layer corrente
        this.currentLayerIndex = Math.min(state.currentLayerIndex || 0, this.layers.length - 1);
        
        // Aggiorna UI e rendering
        this.updateLayersUI();
        this.composeLayers();
    }

    loadImageToLayer(layer, imageDataURL) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const layerCtx = layer.canvas.getContext('2d');
                
                // Reset completo del context per evitare stati residui
                layerCtx.save();
                layerCtx.setTransform(1, 0, 0, 1, 0, 0);
                layerCtx.globalAlpha = 1;
                layerCtx.globalCompositeOperation = 'source-over';
                layerCtx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                layerCtx.drawImage(img, 0, 0);
                layerCtx.restore();
                
                resolve();
            };
            
            img.onerror = () => {
                reject(new Error('Errore nel caricamento dell\'immagine del layer'));
            };
            
            img.src = imageDataURL;
        });
    }

    newProject() {
        if (confirm('Creare un nuovo progetto? Le modifiche non salvate andranno perse.')) {
            this.layers = [];
            this.history = [];
            this.historyStep = -1;
            this.createDefaultLayer();
            this.composeLayers();
            this.showToast('Nuovo progetto creato', 'success');
            this.togglePanel('menuPanel');
        }
    }

    async saveProject() {
        try {
            this.showLoading(true);
            const projectData = {
                width: this.canvas.width,
                height: this.canvas.height,
                layers: this.layers.map(layer => ({
                    name: layer.name,
                    visible: layer.visible,
                    opacity: layer.opacity,
                    data: layer.canvas.toDataURL()
                }))
            };
            
            const response = await fetch('/api/save-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `drawing-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                this.showToast('Progetto salvato', 'success');
            }
        } catch (error) {
            this.showToast('Errore nel salvataggio', 'error');
        } finally {
            this.showLoading(false);
            this.togglePanel('menuPanel');
        }
    }

    openProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const projectData = JSON.parse(event.target.result);
                    this.loadProjectData(projectData);
                    this.showToast('Progetto caricato', 'success');
                } catch (error) {
                    this.showToast('Errore nel caricamento', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
        this.togglePanel('menuPanel');
    }

    loadProjectData(projectData) {
        const oldWidth = projectData.width;
        const oldHeight = projectData.height;
        
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const displayWidth = oldWidth / dpr;
        const displayHeight = oldHeight / dpr;
        
        this.canvas.width = oldWidth;
        this.canvas.height = oldHeight;
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
        
        this.actualDpr = dpr;
        this.displayWidth = displayWidth;
        this.displayHeight = displayHeight;
        
        this.layers = [];
        
        let loadedCount = 0;
        const totalLayers = projectData.layers.length;
        
        projectData.layers.forEach(layerData => {
            const layer = {
                id: Date.now() + Math.random(),
                name: layerData.name,
                visible: layerData.visible,
                opacity: layerData.opacity,
                canvas: document.createElement('canvas'),
                locked: false
            };
            layer.canvas.width = this.canvas.width;
            layer.canvas.height = this.canvas.height;
            
            const ctx = layer.canvas.getContext('2d');
            
            
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                loadedCount++;
                if (loadedCount === totalLayers) {
                    this.composeLayers();
                    this.updateCanvasSizeDisplay();
                }
            };
            img.src = layerData.data;
            
            this.layers.push(layer);
        });
        
        this.currentLayerIndex = 0;
        this.updateLayersUI();
    }

    async exportImage(format) {
        try {
            this.showLoading(true);
            const dataURL = this.canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
            
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `drawing-${Date.now()}.${format}`;
            a.click();
            
            this.showToast(`Immagine esportata come ${format.toUpperCase()}`, 'success');
        } catch (error) {
            this.showToast('Errore nell\'esportazione', 'error');
        } finally {
            this.showLoading(false);
            this.togglePanel('menuPanel');
        }
    }

    confirmClear() {
        if (confirm('Vuoi davvero cancellare tutto il canvas? Verranno eliminati TUTTI i layer.')) {
            // Pulisci TUTTI i layer, non solo quello corrente
            this.layers.forEach(layer => {
                const layerCtx = layer.canvas.getContext('2d');
                layerCtx.save();
                layerCtx.setTransform(1, 0, 0, 1, 0, 0);
                layerCtx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                layerCtx.restore();
            });
            
            // Salva stato dopo clear (per undo)
            this.saveState();
            
            this.composeLayers();
            this.showToast('Tutti i layer sono stati puliti', 'success');
        }
        this.togglePanel('menuPanel');
    }

    resizeCanvas() {
        const currentDisplayWidth = Math.floor(this.canvas.width / this.actualDpr);
        const currentDisplayHeight = Math.floor(this.canvas.height / this.actualDpr);
        
        const presets = `Presets:\n1920x1080 (Full HD 16:9)\n1280x720 (HD 16:9)\n1024x768 (4:3)\n800x600 (4:3)`;
        const input = prompt(`${presets}\n\nInserisci dimensioni (es: 1920x1080):`, `${currentDisplayWidth}x${currentDisplayHeight}`);
        
        if (input) {
            const parts = input.toLowerCase().split('x');
            if (parts.length === 2) {
                const newWidth = parseInt(parts[0].trim());
                const newHeight = parseInt(parts[1].trim());
                
                if (newWidth > 0 && newHeight > 0 && newWidth <= 4096 && newHeight <= 4096) {
                    this.showLoading(true);
                    
                    const tempLayers = this.layers.map(layer => {
                        const temp = document.createElement('canvas');
                        temp.width = layer.canvas.width;
                        temp.height = layer.canvas.height;
                        const ctx = temp.getContext('2d');
                        ctx.drawImage(layer.canvas, 0, 0);
                        return temp;
                    });
                    
                    const dpr = this.actualDpr;
                    this.canvas.width = Math.floor(newWidth * dpr);
                    this.canvas.height = Math.floor(newHeight * dpr);
                    this.canvas.style.width = newWidth + 'px';
                    this.canvas.style.height = newHeight + 'px';
                    
                    this.displayWidth = newWidth;
                    this.displayHeight = newHeight;
                    
                    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                    this.ctx.lineCap = 'round';
                    this.ctx.lineJoin = 'round';
                    
                    this.layers.forEach((layer, index) => {
                        layer.canvas.width = this.canvas.width;
                        layer.canvas.height = this.canvas.height;
                        const ctx = layer.canvas.getContext('2d');
                        
                        ctx.drawImage(tempLayers[index], 0, 0, this.canvas.width, this.canvas.height);
                    });
                    
                    this.composeLayers();
                    this.applyTransform();
                    this.updateCanvasSizeDisplay();
                    this.showLoading(false);
                    this.showToast(`Canvas ridimensionato a ${newWidth}x${newHeight}`, 'success');
                } else {
                    this.showToast('Dimensioni non valide (max 4096x4096)', 'error');
                }
            } else {
                this.showToast('Formato non valido. Usa: LARGHEZZAxALTEZZA', 'error');
            }
        }
        this.togglePanel('menuPanel');
    }

    clearCanvas() {
        this.layers.forEach(layer => {
            const layerCtx = layer.canvas.getContext('2d');
            layerCtx.save();
            layerCtx.setTransform(1, 0, 0, 1, 0, 0);
            layerCtx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            layerCtx.restore();
        });
        this.composeLayers();
        this.history = [];
        this.historyStep = -1;
        this.showToast('Canvas pulito', 'success');
    }

    setupPanelClickOutside() {
        document.addEventListener('click', (e) => {
            // Lista dei pannelli che devono chiudersi al click fuori
            const panelsToCheck = ['menuPanel', 'settingsPanel', 'layersPanel'];
            
            panelsToCheck.forEach(panelId => {
                const panel = document.getElementById(panelId);
                if (panel && panel.classList.contains('open')) {
                    // Verifica se il click è fuori dal pannello E fuori dal bottone che lo apre
                    const clickedInsidePanel = panel.contains(e.target);
                    const clickedOnOpenButton = e.target.closest(`#${panelId.replace('Panel', 'Btn')}`);
                    
                    // Chiudi solo se click fuori dal pannello e dal suo bottone
                    if (!clickedInsidePanel && !clickedOnOpenButton) {
                        panel.classList.remove('open');
                    }
                }
            });
        });
    }

    togglePanel(panelId) {
        const panel = document.getElementById(panelId);
        const isOpen = panel.classList.contains('open');
        
        document.querySelectorAll('.side-panel, .canvas-panel').forEach(p => p.classList.remove('open'));
        
        if (!isOpen) {
            panel.classList.add('open');
        }
    }

    toggleDarkMode(enabled) {
        if (enabled) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        this.saveSettings();
        this.showToast(enabled ? 'Tema scuro attivato' : 'Tema chiaro attivato', 'success');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        const duration = type === 'info' ? 600 : 1500;
        
        const timeoutId = setTimeout(() => {
            toast.style.animation = 'slideUp 0.2s reverse';
            setTimeout(() => {
                toast.remove();
                const index = this.activeToasts.findIndex(t => t.element === toast);
                if (index > -1) this.activeToasts.splice(index, 1);
            }, 200);
        }, duration);
        
        this.activeToasts.push({ element: toast, timeoutId });
    }

    dismissToasts() {
        this.activeToasts.forEach(({ element, timeoutId }) => {
            clearTimeout(timeoutId);
            element.style.animation = 'slideUp 0.15s reverse';
            setTimeout(() => element.remove(), 150);
        });
        this.activeToasts = [];
    }

    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }

    saveSettings() {
        const settings = {
            darkMode: document.documentElement.hasAttribute('data-theme'),
            antialiasing: this.antialiasing,
            smoothing: this.smoothing,
            showGrid: this.showGrid,
            showRuler: this.showRuler
        };
        localStorage.setItem('drawingAppSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('drawingAppSettings') || '{}');
        
        if (settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('darkModeToggle').checked = true;
        }
        if (settings.antialiasing !== undefined) {
            this.antialiasing = settings.antialiasing;
            document.getElementById('antialiasingToggle').checked = settings.antialiasing;
        }
        if (settings.smoothing !== undefined) {
            this.smoothing = settings.smoothing;
            document.getElementById('smoothingToggle').checked = settings.smoothing;
        }
        if (settings.showGrid) {
            this.showGrid = settings.showGrid;
            document.getElementById('gridToggle').checked = settings.showGrid;
        }
        if (settings.showRuler) {
            this.showRuler = settings.showRuler;
            document.getElementById('rulerToggle').checked = settings.showRuler;
        }
    }

    handleResize() {
        // Non fare nulla - le dimensioni del canvas sono controllate dall'utente
        // Il canvas mantiene le sue dimensioni anche quando la finestra viene ridimensionata
    }

    getToolName(tool) {
        const names = {
            brush: 'Pennello',
            pencil: 'Matita',
            eraser: 'Gomma',
            line: 'Linea',
            rectangle: 'Rettangolo',
            circle: 'Cerchio',
            text: 'Testo',
            fill: 'Riempimento',
            eyedropper: 'Contagocce'
        };
        return names[tool] || tool;
    }
    
    getBrushTypeName(type) {
        const names = {
            round: 'Tondo',
            airbrush: 'Aerografo',
            calligraphy: 'Calligrafia',
            marker: 'Marker',
            soft: 'Morbido',
            dynamic: 'Dinamico',
            textured: 'Texture',
            splatter: 'Splatter',
            neon: 'Neon',
            watercolor: 'Acquerello'
        };
        return names[type] || type;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    redrawCanvas() {
        this.composeLayers();
    }

    togglePanMode() {
        this.panMode = !this.panMode;
        const btn = document.getElementById('panModeBtn');
        
        if (this.panMode) {
            btn.classList.add('active');
            this.canvas.style.cursor = 'grab';
            this.showToast('Pan Mode ON - Trascina per spostare il canvas', 'info');
        } else {
            btn.classList.remove('active');
            this.canvas.style.cursor = 'crosshair';
            this.isPanning = false;
            this.showToast('Pan Mode OFF', 'info');
        }
    }

    setupTextTool() {
        const fontFamily = document.getElementById('fontFamily');
        const fontSize = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        const fontWeight = document.getElementById('fontWeight');
        const textInput = document.getElementById('textInput');
        const applyTextBtn = document.getElementById('applyTextBtn');
        const cancelTextBtn = document.getElementById('cancelTextBtn');
        const closeTextPanelBtn = document.getElementById('closeTextPanelBtn');
        const textColorPreview = document.getElementById('textColorPreview');
        
        // Inizializza colore preview con il colore del testo (non quello dei pennelli)
        textColorPreview.style.backgroundColor = this.textSettings.color;
        
        // Click sul color preview apre il color picker DEDICATO per testo
        textColorPreview.addEventListener('click', (e) => {
            e.stopPropagation();
            const textColorPickerDropdown = document.getElementById('textColorPickerDropdown');
            
            // Toggle dropdown
            textColorPickerDropdown.classList.toggle('open');
        });
        
        // Setup color picker dedicato
        this.setupTextColorPicker(textColorPreview);
        
        // Observer per aggiornare il preview quando cambia il colore del testo
        this.textColorUpdateInterval = setInterval(() => {
            if (textColorPreview) {
                const currentBg = textColorPreview.style.backgroundColor;
                const newColor = this.textSettings.color;
                // Converti hex to rgb per confronto
                const rgb = this.hexToRgb(newColor);
                const newBg = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                
                if (currentBg !== newBg) {
                    textColorPreview.style.backgroundColor = newColor;
                    if (this.textPreviewActive) {
                        this.drawTextPreview();
                    }
                }
            }
        }, 100);
        
        const updatePreview = () => {
            this.textSettings.text = textInput.value.trim();
            if (this.textSettings.text) {
                this.textPreviewActive = true;
                this.drawTextPreview();
            } else {
                this.textPreviewActive = false;
                this.composeLayers();
            }
        };
        
        textInput.addEventListener('input', updatePreview);
        
        fontFamily.addEventListener('change', (e) => {
            this.textSettings.font = e.target.value;
            updatePreview();
        });
        
        fontSize.addEventListener('input', (e) => {
            this.textSettings.size = parseInt(e.target.value);
            fontSizeValue.textContent = e.target.value;
            updatePreview();
        });
        
        fontWeight.addEventListener('change', (e) => {
            this.textSettings.weight = e.target.value;
            updatePreview();
        });
        
        applyTextBtn.addEventListener('click', () => {
            this.textSettings.text = textInput.value.trim();
            if (this.textSettings.text) {
                // Inizia modalità posizionamento
                this.startTextPlacement();
                this.togglePanel('textPanel');
            } else {
                this.showToast('Inserisci del testo', 'warning');
            }
        });
        
        cancelTextBtn.addEventListener('click', () => {
            textInput.value = '';
            this.textSettings.text = '';
            this.textPreviewActive = false;
            this.isPlacingText = false;
            this.composeLayers();
            this.togglePanel('textPanel');
        });
        
        closeTextPanelBtn.addEventListener('click', () => {
            this.textSettings.text = '';
            this.textPreviewActive = false;
            this.composeLayers();
            this.togglePanel('textPanel');
        });
    }

    drawTextPreview() {
        // Disegna anteprima senza salvare nello stato
        this.composeLayers();
        
        if (!this.textSettings.text) return;
        
        // Calcola posizione iniziale al centro se non ancora impostata
        if (this.textSettings.x === 0 && this.textSettings.y === 0) {
            this.ctx.save();
            const font = `${this.textSettings.weight} ${this.textSettings.size}px ${this.textSettings.font}`;
            this.ctx.font = font;
            const textWidth = this.ctx.measureText(this.textSettings.text).width;
            this.textSettings.x = (this.canvas.width - textWidth) / 2;
            this.textSettings.y = this.canvas.height / 3;
            this.ctx.restore();
        }
        
        this.ctx.save();
        const font = `${this.textSettings.weight} ${this.textSettings.size}px ${this.textSettings.font}`;
        this.ctx.font = font;
        this.ctx.fillStyle = this.textSettings.color;  // Usa colore testo separato
        this.ctx.globalAlpha = this.opacity / 100;
        this.ctx.textBaseline = 'top';
        
        // Applica rotazione se in modalità posizionamento
        if (this.isPlacingText && this.textSettings.rotation !== 0) {
            const textWidth = this.ctx.measureText(this.textSettings.text).width;
            const centerX = this.textSettings.x + textWidth / 2;
            const centerY = this.textSettings.y + this.textSettings.size / 2;
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(this.textSettings.rotation * Math.PI / 180);
            this.ctx.translate(-centerX, -centerY);
        }
        
        this.ctx.fillText(this.textSettings.text, this.textSettings.x, this.textSettings.y);
        this.ctx.restore();
        
        // Se stiamo posizionando, mostra i controlli
        if (this.isPlacingText) {
            this.drawTextControls();
        }
    }

    drawTextControls() {
        // Disegna bounding box e controlli
        const font = `${this.textSettings.weight} ${this.textSettings.size}px ${this.textSettings.font}`;
        this.ctx.font = font;
        const textWidth = this.ctx.measureText(this.textSettings.text).width;
        const textHeight = this.textSettings.size;
        
        this.ctx.save();
        
        // Bounding box
        this.ctx.strokeStyle = '#6366f1';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(this.textSettings.x - 10, this.textSettings.y - 10, 
                            textWidth + 20, textHeight + 20);
        
        // Bottone conferma (spunta verde) - ridotto a 32px
        const btnSize = 32;
        const btnX = this.textSettings.x + textWidth + 20;
        const btnY = this.textSettings.y;
        
        this.ctx.fillStyle = '#10b981';
        this.ctx.beginPath();
        this.ctx.arc(btnX + btnSize/2, btnY + btnSize/2, btnSize/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Icona spunta
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.moveTo(btnX + 10, btnY + 16);
        this.ctx.lineTo(btnX + 14, btnY + 20);
        this.ctx.lineTo(btnX + 22, btnY + 12);
        this.ctx.stroke();
        
        // Bottone rotazione (icona rotate)
        const rotateBtnY = btnY + btnSize + 10;
        this.ctx.fillStyle = '#8b5cf6';
        this.ctx.beginPath();
        this.ctx.arc(btnX + btnSize/2, rotateBtnY + btnSize/2, btnSize/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Icona rotazione
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.arc(btnX + btnSize/2, rotateBtnY + btnSize/2, 9, -Math.PI/2, Math.PI);
        this.ctx.stroke();
        // Freccia
        this.ctx.beginPath();
        this.ctx.moveTo(btnX + btnSize/2 - 9, rotateBtnY + btnSize/2);
        this.ctx.lineTo(btnX + btnSize/2 - 6, rotateBtnY + btnSize/2 - 3);
        this.ctx.lineTo(btnX + btnSize/2 - 6, rotateBtnY + btnSize/2 + 3);
        this.ctx.fill();
        
        this.ctx.restore();
        
        // Salva posizioni dei bottoni per hit detection
        this.textConfirmBtn = {x: btnX, y: btnY, size: btnSize};
        this.textRotateBtn = {x: btnX, y: rotateBtnY, size: btnSize};
    }

    startTextPlacement() {
        this.isPlacingText = true;
        this.textPreviewActive = true;
        this.textSettings.rotation = 0;
        
        // Calcola posizione iniziale
        this.ctx.save();
        const font = `${this.textSettings.weight} ${this.textSettings.size}px ${this.textSettings.font}`;
        this.ctx.font = font;
        const textWidth = this.ctx.measureText(this.textSettings.text).width;
        this.textSettings.x = (this.canvas.width - textWidth) / 2;
        this.textSettings.y = this.canvas.height / 3;
        this.ctx.restore();
        
        this.drawTextPreview();
        this.showToast('Trascina per posizionare, tocca spunta per confermare', 'info');
    }

    confirmTextPlacement() {
        if (!this.isPlacingText) return;
        
        const layerCanvas = this.layers[this.currentLayerIndex].canvas;
        const layerCtx = layerCanvas.getContext('2d');
        
        layerCtx.save();
        const font = `${this.textSettings.weight} ${this.textSettings.size}px ${this.textSettings.font}`;
        layerCtx.font = font;
        layerCtx.fillStyle = this.textSettings.color;
        layerCtx.globalAlpha = this.opacity / 100;
        layerCtx.textBaseline = 'top';
        
        // Applica rotazione
        if (this.textSettings.rotation !== 0) {
            const textWidth = layerCtx.measureText(this.textSettings.text).width;
            const centerX = this.textSettings.x + textWidth / 2;
            const centerY = this.textSettings.y + this.textSettings.size / 2;
            layerCtx.translate(centerX, centerY);
            layerCtx.rotate(this.textSettings.rotation * Math.PI / 180);
            layerCtx.translate(-centerX, -centerY);
        }
        
        layerCtx.fillText(this.textSettings.text, this.textSettings.x, this.textSettings.y);
        layerCtx.restore();
        
        // Salva lo stato DOPO aver applicato il testo
        this.saveState();
        
        // Reset stato
        this.isPlacingText = false;
        this.textPreviewActive = false;
        this.textSettings.text = '';
        this.textSettings.x = 0;
        this.textSettings.y = 0;
        this.textSettings.rotation = 0;
        
        // Pulisci input
        document.getElementById('textInput').value = '';
        
        this.composeLayers();
        this.showToast('Testo applicato', 'success');
    }

    isPointInCircle(px, py, cx, cy, radius) {
        const dx = px - cx;
        const dy = py - cy;
        return (dx * dx + dy * dy) <= (radius * radius);
    }

    setupTextColorPicker(textColorPreview) {
        const textColorPickerDropdown = document.getElementById('textColorPickerDropdown');
        const closeTextColorPicker = document.getElementById('closeTextColorPicker');
        const openTextNativePicker = document.getElementById('openTextNativePicker');
        const textColorPicker = document.getElementById('textColorPicker');
        const textColorPreviewLarge = document.getElementById('textColorPreviewLarge');
        const textRecentColors = document.getElementById('textRecentColors');
        const textPaletteColors = document.getElementById('textPaletteColors');
        
        // Close button
        closeTextColorPicker.addEventListener('click', () => {
            textColorPickerDropdown.classList.remove('open');
        });
        
        // Close quando si clicca fuori
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.text-color-picker-dropdown') && 
                !e.target.closest('#textColorPreview')) {
                textColorPickerDropdown.classList.remove('open');
            }
        });
        
        // Native picker
        openTextNativePicker.addEventListener('click', () => {
            textColorPicker.click();
        });
        
        textColorPicker.addEventListener('input', (e) => {
            this.textSettings.color = e.target.value;
            textColorPreview.style.backgroundColor = this.textSettings.color;
            textColorPreviewLarge.style.backgroundColor = this.textSettings.color;
            this.addRecentColor(this.textSettings.color);
            if (this.textPreviewActive) {
                this.drawTextPreview();
            }
        });
        
        // Riutilizza le stesse palette e recent colors
        const paletteColorsData = [
            '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
            '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
            '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082',
            '#FF6347', '#40E0D0', '#EE82EE', '#F5DEB3', '#FF1493'
        ];
        
        paletteColorsData.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', () => {
                this.textSettings.color = color;
                textColorPreview.style.backgroundColor = color;
                textColorPreviewLarge.style.backgroundColor = color;
                this.addRecentColor(color);
                if (this.textPreviewActive) {
                    this.drawTextPreview();
                }
            });
            textPaletteColors.appendChild(swatch);
        });
        
        // Recent colors - condividi con il picker principale
        this.updateTextRecentColorsDisplay = () => {
            textRecentColors.innerHTML = '';
            this.recentColors.forEach(color => {
                const swatch = document.createElement('div');
                swatch.className = 'color-swatch';
                swatch.style.backgroundColor = color;
                swatch.addEventListener('click', () => {
                    this.textSettings.color = color;
                    textColorPreview.style.backgroundColor = color;
                    textColorPreviewLarge.style.backgroundColor = color;
                    if (this.textPreviewActive) {
                        this.drawTextPreview();
                    }
                });
                textRecentColors.appendChild(swatch);
            });
        };
        
        this.updateTextRecentColorsDisplay();
        
        // Update preview large iniziale
        textColorPreviewLarge.style.backgroundColor = this.textSettings.color;
    }

    setupColorPicker() {
        const colorDisplay = document.getElementById('colorDisplay');
        const colorPickerDropdown = document.getElementById('colorPickerDropdown');
        const closeColorPicker = document.getElementById('closeColorPicker');
        const openNativePicker = document.getElementById('openNativePicker');
        const colorPicker = document.getElementById('colorPicker');

        // Toggle dropdown
        colorDisplay.addEventListener('click', () => {
            colorPickerDropdown.classList.toggle('open');
        });

        closeColorPicker.addEventListener('click', () => {
            colorPickerDropdown.classList.remove('open');
        });

        // Close quando si clicca fuori
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.color-picker-wrapper')) {
                colorPickerDropdown.classList.remove('open');
            }
        });

        // Open native picker
        openNativePicker.addEventListener('click', () => {
            colorPicker.click();
        });

        // Aggiorna display quando cambia colore
        this.updateColorDisplay(this.currentColor);
        
        // Genera palette
        this.generatePalette();
        this.updateRecentColors();
    }

    updateColorDisplay(color) {
        document.getElementById('currentColor').style.background = color;
        document.getElementById('colorPreviewLarge').style.background = color;
    }

    addRecentColor(color) {
        // Rimuovi se già presente
        this.recentColors = this.recentColors.filter(c => c !== color);
        // Aggiungi all'inizio
        this.recentColors.unshift(color);
        // Mantieni solo ultimi 16
        this.recentColors = this.recentColors.slice(0, 16);
        // Salva in localStorage
        localStorage.setItem('recentColors', JSON.stringify(this.recentColors));
        this.updateRecentColors();
        
        // Aggiorna anche il text color picker se esiste
        if (this.updateTextRecentColorsDisplay) {
            this.updateTextRecentColorsDisplay();
        }
    }

    updateRecentColors() {
        const container = document.getElementById('recentColors');
        container.innerHTML = '';
        
        this.recentColors.forEach(color => {
            const swatch = this.createColorSwatch(color);
            container.appendChild(swatch);
        });

        // Riempi spazi vuoti
        const emptyCount = 16 - this.recentColors.length;
        for (let i = 0; i < emptyCount; i++) {
            const empty = document.createElement('div');
            empty.className = 'color-swatch';
            empty.style.background = 'var(--bg-tertiary)';
            empty.style.cursor = 'default';
            container.appendChild(empty);
        }
    }

    generatePalette() {
        const container = document.getElementById('paletteColors');
        const palette = [
            // Basics
            '#000000', '#FFFFFF', '#808080', '#C0C0C0',
            // Reds
            '#FF0000', '#DC143C', '#FF6B6B', '#FF4444',
            // Oranges & Yellows
            '#FFA500', '#FFD700', '#FFEB3B', '#FFF59D',
            // Greens
            '#00FF00', '#4CAF50', '#8BC34A', '#C8E6C9',
            // Cyans & Blues
            '#00FFFF', '#2196F3', '#03A9F4', '#81D4FA',
            // Blues & Purples
            '#0000FF', '#3F51B5', '#9C27B0', '#E1BEE7',
            // Pinks & Magentas
            '#FF00FF', '#E91E63', '#F06292', '#F8BBD0',
            // Browns & Earth
            '#8B4513', '#A0522D', '#D2691E', '#CD853F'
        ];

        palette.forEach(color => {
            const swatch = this.createColorSwatch(color);
            container.appendChild(swatch);
        });
    }

    createColorSwatch(color) {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = color;
        
        if (color === this.currentColor) {
            swatch.classList.add('selected');
        }

        swatch.addEventListener('click', () => {
            this.currentColor = color;
            document.getElementById('colorPicker').value = color;
            this.updateColorDisplay(color);
            this.addRecentColor(color);
            
            // Update selected
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            
            // Close dropdown
            document.getElementById('colorPickerDropdown').classList.remove('open');
            
            this.showToast(`Colore: ${color}`, 'success');
        });

        return swatch;
    }
}

const app = new DrawingApp();
