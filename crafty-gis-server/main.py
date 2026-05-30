from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from google import genai

app = FastAPI(title="CRAFTY GIS Server")

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

# Initialize Gemini Client
# Assumes GEMINI_API_KEY environment variable is set
try:
    client = genai.Client()
except Exception as e:
    client = None
    print(f"Failed to initialize Gemini Client: {e}")

SYSTEM_PROMPT = """You are the AI Consultant for CRAFTY GIS (Conversational Remote Analysis & Field Technology for GIS).
You are an intelligent autonomous geospatial problem-solver.
Your job is to talk to the user in plain language (no GIS jargon like LULC, DEM, etc. unless the user uses it first).
You must act as a consultant to extract the following information before performing an analysis:
1. Problem Definition (What do they want to solve?)
2. Geographic Scope (Which area?)
3. Time Period
4. Analysis Type
5. Output Format
6. Data Preferences

Ask one or two clarifying questions at a time. Do not overwhelm the user.
If you have all the information, summarize the plan and tell them you are ready to begin processing.
"""

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini client not initialized. Check API key.")
    
    # Format messages for Gemini
    contents = []
    for msg in request.messages:
        role = "user" if msg.role == "user" else "model"
        contents.append(
            {"role": role, "parts": [{"text": msg.content}]}
        )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config={
                'system_instruction': SYSTEM_PROMPT,
                'temperature': 0.7,
            }
        )
        return {"response": response.text}
    except Exception as e:
        print(f"Error calling Gemini: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "Welcome to CRAFTY GIS API"}
