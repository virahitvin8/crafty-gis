#!/usr/bin/env python3
"""
Build script for the Next.js frontend.
Builds the Next.js app and copies the output to the FastAPI static directory.
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(command, cwd=None):
    """Run a command and return the result."""
    print(f"Running: {command}")
    result = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    print(f"Output: {result.stdout}")
    return True

def main():
    # Change to the frontend directory
    frontend_dir = Path(__file__).parent / "crafty-gis-client"
    if not frontend_dir.exists():
        print(f"Error: Frontend directory not found at {frontend_dir}")
        return False

    # Install dependencies if needed
    print("Installing frontend dependencies...")
    if not run_command("npm install", cwd=frontend_dir):
        return False

    # Build the Next.js app
    print("Building Next.js app...")
    if not run_command("npm run build", cwd=frontend_dir):
        return False

    # Copy the built output to the FastAPI static directory
    static_dir = Path(__file__).parent / "crafty-gis-server" / "frontend" / "static"
    if static_dir.exists():
        shutil.rmtree(static_dir)
    static_dir.mkdir(parents=True)

    # Copy the .next directory and public files
    next_out = frontend_dir / ".next"
    if next_out.exists():
        shutil.copytree(next_out, static_dir / ".next", symlinks=True)
        print(f"Copied .next to {static_dir}")

    public_dir = frontend_dir / "public"
    if public_dir.exists():
        shutil.copytree(public_dir, static_dir / "public", symlinks=True)
        print(f"Copied public to {static_dir}")

    print("Frontend build completed successfully!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)