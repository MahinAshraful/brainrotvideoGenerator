'use client'
import { useState } from 'react'

export default function Home() {
  const [video, setVideo] = useState<File | null>(null)
  const [script, setScript] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!video || !script) {
      setError('Please provide both video and script')
      return
    }

    setProcessing(true)
    setError(null)
    setResult(null)

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
      } else {
        setError(data.error || 'Failed to process video')
      }
    } catch (err) {
      setError('Error connecting to server')
    } finally {
      setProcessing(false)
    }
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
              onChange={(e) => setVideo(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-medium">Script for TTS</label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="w-full p-2 border rounded h-32"
              placeholder="Enter the text you want to convert to speech..."
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Process Video'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-100 text-green-700 rounded">
            <p>Video processed successfully!</p>
            <p className="text-sm mt-2">Output path: {result.output_path}</p>
          </div>
        )}
      </div>
    </div>
  )
}