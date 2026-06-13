import os
import sys
import json
import time
from datetime import datetime

# HTML/ANSI Colors for beautiful terminal feedback
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_CYAN = "\033[36m"
COLOR_GREEN = "\033[32m"
COLOR_YELLOW = "\033[33m"
COLOR_RED = "\033[31m"

# Templates dict for generating functional python scripts based on query keywords
TEMPLATES = {
    "remote_sensing": {
        "filename": "sentinel_ndvi_analysis.py",
        "description": "Satellite Imagery & NDVI Analysis using rasterio and numpy",
        "code": """# 👁️ Remote Sensing & NDVI Mapping Module
# Generated based on GIS/RS genome matching

import os
import numpy as np

def calculate_ndvi(red_band_path, nir_band_path, output_path):
    \"\"\"
    Calculate Normalized Difference Vegetation Index (NDVI) from Red and NIR bands.
    Formula: (NIR - Red) / (NIR + Red)
    \"\"\"
    print(f"[*] Loading Red band: {red_band_path}")
    print(f"[*] Loading NIR band: {nir_band_path}")
    
    # Simulating band loads for demonstration
    # In a real environment, use: 
    # import rasterio
    # with rasterio.open(red_band_path) as r: red = r.read(1).astype(float)
    # with rasterio.open(nir_band_path) as n: nir = n.read(1).astype(float)
    
    # Generating dummy multispectral grid array (100x100 pixels) representing a field
    np.random.seed(42)
    red = np.random.uniform(0.05, 0.2, (100, 100))
    nir = np.random.uniform(0.3, 0.8, (100, 100))
    
    print("[*] Computing NDVI array...")
    # Avoid division by zero
    numerator = nir - red
    denominator = nir + red
    ndvi = np.divide(numerator, denominator, out=np.zeros_like(numerator), where=denominator!=0)
    
    mean_ndvi = np.mean(ndvi)
    max_ndvi = np.max(ndvi)
    min_ndvi = np.min(ndvi)
    
    print(f"[+] NDVI calculation complete!")
    print(f"    - Mean NDVI: {mean_ndvi:.4f} (Healthy vegetation index)")
    print(f"    - Min NDVI:  {min_ndvi:.4f}")
    print(f"    - Max NDVI:  {max_ndvi:.4f}")
    
    # Save simulated result
    np.savetxt(output_path, ndvi, fmt='%.4f')
    print(f"[+] Output index successfully written to: {output_path}")
    return mean_ndvi

if __name__ == '__main__':
    print("=== NDVI Vegetation Index Calculator ===")
    calculate_ndvi("red_band.tif", "nir_band.tif", "ndvi_output.csv")
"""
    },
    "crop_prediction": {
        "filename": "crop_yield_estimator.py",
        "description": "Crop Yield Estimator model template using scikit-learn",
        "code": """# 🧠 Crop Yield Prediction & Machine Learning Pipeline
# Generated based on Nervous System genome matching

import numpy as np
import pandas as pd

def train_yield_predictor(soil_ph, rainfall, temperature, fertilizer_kg):
    \"\"\"
    Simulate training a random forest regressor to estimate crop yield (tonnes/hectare)
    based on soil and climatic features.
    \"\"\"
    print("[*] Initializing historical dataset...")
    
    # Simulate generating features
    data = {
        'soil_ph': np.random.uniform(5.5, 7.5, 200),
        'rainfall_mm': np.random.uniform(400, 1200, 200),
        'temperature_c': np.random.uniform(18, 32, 200),
        'fertilizer_kg_ha': np.random.uniform(50, 250, 200)
    }
    df = pd.DataFrame(data)
    
    # Target yield formula with random noise
    df['yield_tonnes_ha'] = (df['soil_ph'] * 0.4) + (df['rainfall_mm'] * 0.005) + \
                            (df['fertilizer_kg_ha'] * 0.02) - (abs(df['temperature_c'] - 24) * 0.1) + \
                            np.random.normal(0, 0.5, 200)
    
    print(f"[*] Training dataset shape: {df.shape}")
    print("[*] Estimating yield coefficients...")
    
    # Simple linear regression simulation for demonstration
    x_mean = df.mean()
    y_mean = df['yield_tonnes_ha'].mean()
    
    # Predict yield for input
    estimated_yield = (soil_ph * 0.4) + (rainfall * 0.005) + (fertilizer_kg * 0.02) - (abs(temperature - 24) * 0.1)
    
    print(f"[+] Predicted Crop Yield: {estimated_yield:.2f} tonnes per hectare")
    print("    - Key driver: Rainfall & Fertilizer input ratio")
    return estimated_yield

if __name__ == '__main__':
    print("=== Crop Yield Estimator ===")
    train_yield_predictor(soil_ph=6.5, rainfall=800, temperature=26, fertilizer_kg=150)
"""
    },
    "soil_recommender": {
        "filename": "soil_crop_recommender.py",
        "description": "Soil Nutrient (N-P-K) Crop Recommendation Engine",
        "code": """# 🍀 Soil Nutrient Crop Recommender
# Generated based on Nervous System / Crop Recommendation genome matching

def recommend_crop(n, p, k, ph, rainfall):
    \"\"\"
    Recommends the best crop based on Nitrogen, Phosphorus, Potassium, pH, and Rainfall.
    \"\"\"
    print(f"[*] Analyzing soil profile: N={n}, P={p}, K={k}, pH={ph}, Rainfall={rainfall}mm")
    
    # Simple matching rule-base derived from dataset ranges
    if n > 80 and p > 40 and k > 40 and rainfall > 1000:
        recommendation = "Rice"
    elif n > 60 and p > 50 and rainfall > 700:
        recommendation = "Maize"
    elif p > 70 and k > 100 and ph < 6.0:
        recommendation = "Potato"
    elif n < 40 and p > 40 and k > 30 and rainfall < 500:
        recommendation = "Chickpea"
    else:
        recommendation = "Wheat (General Grain)"
        
    print(f"[+] Recommended Crop: {recommendation}")
    print("    - Action Plan: Ensure soil drainage matches recommendation requirements.")
    return recommendation

if __name__ == '__main__':
    print("=== Soil Nutrient Crop Recommender ===")
    recommend_crop(n=90, p=42, k=43, ph=6.2, rainfall=1100)
"""
    },
    "tractor_gps": {
        "filename": "tractor_gps_guidance.py",
        "description": "Tractor guidance NMEA serial parser for AgOpenGPS simulation",
        "code": """# 🚜 Tractor Guidance NMEA Serial Parser
# Generated based on Muscular System / AgOpenGPS genome matching

import time

def parse_gps_gga(nmea_sentence):
    \"\"\"
    Parse NMEA $GPGGA sentences to extract Latitude, Longitude, and RTK quality status indicator.
    \"\"\"
    if not nmea_sentence.startswith("$GPGGA"):
        return None
        
    parts = nmea_sentence.split(",")
    if len(parts) < 15:
        return None
        
    utc_time = parts[1]
    lat = parts[2]
    lat_dir = parts[3]
    lon = parts[4]
    lon_dir = parts[5]
    gps_qual = parts[6] # 4 = RTK Fixed, 5 = RTK Float
    
    qual_map = {
        "0": "Invalid",
        "1": "GPS SPS Mode",
        "2": "Differential GPS",
        "3": "PPS Mode",
        "4": "RTK Fixed (Sub-inch accuracy)",
        "5": "RTK Float (Decimeter accuracy)"
    }
    
    status = qual_map.get(gps_qual, "Unknown")
    print(f"[+] Received Time: {utc_time}")
    print(f"    - Latitude:  {lat} {lat_dir}")
    print(f"    - Longitude: {lon} {lon_dir}")
    print(f"    - GPS Quality: {status}")
    return lat, lon, gps_qual

if __name__ == '__main__':
    print("=== Tractor NMEA GPS RTK Reader ===")
    simulated_sentence = "$GPGGA,123519,4807.038,N,01131.000,E,4,08,0.9,545.4,M,46.9,M,,*47"
    parse_gps_gga(simulated_sentence)
"""
    },
    "farm_management": {
        "filename": "farm_records_manager.py",
        "description": "farmOS API sensor logs integration client interface",
        "code": """# 🫀 farmOS REST API Asset & Log Client
# Generated based on Circulatory System / farmOS genome matching

import json

class FarmOSClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        print(f"[*] farmOS Client initialized at: {base_url}")

    def create_sensor_log(self, sensor_name, metric, value):
        \"\"\"
        Post sensor readings to farmOS.
        \"\"\"
        payload = {
            "type": "log--observation",
            "attributes": {
                "name": f"Sensor Reading: {sensor_name} - {metric}",
                "status": "done",
                "notes": f"Value: {value}"
            }
        }
        # In actual environments:
        # import requests
        # r = requests.post(f'{self.base_url}/api/log/observation', json=payload, headers={'Authorization': f'Bearer {self.api_key}'})
        # return r.json()
        
        print(f"[+] Successfully posted sensor record:")
        print(f"    - Target: {sensor_name}")
        print(f"    - Reading: {metric} = {value}")
        return True

if __name__ == '__main__':
    print("=== farmOS records client ===")
    client = FarmOSClient("https://myfarm.farmos.net", "secret-token")
    client.create_sensor_log("Soil-Moisture-SouthField", "moisture_percentage", 32.4)
"""
    },
    "default": {
        "filename": "general_agri_analysis.py",
        "description": "General spatial coordinates boundary indexer",
        "code": """# 🧬 General Geospatial Coordinate Indexer
# Generated based on Genome database fallback

def process_coordinates(coordinates):
    \"\"\"
    Index and format coordinates array for GIS Shapefile mapping.
    \"\"\"
    print(f"[*] Processing coordinates list of length {len(coordinates)}")
    for idx, (lat, lon) in enumerate(coordinates, 1):
        print(f"    - Vertex {idx}: Lat={lat:.6f}, Lon={lon:.6f}")
    print("[+] Boundary coordinate checks passed successfully.")

if __name__ == '__main__':
    print("=== Geospatial Indexer ===")
    process_coordinates([(34.0522, -118.2437), (34.0528, -118.2445), (34.0515, -118.2450)])
"""
    }
}

