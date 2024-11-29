'use client';

import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

type ProcessingStatus = 'idle' | 'loading' | 'processing' | 'completed' | 'error';

const MediaCombiner: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  const [duration, setDuration] = useState<number>(60);
  
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        setStatus('loading');
        const ffmpegInstance = new FFmpeg();
        
        await ffmpegInstance.load({
          coreURL: await toBlobURL(`/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`/ffmpeg-core.wasm`, 'application/wasm'),
        });
        
        setFFmpeg(ffmpegInstance);
        setStatus('idle');
      } catch (err) {
        setError('Failed to load FFmpeg');
        setStatus('error');
      }
    };
    
    loadFFmpeg();
  }, []);

  const getScript = async () => {
    try {
        if (!ffmpeg) {
          throw new Error('FFmpeg is not loaded yet');
        }
  
        if (!videoRef.current?.files?.[0]) {
          throw new Error('Please select a video file');
        }
  
        setStatus('processing');
        setError(null);
        const videoFile = videoRef.current.files[0];

        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('duration', duration.toString());


        const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/getScript`, {
            method: 'POST',
            body: formData,
        });

        const script = await response.json();
        console.log(script);
        return script.script
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setStatus('error');
    }
    }
        

  const handleCombineMedia = async (): Promise<void> => {
    try {
      if (!ffmpeg) {
        throw new Error('FFmpeg is not loaded yet');
      }

      if (!videoRef.current?.files?.[0]) {
        throw new Error('Please select a video file');
      }

      setStatus('processing');
      setError(null);

      const videoFile = videoRef.current.files[0];

      const MAX_FILE_SIZE = 100 * 1024 * 1024;
      if (videoFile.size > MAX_FILE_SIZE) {
        throw new Error('Video file size exceeds 100MB limit');
      }

        const script = await getScript();

        console.log(script);

      const formData = new FormData();
      formData.append('script', script);

      const audioResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/generate-audio`, {
        method: 'POST',
        body: formData
      });

      if (!audioResponse.ok) {
        throw new Error('Failed to generate audio');
      }

      const videoArrayBuffer = await videoFile.arrayBuffer();
      const audioArrayBuffer = await audioResponse.arrayBuffer();

      await ffmpeg.writeFile('input.mp4', new Uint8Array(videoArrayBuffer));
      await ffmpeg.writeFile('audio.mp3', new Uint8Array(audioArrayBuffer));

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-i', 'audio.mp3',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        'output.mp4'
      ]);

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'video-with-voiceover.mp4';
      a.click();

      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('audio.mp3');
      await ffmpeg.deleteFile('output.mp4');

      setStatus('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setStatus('error');
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      {status === 'loading' && (
        <div className="text-center py-4">
          Loading FFmpeg... Please wait.
        </div>
      )}

      <div className="space-y-4">
        <div>
        <label className="block text-sm font-medium mb-2">
            Select duration:
          </label>
        <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
        placeholder="Duration in seconds"
        />
          <label className="block text-sm font-medium mb-2">
            Select Video File:
          </label>
          <input
            type="file"
            ref={videoRef}
            accept="video/mp4,video/webm"
            className="w-full border rounded p-2"
            disabled={status === 'loading' || status === 'processing'}
          />
        </div>

        <button
          onClick={handleCombineMedia}
          disabled={status === 'loading' || status === 'processing'}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded disabled:bg-gray-400"
        >
          {status === 'loading' ? 'Loading FFmpeg...' : 
           status === 'processing' ? 'Processing...' : 
           'Generate Video with Voiceover'}
        </button>

        {error && (
          <div className="text-red-500 mt-2">{error}</div>
        )}

        {status === 'completed' && (
          <div className="text-green-500 mt-2 text-center font-medium">
            Video with voiceover has been downloaded!
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCombiner;