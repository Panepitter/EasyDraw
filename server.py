from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import base64
from datetime import datetime
from io import BytesIO
from PIL import Image

app = Flask(__name__, static_folder='.')
CORS(app)

PROJECTS_DIR = 'projects'
EXPORTS_DIR = 'exports'

os.makedirs(PROJECTS_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/save-project', methods=['POST'])
def save_project():
    try:
        project_data = request.json
        project_id = f"project_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        project_path = os.path.join(PROJECTS_DIR, f"{project_id}.json")
        
        with open(project_path, 'w') as f:
            json.dump(project_data, f)
        
        return jsonify({
            'success': True,
            'project_id': project_id,
            'message': 'Progetto salvato con successo'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/load-project/<project_id>', methods=['GET'])
def load_project(project_id):
    try:
        project_path = os.path.join(PROJECTS_DIR, f"{project_id}.json")
        
        if not os.path.exists(project_path):
            return jsonify({
                'success': False,
                'error': 'Progetto non trovato'
            }), 404
        
        with open(project_path, 'r') as f:
            project_data = json.load(f)
        
        return jsonify({
            'success': True,
            'data': project_data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/list-projects', methods=['GET'])
def list_projects():
    try:
        projects = []
        
        for filename in os.listdir(PROJECTS_DIR):
            if filename.endswith('.json'):
                project_path = os.path.join(PROJECTS_DIR, filename)
                stat = os.stat(project_path)
                
                projects.append({
                    'id': filename.replace('.json', ''),
                    'name': filename,
                    'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'size': stat.st_size
                })
        
        projects.sort(key=lambda x: x['modified'], reverse=True)
        
        return jsonify({
            'success': True,
            'projects': projects
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/delete-project/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    try:
        project_path = os.path.join(PROJECTS_DIR, f"{project_id}.json")
        
        if not os.path.exists(project_path):
            return jsonify({
                'success': False,
                'error': 'Progetto non trovato'
            }), 404
        
        os.remove(project_path)
        
        return jsonify({
            'success': True,
            'message': 'Progetto eliminato con successo'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/export-image', methods=['POST'])
def export_image():
    try:
        data = request.json
        image_data = data.get('image')
        format_type = data.get('format', 'png')
        quality = data.get('quality', 95)
        
        if not image_data:
            return jsonify({
                'success': False,
                'error': 'Dati immagine mancanti'
            }), 400
        
        header, encoded = image_data.split(',', 1)
        image_bytes = base64.b64decode(encoded)
        
        image = Image.open(BytesIO(image_bytes))
        
        export_id = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        export_filename = f"{export_id}.{format_type}"
        export_path = os.path.join(EXPORTS_DIR, export_filename)
        
        if format_type.lower() == 'jpg' or format_type.lower() == 'jpeg':
            if image.mode == 'RGBA':
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[3])
                image = background
            image.save(export_path, 'JPEG', quality=quality, optimize=True)
        elif format_type.lower() == 'png':
            image.save(export_path, 'PNG', optimize=True)
        else:
            image.save(export_path, format_type.upper())
        
        return jsonify({
            'success': True,
            'export_id': export_id,
            'filename': export_filename,
            'path': f'/exports/{export_filename}',
            'message': 'Immagine esportata con successo'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/apply-filter', methods=['POST'])
def apply_filter():
    try:
        data = request.json
        image_data = data.get('image')
        filter_type = data.get('filter')
        
        if not image_data or not filter_type:
            return jsonify({
                'success': False,
                'error': 'Parametri mancanti'
            }), 400
        
        header, encoded = image_data.split(',', 1)
        image_bytes = base64.b64decode(encoded)
        image = Image.open(BytesIO(image_bytes))
        
        if filter_type == 'grayscale':
            image = image.convert('L').convert('RGBA')
        elif filter_type == 'sepia':
            pixels = image.load()
            for i in range(image.width):
                for j in range(image.height):
                    r, g, b, a = pixels[i, j]
                    tr = int(0.393 * r + 0.769 * g + 0.189 * b)
                    tg = int(0.349 * r + 0.686 * g + 0.168 * b)
                    tb = int(0.272 * r + 0.534 * g + 0.131 * b)
                    pixels[i, j] = (min(tr, 255), min(tg, 255), min(tb, 255), a)
        elif filter_type == 'invert':
            pixels = image.load()
            for i in range(image.width):
                for j in range(image.height):
                    r, g, b, a = pixels[i, j]
                    pixels[i, j] = (255 - r, 255 - g, 255 - b, a)
        elif filter_type == 'blur':
            from PIL import ImageFilter
            image = image.filter(ImageFilter.BLUR)
        elif filter_type == 'sharpen':
            from PIL import ImageFilter
            image = image.filter(ImageFilter.SHARPEN)
        elif filter_type == 'edge':
            from PIL import ImageFilter
            image = image.filter(ImageFilter.FIND_EDGES)
        
        buffer = BytesIO()
        image.save(buffer, format='PNG')
        buffer.seek(0)
        encoded_image = base64.b64encode(buffer.read()).decode()
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{encoded_image}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/resize-image', methods=['POST'])
def resize_image():
    try:
        data = request.json
        image_data = data.get('image')
        width = data.get('width')
        height = data.get('height')
        maintain_aspect = data.get('maintain_aspect', True)
        
        if not image_data or not width or not height:
            return jsonify({
                'success': False,
                'error': 'Parametri mancanti'
            }), 400
        
        header, encoded = image_data.split(',', 1)
        image_bytes = base64.b64decode(encoded)
        image = Image.open(BytesIO(image_bytes))
        
        if maintain_aspect:
            image.thumbnail((width, height), Image.LANCZOS)
        else:
            image = image.resize((width, height), Image.LANCZOS)
        
        buffer = BytesIO()
        image.save(buffer, format='PNG')
        buffer.seek(0)
        encoded_image = base64.b64encode(buffer.read()).decode()
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{encoded_image}',
            'width': image.width,
            'height': image.height
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/exports/<filename>')
def serve_export(filename):
    return send_from_directory(EXPORTS_DIR, filename)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'message': 'Server is running'
    })

if __name__ == '__main__':
    print("=" * 60)
    print("🎨 DrawPro - Professional Mobile Drawing App")
    print("=" * 60)
    print(f"📂 Projects directory: {os.path.abspath(PROJECTS_DIR)}")
    print(f"📂 Exports directory: {os.path.abspath(EXPORTS_DIR)}")
    print("=" * 60)
    print("🚀 Server starting on http://0.0.0.0:5000")
    print("=" * 60)
    print("\n✨ Features:")
    print("  • Multi-layer drawing system")
    print("  • Professional drawing tools")
    print("  • Touch-optimized for mobile")
    print("  • Project save/load")
    print("  • Image export (PNG/JPG)")
    print("  • Image filters and effects")
    print("  • Dark/Light theme")
    print("\n🛠️ Tools available:")
    print("  • Brush, Pencil, Eraser")
    print("  • Line, Rectangle, Circle")
    print("  • Text, Fill, Eyedropper")
    print("  • Undo/Redo, Layers")
    print("  • Zoom, Pan, Grid, Ruler")
    print("\n📱 Open in your browser to start drawing!")
    print("=" * 60 + "\n")
    
    # Usa PORT da variabile d'ambiente per Railway, altrimenti 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