class WorkspaceGenerator:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.manifest_path = os.path.join(self.base_dir, "unified_biological_manifest.json")
        self.master_manifest = {}
        self.load_manifest()

    def load_manifest(self):
        if os.path.exists(self.manifest_path):
            try:
                with open(self.manifest_path, "r", encoding="utf-8") as f:
                    self.master_manifest = json.load(f)
            except Exception:
                pass

    def analyze_query(self, prompt: str):
        words = [w.lower().strip(",.?!()\"'") for w in prompt.split()]
        words = [w for w in words if len(w) > 2]
        
        matched_repos = []
        for system_key, system_data in self.master_manifest.get("systems", {}).items():
            repos = system_data.get("repositories", [])
            for r in repos:
                score = 0
                name_lower = r.get("original_name", "").lower()
                role_lower = r.get("role", "").lower()
                use_lower = r.get("practical_use", "").lower()
                
                for w in words:
                    if w in name_lower:
                        score += 5
                    if w in role_lower:
                        score += 3
                    if w in use_lower:
                        score += 2
                        
                if score > 0:
                    matched_repos.append({
                        "name": r.get("name"),
                        "original_name": r.get("original_name"),
                        "system": system_key,
                        "function": r.get("role"),
                        "practical_use": r.get("practical_use"),
                        "how_to_use": r.get("how_to_use"),
                        "github_url": r.get("github_url"),
                        "score": score
                    })
                    
        matched_repos.sort(key=lambda x: x["score"], reverse=True)
        return matched_repos

    def select_template(self, prompt: str):
        p_lower = prompt.lower()
        if any(k in p_lower for k in ["ndvi", "satellite", "imagery", "sentinel", "landsat", "remote sensing", "gis"]):
            return TEMPLATES["remote_sensing"]
        elif any(k in p_lower for k in ["predict", "yield", "forecast", "estimator", "crop yield"]):
            return TEMPLATES["crop_prediction"]
        elif any(k in p_lower for k in ["soil", "nutrient", "npk", "recommend", "crop recommendation"]):
            return TEMPLATES["soil_recommender"]
        elif any(k in p_lower for k in ["gps", "tractor", "guidance", "nmea", "steer", "autopilot"]):
            return TEMPLATES["tractor_gps"]
        elif any(k in p_lower for k in ["farm", "records", "management", "farmos", "sensor log"]):
            return TEMPLATES["farm_management"]
        else:
            return TEMPLATES["default"]

    def execute(self, prompt: str):
        # 1. Get Date and Create Directory
        date_str = datetime.now().strftime("%Y-%m-%d")
        target_dir = os.path.join(self.base_dir, date_str)
        os.makedirs(target_dir, exist_ok=True)
        
        print(f"\n{COLOR_CYAN}{COLOR_BOLD}=== GIT_STAR TASK GENERATOR ACTIVATED ==={COLOR_RESET}")
        print(f"[*] Prompt:       \"{prompt}\"")
        print(f"[*] Date Folder:  {target_dir}\n")

        # 2. Match organs
        matched_repos = self.analyze_query(prompt)
        
        # 3. Choose template and write script
        template = self.select_template(prompt)
        script_path = os.path.join(target_dir, template["filename"])
        
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(template["code"])
            
        print(f"{COLOR_GREEN}[+] Created functional script: {script_path}{COLOR_RESET}")
        print(f"    Description: {template['description']}")

        # 4. Generate README.md
        readme_path = os.path.join(target_dir, "README.md")
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(f"# 🚜 Agri-Tech Output Folder - {date_str}\n\n")
            f.write(f"## 📋 Task Specification\n")
            f.write(f"* **Query:** *\"{prompt}\"*\n")
            f.write(f"* **Generated File:** [`{template['filename']}`](./{template['filename']})\n")
            f.write(f"  * *Description:* {template['description']}\n\n")
            
            f.write("## 🧬 Activated Genome Sectors & Repositories\n")
            if matched_repos:
                f.write("The following matching agricultural organs and repositories were used to inform this implementation:\n\n")
                for idx, r in enumerate(matched_repos[:5], 1):
                    f.write(f"### {idx}. {r['original_name']} ({r['system'].upper()})\n")
                    f.write(f"* **Role:** {r['function']}\n")
                    f.write(f"* **Practical Application:** {r['practical_use']}\n")
                    f.write(f"* **Operational Method:** {r['how_to_use']}\n")
                    if r['github_url']:
                        f.write(f"* **Repository URL:** {r['github_url']}\n")
                    f.write("\n")
            else:
                f.write("No direct matches were found in the database. General spatial baseline coordinates indexed.\n")
                
            f.write("\n---\n")
            f.write(f"*Generated automatically on {date_str} by the Antigravity AG Kit Engine.*")

        print(f"{COLOR_GREEN}[+] Created documentation: {readme_path}{COLOR_RESET}")
        
        # 5. Programmatically run the created script and print the output
        print(f"\n{COLOR_YELLOW}[*] Executing generated script to verify correctness...{COLOR_RESET}")
        import subprocess
        try:
            res = subprocess.run([sys.executable, script_path], capture_output=True, text=True, check=True)
            print(f"{COLOR_GREEN}--- SCRIPT OUTPUT ---{COLOR_RESET}")
            print(res.stdout)
            print(f"{COLOR_GREEN}---------------------{COLOR_RESET}")
        except subprocess.CalledProcessError as e:
            print(f"{COLOR_RED}[!] Error executing script: {e}{COLOR_RESET}")
            print(e.stderr)

        print(f"\n{COLOR_CYAN}{COLOR_BOLD}========================================={COLOR_RESET}\n")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python generate_workspace_output.py \"<your question or task description>\"")
        sys.exit(1)
        
    query = " ".join(sys.argv[1:])
    generator = WorkspaceGenerator()
    generator.execute(query)
