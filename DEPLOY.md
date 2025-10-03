# 🚀 Deploy su Railway - Guida Completa

## 📋 Prerequisiti

1. Account Railway (gratuito): https://railway.app/
2. Repository Git (GitHub, GitLab, o Bitbucket)

## 🔧 Files Necessari (Già Inclusi)

- ✅ `Procfile` - Definisce come avviare l'app
- ✅ `requirements.txt` - Dipendenze Python
- ✅ `runtime.txt` - Versione Python
- ✅ `.gitignore` - File da ignorare
- ✅ `.dockerignore` - File da ignorare in Docker

## 🚀 Deploy Steps

### Metodo 1: Deploy da GitHub (Consigliato)

1. **Push su GitHub**
   ```bash
   cd /root/draw-game
   git init
   git add .
   git commit -m "Initial commit - Professional Drawing App"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy su Railway**
   - Vai su https://railway.app/
   - Click "New Project"
   - Seleziona "Deploy from GitHub repo"
   - Scegli il repository
   - Railway rileverà automaticamente i file di configurazione
   - Click "Deploy"

3. **Configurazione Automatica**
   Railway rileverà automaticamente:
   - `Procfile` → Comando di avvio: `web: python server.py`
   - `requirements.txt` → Installa Flask, flask-cors, Pillow
   - `runtime.txt` → Usa Python 3.11.9

4. **Ottieni URL Pubblico**
   - Railway genera automaticamente un URL pubblico
   - Esempio: `https://your-app.up.railway.app`

### Metodo 2: Deploy via Railway CLI

1. **Installa Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Inizializza Progetto**
   ```bash
   cd /root/draw-game
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Ottieni URL**
   ```bash
   railway domain
   ```

## 🔍 Verifica Deploy

Dopo il deploy, verifica che tutto funzioni:

1. Apri l'URL generato da Railway
2. Testa:
   - ✅ Caricamento pagina
   - ✅ Strumenti di disegno
   - ✅ Layer
   - ✅ Undo/Redo
   - ✅ Text tool
   - ✅ Export immagini

## 📊 Monitoraggio

Railway offre dashboard per:
- 📈 Logs in tempo reale
- 💾 Uso memoria
- 🔄 CPU usage
- 🌐 Request metrics
- 🚨 Alerts

## 🛠️ Troubleshooting

### Errore: "Application failed to respond"
**Soluzione:** Verifica che `server.py` usi `PORT` da env:
```python
port = int(os.environ.get('PORT', 5000))
app.run(host='0.0.0.0', port=port)
```

### Errore: "No web process running"
**Soluzione:** Verifica che `Procfile` sia corretto:
```
web: python server.py
```

### Errore: "Python version not found"
**Soluzione:** Verifica `runtime.txt`:
```
python-3.11.9
```

### Errore: "Module not found"
**Soluzione:** Verifica `requirements.txt` e aggiungi moduli mancanti.

## 🔄 Aggiornamenti

Per aggiornare l'app:

1. **Modifica codice localmente**
2. **Commit e push**
   ```bash
   git add .
   git commit -m "Update: description"
   git push
   ```
3. **Railway fa auto-deploy** 🎉

## 💰 Costi

**Piano Gratuito Railway:**
- $5 di crediti gratuiti/mese
- Sufficiente per progetti personali
- Auto-sleep dopo inattività
- Risveglio automatico su richiesta

**Piano Hobby ($5/mese):**
- $5 crediti + $5 di utilizzo incluso
- No auto-sleep
- Migliori performance

## 🔐 Variabili d'Ambiente

Railway imposta automaticamente:
- `PORT` - Porta su cui ascoltare (usata da server.py)
- `RAILWAY_ENVIRONMENT` - Ambiente corrente

Non serve configurare altro! ✅

## 📱 Custom Domain (Opzionale)

1. Vai su Railway dashboard
2. Settings → Domains
3. Add Domain
4. Configura DNS del tuo dominio
5. Aggiungi CNAME che punta a Railway

## 🎯 Checklist Pre-Deploy

- ✅ Procfile presente
- ✅ requirements.txt completo
- ✅ runtime.txt con versione Python
- ✅ .gitignore configurato
- ✅ server.py usa PORT da env
- ✅ debug=False in produzione
- ✅ File superflui rimossi

## 🎉 Post-Deploy

Dopo il primo deploy di successo:

1. **Testa tutte le funzionalità**
2. **Condividi l'URL**
3. **Monitora i logs**
4. **Configura alerts (opzionale)**

---

**Buon Deploy! 🚀**

Per supporto Railway: https://docs.railway.app/
