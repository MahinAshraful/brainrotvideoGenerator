from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import asyncio
import edge_tts
import numpy as np
import soundfile as sf
import librosa
import sounddevice as sd

app = Flask(__name__)
CORS(app)

# Create directories
for directory in ['uploads', 'output']:
    if not os.path.exists(directory):
        os.makedirs(directory)

async def generate_tts(text, output_path):
    voice = "en-US-JennyNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)

def combine_video_audio(video_path, audio_path, output_path):
    try:
        # Load the audio data
        audio_data, sample_rate = sf.read(audio_path)
        
        # Extract original video's audio
        video_audio, video_sr = librosa.load(video_path, sr=None)
        
        # Normalize lengths - extend or trim the TTS audio to match video length
        video_length = len(video_audio) / video_sr
        desired_length = int(video_length * sample_rate)
        
        if len(audio_data) > desired_length:
            # Trim TTS audio if it's too long
            audio_data = audio_data[:desired_length]
        else:
            # Extend TTS audio if it's too short (by repeating or padding)
            padding_length = desired_length - len(audio_data)
            audio_data = np.pad(audio_data, (0, padding_length), mode='constant')
        
        # Mix the audio streams
        # You can adjust these weights to control the mix
        mixed_audio = (video_audio * 0.3) + (audio_data * 0.7)
        
        # Save the mixed audio
        sf.write(output_path, mixed_audio, sample_rate)
        return True
        
    except Exception as e:
        print(f"Error in audio processing: {str(e)}")
        return False

@app.route('/process-video', methods=['POST'])
def process_video():
    try:
        video_file = request.files['video']
        script = request.form.get('script', '')
        
        # Save video
        video_path = os.path.join('uploads', 'temp_video.mp4')
        video_file.save(video_path)
        
        # Generate TTS as WAV
        audio_path = os.path.join('uploads', 'temp_audio.wav')
        asyncio.run(generate_tts(script, audio_path))
        
        # Output path
        output_path = os.path.join('output', 'final_audio.wav')
        
        # Combine audio
        if not combine_video_audio(video_path, audio_path, output_path):
            raise Exception("Failed to combine audio")
        
        # Clean up
        os.remove(video_path)
        os.remove(audio_path)
        
        return jsonify({
            'success': True,
            'path': output_path,
            'message': 'Audio processed successfully'
        })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)