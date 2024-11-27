from flask import Flask, request, send_file
from flask_cors import CORS
import os
import moviepy.editor as mp
import asyncio
import edge_tts
import time
import traceback  # Added for detailed error logging

app = Flask(__name__)
CORS(app)

# Create directories if they don't exist
for directory in ['uploads', 'output']:
    if not os.path.exists(directory):
        os.makedirs(directory)

async def generate_tts(text, output_path):
    voice = "en-US-JennyNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)

@app.route('/add-tts-to-video', methods=['POST'])
def add_tts_to_video():
    try:
        # Debug logging
        print("Received request")
        print("Files:", request.files)
        print("Form data:", request.form)
        
        if 'video' not in request.files:
            return 'No video file provided', 400
            
        video_file = request.files['video']
        script = request.form.get('script', '')
        
        if not script:
            return 'No script provided', 400
            
        # Set up file paths
        video_path = os.path.join('uploads', 'temp_video.mp4')
        audio_path = os.path.join('uploads', 'temp_audio.wav')
        output_filename = f'output_{int(time.time())}.mp4'
        output_path = os.path.join('output', output_filename)
        
        print(f"Saving video to: {video_path}")
        video_file.save(video_path)
        
        print("Generating TTS audio")
        asyncio.run(generate_tts(script, audio_path))
        
        print("Processing video")
        video = VideoFileClip(video_path)
        video = video.without_audio()
        tts_audio = AudioFileClip(audio_path)
        
        # If TTS is longer than video, trim it
        if tts_audio.duration > video.duration:
            tts_audio = tts_audio.set_end(video.duration)
        
        # Add TTS audio to video
        final_video = video.set_audio(tts_audio)
        
        print(f"Saving final video to: {output_path}")
        final_video.write_videofile(output_path, 
                                  codec='libx264',
                                  audio_codec='aac',
                                  verbose=False,
                                  logger=None)
        
        # Clean up
        video.close()
        tts_audio.close()
        os.remove(video_path)
        os.remove(audio_path)
        
        print("Processing complete")
        return output_filename

    except Exception as e:
        print("Error occurred:")
        print(traceback.format_exc())  # Print the full error traceback
        return str(e), 500

@app.route('/video/<filename>')
def serve_video(filename):
    try:
        return send_file(os.path.join('output', filename))
    except Exception as e:
        print(f"Error serving video: {str(e)}")
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)