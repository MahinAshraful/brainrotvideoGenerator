'use client'
import { useState } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'

  export default function Home() {
  const [video, setVideo] = useState<File | null>(null)
  const [script, setScript] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!video || !script) {
      setError('Please provide both video and script')
      return
    }

    setProcessing(true)
    setError(null)
    setResult(null)
    setVideoUrl(null)

    const formData = new FormData()
    formData.append('video', video)
    formData.append('script', script)

    try {
      const response = await fetch('http://localhost:5000/process-video', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (response.ok) {
        setResult(data)
        setVideoUrl(`http://localhost:5000/${data.path}`)
      } else {
        setError(data.error || 'Failed to process video')
      }
    } catch (err) {
      setError('Error connecting to server')
    } finally {
      setProcessing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && !file.type.startsWith('video/')) {
      setError('Please upload a valid video file')
      return
    }
    setVideo(file || null)
    setError(null)
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">Video TTS Processor</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div className="space-y-2">
            <label className="block font-medium">Upload Video</label>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="w-full p-2 border rounded"
            />
            {video && (
              <p className="text-sm text-gray-600">
                Selected: {video.name} ({Math.round(video.size / 1024 / 1024)}MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block font-medium">Script for TTS</label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="w-full p-2 border rounded h-32"
              placeholder="Enter the text you want to convert to speech..."
            />
            <p className="text-sm text-gray-600">
              {script.length} characters
            </p>
          </div>

          <button
            type="submit"
            disabled={processing || !video || !script}
            className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Process Video'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-100 text-green-700 rounded space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <p>Video processed successfully!</p>
            </div>
            
            {videoUrl && (
              <div className="space-y-2">
                <p className="font-medium">Preview processed video:</p>
                <video controls className="w-full">
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video element.
                </video>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}