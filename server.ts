import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini API client
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiClient;
}

// REST API for Gemini Agriculture Advisory Analysis
app.post("/api/gemini-analysis", async (req, res) => {
  const { fieldName, crop, ndvi, soilPh, soilNitrogen, soilOrganicCarbon, growthStage, weather } = req.body;

  const prompt = `
    You are FarmHealth's Lead Agronomist AI, powered by satellite and soil telemetry.
    Analyze the following crop and field telemetry:
    
    - Field Name: ${fieldName || "Unknown"}
    - Crop: ${crop || "Wheat"}
    - Current Average NDVI: ${ndvi || 0.74}
    - Growth Stage: ${growthStage || "Mid (vegetative)"}
    - Soil pH: ${soilPh || 6.8}
    - Soil Nitrogen: ${soilNitrogen || 142} kg/ha
    - Organic Carbon: ${soilOrganicCarbon || 2.4}%
    - Current Weather: Temp ${weather?.temp || 28}°C, Condition: ${weather?.condition || "Sunny"}, Rain Prob: ${weather?.rainProb || 12}%
    
    Provide an expert agricultural analysis with the following sections formatted in clean Markdown:
    1. **Vegetation Health & NDVI Evaluation**: Interpret the NDVI score for this crop and growth stage. Is it optimal, stressed, or critical?
    2. **Soil & Nutrient Advisory**: Analyze the Soil pH, Nitrogen, and Organic Carbon. Give specific, actionable suggestions (e.g., if nitrogen is low or pH is too acidic/alkaline).
    3. **Pest & Disease Risk Prediction**: Based on weather conditions and vegetative stress patterns, identify the risk of common pests (like rust, borers, or aphids) and recommend preventative actions.
    4. **Water & Irrigation Optimization**: Give guidance on whether irrigation should be adjusted based on weather conditions.
    5. **Harvest Window & Action Plan**: Recommend a direct action timeline for the next 7-14 days.
    
    Keep the tone professional, precise, scientific, and highly encouraging. Limit to around 300-400 words. Do not use generic introductions.
  `;

  try {
    const ai = getAiClient();
    if (!ai) {
      // Return high-quality pre-computed scientific advice if API key is missing
      console.log("No Gemini API key found, returning expert fallback.");
      return res.json({
        advice: getFallbackAdvice(crop, ndvi, soilPh, soilNitrogen, growthStage),
        isFallback: true
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      advice: response.text || "No analysis could be generated.",
      isFallback: false
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.json({
      advice: getFallbackAdvice(crop, ndvi, soilPh, soilNitrogen, growthStage) + `\n\n*(Note: Analysis fell back to local expert model due to API response: ${error?.message || "connection issues"})*`,
      isFallback: true
    });
  }
});

// Helper function to return beautiful, structured fallback advice matching the field criteria
function getFallbackAdvice(crop: string, ndvi: number, ph: number, nitrogen: number, stage: string): string {
  const isHealthy = ndvi >= 0.7;
  const isCritical = ndvi < 0.3;

  let advice = `### fallback_advisory\n`;
  
  advice += `### 🌿 Vegetation Health & NDVI Evaluation\n`;
  if (isHealthy) {
    advice += `The field exhibits an outstanding average NDVI of **${ndvi}**, signifying dense chlorophyll activity and a robust vegetative canopy. Vegetative growth is currently matching or exceeding target yield curves for this growth stage (**${stage}**).\n\n`;
  } else if (isCritical) {
    advice += `**CRITICAL WARNING**: The NDVI is extremely depressed at **${ndvi}**. This indicates severe leaf senescence, crop damage, or an almost complete absence of vegetative cover. Urgent on-ground ground-truthing is required.\n\n`;
  } else {
    advice += `The field exhibits moderate NDVI of **${ndvi}**. There are localized indications of stress or non-uniform growth. Chlorophyll density is slightly suppressed for ${crop} at this stage.\n\n`;
  }

  advice += `### 🧪 Soil & Nutrient Advisory\n`;
  if (ph < 6.0) {
    advice += `The soil pH is acidic at **${ph}**. Acidic soils restrict phosphorus uptake and reduce root efficiency. Consider variable-rate lime application (calcium carbonate) to buffer the pH toward the optimal 6.5–7.0 range.\n`;
  } else if (ph > 7.5) {
    advice += `The soil pH is slightly alkaline at **${ph}**. Micro-nutrient absorption (especially Iron and Zinc) may be restricted. Consider applying sulfur or acidifying fertilizers.\n`;
  } else {
    advice += `The soil pH of **${ph}** is within the ideal neutral zone, facilitating optimal micro and macro-nutrient transport.\n`;
  }

  if (nitrogen < 100) {
    advice += `**Nitrogen Deficit Detected**: Telemetry shows nitrogen is low at **${nitrogen} kg/ha**. We highly recommend a top-dressing of nitrogenous fertilizer (such as urea or ammonium nitrate) at 20–30 kg/ha within the next 4 days to stimulate vegetative recovery.\n\n`;
  } else {
    advice += `Soil Nitrogen is excellent at **${nitrogen} kg/ha**, supporting strong protein synthesis and leaf division.\n\n`;
  }

  advice += `### 🐛 Pest & Disease Risk Prediction\n`;
  if (isHealthy) {
    advice += `Due to current weather conditions and dense crop canopy, there is a **moderate** risk of foliar fungal pathogens (such as leaf rust or mildew). Conduct regular scouting in dense pockets.\n\n`;
  } else if (isCritical) {
    advice += `Severe stress patterns correlate with high susceptibility to root-rot or crop diseases. Inspect lower leaf collars for active necrosis immediately.\n\n`;
  } else {
    advice += `Elevated humidity may trigger early pest vectors. Preventive organic neem-oil application or light chemical spraying is recommended if field scouting reveals >5% pest population threshold.\n\n`;
  }

  advice += `### 💧 Water & Irrigation Optimization\n`;
  if (ndvi < 0.6) {
    advice += `Moisture stress indices suggest restricted water uptake. Boost irrigation by 10% or apply micro-sprinklers in identified high-stress zones.\n\n`;
  } else {
    advice += `Transpiration levels are balanced. Maintain the current standard irrigation schedule, keeping an eye on upcoming weather reports.\n\n`;
  }

  advice += `### 📅 14-Day Action Plan\n`;
  advice += `- **Days 1–3**: Conduct targeted ground-scouting in any yellow-stressed sectors.\n`;
  advice += `- **Days 4–7**: Apply nutrient top-dress if nitrogen depletion is verified.\n`;
  advice += `- **Days 8–14**: Recalculate NDVI health curves upon next Sentinel-2 satellite pass.\n`;

  return advice;
}

// Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
