from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import asyncio
import edge_tts
from moviepy.editor import VideoFileClip, AudioFileClip, CompositeAudioClip

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

@app.route('/process-video', methods=['POST'])
def process_video():
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
            
        video_file = request.files['video']
        script = request.form.get('script', '')
        
        if not script:
            return jsonify({'error': 'No script provided'}), 400
            
        # Set up file paths
        video_path = os.path.join('uploads', 'temp_video.mp4')
        audio_path = os.path.join('uploads', 'temp_audio.wav')
        output_path = os.path.join('output', 'final_video.mp4')
        
        # Save uploaded video
        video_file.save(video_path)
        
        # Generate TTS audio
        asyncio.run(generate_tts(script, audio_path))
        
        # Load video and new audio
        video_clip = VideoFileClip(video_path)
        tts_audio = AudioFileClip(audio_path)
        
        # Cut TTS audio to match video length if needed
        tts_audio = tts_audio.subclip(0, video_clip.duration)
        
        # Adjust volumes and combine audio
        tts_audio = tts_audio.volumex(0.7)  # Reduce TTS volume to 70%
        if video_clip.audio is not None:
            original_audio = video_clip.audio.volumex(0.3)  # Reduce original audio to 30%
            final_audio = CompositeAudioClip([original_audio, tts_audio])
        else:
            final_audio = tts_audio
            
        # Set the final audio to the video
        final_clip = video_clip.set_audio(final_audio)
        
        # Write final video with both audio tracks
        final_clip.write_videofile(output_path, 
                                 codec='libx264',
                                 audio_codec='aac')
        
        # Clean up resources
        video_clip.close()
        tts_audio.close()
        if video_clip.audio is not None:
            video_clip.audio.close()
            
        # Remove temporary files
        os.remove(video_path)
        os.remove(audio_path)
        
        return jsonify({
            'success': True,
            'path': 'final_video.mp4',
            'message': 'Video processed successfully'
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/output/<path:filename>')
def serve_video(filename):
    return send_from_directory('output', filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)