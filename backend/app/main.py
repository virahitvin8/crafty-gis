from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import chat, workflow, files, history
from app.core.config import settings

app = FastAPI(
    title="CRAFTY GIS API",
    description="AI-Powered GIS & Remote Sensing Problem-Solving Platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(workflow.router, prefix="/api/workflow", tags=["workflow"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(history.router, prefix="/api/history", tags=["history"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to CRAFTY GIS API",
        "version": "0.1.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}