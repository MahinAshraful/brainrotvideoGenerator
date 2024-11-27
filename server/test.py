import google.generativeai as genai
from dotenv import load_dotenv
import time
import markdown
import os
load_dotenv()
import brain_rot_terms

# Configure API key
api_key = os.getenv("GOOGLE_GEMINI_KEY")
if not api_key:
    raise EnvironmentError("GOOGLE_GEMINI_KEY is not set in environment variables.")
genai.configure(api_key=api_key)


def makeScript(filePath, duration):
  video_file_name = filePath

  print(f"Uploading file...")
  video_file = genai.upload_file(path=video_file_name)
  print(f"Completed upload: {video_file.uri}")

  # Wait for processing
  while video_file.state.name == "PROCESSING":
      print('.', end='')
      time.sleep(10)
      video_file = genai.get_file(video_file.name)

  if video_file.state.name == "FAILED":
      raise ValueError(video_file.state.name)

  # Create the prompt
  prompt = "Make a story out of what is happening in the video. Make sure the estimated speaking time of this story is no more than " + str(duration) + " seconds long. Make sure to use and replace normal words with these words: " + brain_rot_terms.brainrotTerms

  # Choose a Gemini model
  model = genai.GenerativeModel(model_name="gemini-1.5-pro")

  # Make the LLM request
  print("Making LLM inference request...")
  response = model.generate_content([video_file, prompt], request_options={"timeout": 600})

  # Print the response, rendering any Markdown
  print(markdown.markdown(response.text))


makeScript('../server/test_videos/sameer.mp4', 18)