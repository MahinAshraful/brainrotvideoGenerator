'use client';

import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

type ProcessingStatus = 'idle' | 'loading' | 'processing' | 'completed' | 'error';

const MediaCombiner: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const combinedVideoRef = useRef<HTMLVideoElement>(null);

  // Load FFmpeg on component mount
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        setStatus('loading');
        const ffmpegInstance = new FFmpeg();
        
        // Load FFmpeg
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

  const handleCombineMedia = async (): Promise<void> => {
    try {
      if (!ffmpeg) {
        throw new Error('FFmpeg is not loaded yet');
      }

      setStatus('processing');
      setError(null);

      if (!videoRef.current?.files?.[0] || !audioRef.current?.files?.[0]) {
        throw new Error('Please select both video and audio files');
      }

      const videoFile = videoRef.current.files[0];
      const audioFile = audioRef.current.files[0];

      // Validate file sizes
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      if (videoFile.size > MAX_FILE_SIZE || audioFile.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 100MB limit');
      }

      // Convert files to ArrayBuffer
      const videoArrayBuffer = await videoFile.arrayBuffer();
      const audioArrayBuffer = await audioFile.arrayBuffer();

      // Write files to FFmpeg's virtual filesystem
      await ffmpeg.writeFile('input.mp4', new Uint8Array(videoArrayBuffer));
      await ffmpeg.writeFile('audio.mp3', new Uint8Array(audioArrayBuffer));

      // Run FFmpeg command to combine video and audio
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

      // Read the output file
      const data = await ffmpeg.readFile('output.mp4');

      // Create a blob from the output data
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      // Update video preview
      if (combinedVideoRef.current) {
        combinedVideoRef.current.src = url;
      }

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = 'combined-video.mp4';
      a.click();

      // Clean up FFmpeg filesystem
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

        <div>
          <label className="block text-sm font-medium mb-2">
            Select Audio File:
          </label>
          <input
            type="file"
            ref={audioRef}
            accept="audio/mp3,audio/wav,audio/mpeg"
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
           'Combine and Download'}
        </button>

        {error && (
          <div className="text-red-500 mt-2">{error}</div>
        )}

        {status === 'completed' && (
          <div>
            <h3 className="font-medium mb-2">Preview:</h3>
            <video
              ref={combinedVideoRef}
              controls
              className="w-full rounded"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCombiner;