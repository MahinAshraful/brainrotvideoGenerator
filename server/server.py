from flask import Flask, request, send_file
from flask_cors import CORS
import os
import asyncio
import edge_tts
import time
import traceback

app = Flask(__name__)
CORS(app)

# Create output directory if it doesn't exist
if not os.path.exists('output'):
    os.makedirs('output')

async def generate_tts(text, output_path):
    voice = "en-US-JennyNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)

@app.route('/generate-audio', methods=['POST'])
def generate_audio():
    try:
        print("Received request")
        print("Form data:", request.form)
        
        script = request.form.get('script', '')
        
        if not script:
            return 'No text provided', 400
            
        # Set up file path
        output_filename = f'audio_{int(time.time())}.mp3'
        output_path = os.path.join('output', output_filename)
        
        print("Generating TTS audio")
        asyncio.run(generate_tts(script, output_path))
        
        print("Processing complete")
        return send_file(output_path, 
                        mimetype='audio/mpeg',
                        as_attachment=True,
                        download_name=output_filename)

    except Exception as e:
        print("Error occurred:")
        print(traceback.format_exc())
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)