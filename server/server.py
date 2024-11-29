from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
import asyncio
import edge_tts
import time
import traceback
import google.generativeai as genai
from dotenv import load_dotenv
import time
import os
load_dotenv()
from test import makeScript 

app = Flask(__name__)
CORS(app)

# Create output directory if it doesn't exist
if not os.path.exists('output'):
    os.makedirs('output')

api_key = os.getenv("GOOGLE_GEMINI_KEY")
if not api_key:
    raise EnvironmentError("GOOGLE_GEMINI_KEY is not set in environment variables.")
genai.configure(api_key=api_key)

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


@app.route('/getScript', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    temp_path = os.path.join('temp', file.filename)
    os.makedirs('temp', exist_ok=True)
    file.save(temp_path)

    duration = request.form.get('duration', default=60, type=int)  # Example duration

    script = makeScript(temp_path, duration)
    print(duration, script)

    return jsonify({'script': script})
        

if __name__ == '__main__':
    app.run(debug=True, port=5000)