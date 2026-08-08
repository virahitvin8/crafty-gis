/* ═══════════════════════════════════════════════════════════
   FarmHealth — Vercel Serverless Function
   Gemini agricultural advisory (with expert fallback)
   ═══════════════════════════════════════════════════════════ */

// Expert fallback advice when no Gemini key is configured (offline-safe)
function getFallbackAdvice(crop, ndvi, ph, nitrogen, stage) {
  const isHealthy = ndvi >= 0.7;
  const isCritical = ndvi < 0.3;

  let advice = `### 🌿 Vegetation Health Evaluation\n`;
  if (isHealthy) {
    advice += `The field exhibits an outstanding average value of **${ndvi}**, signifying dense activity and a robust vegetative canopy. Growth is currently matching or exceeding target yield curves for this stage (**${stage}**).\n\n`;
  } else if (isCritical) {
    advice += `**CRITICAL WARNING**: The index is extremely depressed at **${ndvi}**. This indicates severe stress, crop damage, or an almost complete absence of vegetative cover. Urgent on-ground ground-truthing is required.\n\n`;
  } else {
    advice += `The field exhibits moderate value of **${ndvi}**. There are localized indications of stress or non-uniform growth. Chlorophyll density is slightly suppressed for ${crop} at this stage.\n\n`;
  }

  advice += `### 🧪 Soil & Nutrient Advisory\n`;
  if (ph < 6.0) {
    advice += `The soil pH is acidic at **${ph}**. Acidic soils restrict phosphorus uptake and reduce root efficiency. Consider variable-rate lime application to buffer the pH toward the optimal 6.5–7.0 range.\n`;
  } else if (ph > 7.5) {
    advice += `The soil pH is slightly alkaline at **${ph}**. Micro-nutrient absorption (especially Iron and Zinc) may be restricted. Consider applying sulfur or acidifying fertilizers.\n`;
  } else {
    advice += `The soil pH of **${ph}** is within the ideal neutral zone, facilitating optimal micro and macro-nutrient transport.\n`;
  }

  if (nitrogen < 100) {
    advice += `**Nitrogen Deficit Detected**: Telemetry shows nitrogen is low at **${nitrogen} kg/ha**. We highly recommend a top-dressing of nitrogenous fertilizer at 20–30 kg/ha within the next 4 days to stimulate vegetative recovery.\n\n`;
  } else {
    advice += `Soil Nitrogen is excellent at **${nitrogen} kg/ha**, supporting strong protein synthesis and leaf division.\n\n`;
  }

  advice += `### 💧 Water & Irrigation Optimization\n`;
  advice += ndvi < 0.6
    ? `Moisture stress indices suggest restricted water uptake. Boost irrigation by 10% or apply micro-sprinklers in identified high-stress zones.\n\n`
    : `Transpiration levels are balanced. Maintain the current standard irrigation schedule, keeping an eye on upcoming weather reports.\n\n`;

  advice += `### 📅 14-Day Action Plan\n`;
  advice += `- **Days 1–3**: Conduct targeted ground-scouting in any yellow-stressed sectors.\n`;
  advice += `- **Days 4–7**: Apply nutrient top-dress if nitrogen depletion is verified.\n`;
  advice += `- **Days 8–14**: Recalculate health curves upon next satellite pass.\n`;

  return advice;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { fieldName, crop, ndvi, soilPh, soilNitrogen, soilOrganicCarbon, growthStage, weather } = req.body || {};
  const key = process.env.GEMINI_API_KEY;

  if (!key || key === 'your_gemini_api_key_here') {
    return res.status(200).json({
      advice: getFallbackAdvice(crop || 'Wheat', ndvi || 0.74, soilPh || 6.8, soilNitrogen || 142, growthStage || 'mid'),
      isFallback: true
    });
  }

  const prompt = `
    You are FarmHealth's Lead Agronomist AI, powered by satellite and soil telemetry.
    Analyze the following crop and field telemetry:
    - Field Name: ${fieldName || "Unknown"}
    - Crop / Cover: ${crop || "Wheat"}
    - Current Average Index Value: ${ndvi || 0.74}
    - Growth Stage: ${growthStage || "Mid (vegetative)"}
    - Soil pH: ${soilPh || 6.8}
    - Soil Nitrogen: ${soilNitrogen || 142} kg/ha
    - Organic Carbon: ${soilOrganicCarbon || 2.4}%
    - Current Weather: Temp ${weather?.temp || 28}°C, Condition: ${weather?.condition || "Sunny"}, Rain Prob: ${weather?.rainProb || 12}%

    Provide an expert agricultural analysis with these sections in clean Markdown:
    1. **Vegetation Health Evaluation**
    2. **Soil & Nutrient Advisory**
    3. **Pest & Disease Risk Prediction**
    4. **Water & Irrigation Optimization**
    5. **Harvest Window & Action Plan**
    Keep the tone professional, precise, scientific, and encouraging. Limit to 300-400 words.
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) throw new Error(`Gemini API returned ${response.status}`);

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ advice: text || 'No analysis could be generated.', isFallback: false });
  } catch (error) {
    console.error('Gemini Function Error:', error);
    res.status(200).json({
      advice: getFallbackAdvice(crop || 'Wheat', ndvi || 0.74, soilPh || 6.8, soilNitrogen || 142, growthStage || 'mid') +
        `\n\n*(Note: Analysis fell back to local expert model due to: ${error?.message || 'connection issues'})*`,
      isFallback: true
    });
  }
};
