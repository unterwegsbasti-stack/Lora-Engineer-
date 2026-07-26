import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Lazy init for Gemini AI Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ist in den Umgebungsvariablen nicht gesetzt.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper function to execute Gemini API content generation with automatic model fallback
async function generateContentWithFallback(ai: GoogleGenAI, requestOptions: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
}) {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.6-flash'];

  let lastError: any = null;
  for (const modelName of modelsToTry) {
    try {
      const config: any = {};
      if (requestOptions.systemInstruction) config.systemInstruction = requestOptions.systemInstruction;
      if (requestOptions.responseMimeType) config.responseMimeType = requestOptions.responseMimeType;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: requestOptions.contents,
        config,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${modelName} call returned error:`, err?.message || err);
      lastError = err;
      // If 429 rate limit or 404, try next fallback model
      if (err?.status === 429 || err?.status === 404 || err?.message?.includes('429') || err?.message?.includes('quota')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('AII API Aufruf fehlgeschlagen. Bitte versuche es in einigen Sekunden erneut.');
}
app.post('/api/analyze-visual', async (req, res) => {
  try {
    const { imageBase64, mimeType, mediaType = 'image', customInstruction } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'Kein Bild- oder Videomaterial übergeben.' });
    }

    const ai = getGeminiClient();

    const isVideo = mediaType === 'video';

    const systemInstruction = `Du bist ein erstklassiger AI Visual & Prompt Engineering Specialist.
Deine Aufgabe ist es, das bereitgestellte Bild- oder Videomaterial tiefgehend auf Deutsch zu analysieren und hochpräzise, qualitativ überragende Prompts auf ENGLISCH zu erstellen.

Vermeide schwammige Buzzwords wie "hyperrealistic", "4K", "8K", "ultra-detailed" oder "trending on Artstation". Verwende stattdessen präzise Fachbegriffe (z. B. "shot on ARRI Alexa 65", "subsurface scattering", "shallow depth of field", "volumetric lighting", "cinematic motion").

Liefere ein strukturiertes JSON zurück mit folgenden Feldern:
- "analysis": {
    "style": "Beschreibung von Kunststil, Medium & Stimmung (auf Deutsch)",
    "lighting": "Lichtquelle, Stimmung, Farbpalette (auf Deutsch)",
    "camera": "Einstellungsgröße, Blickwinkel, Objektiv/Brennweite (auf Deutsch)",
    "motion": "Kamerabewegung & Pacing (falls Video, sonst null)"
  }
- "imagePrompt": {
    "subject": "Main subject and key details in English",
    "environment": "Scenery, lighting atmosphere, color palette in English",
    "cameraTechnical": "Camera type, focal length, perspective, style in English",
    "fullPrompt": "Complete copy-paste image prompt in English"
  }
- "videoPrompt": {
    "baseScene": "Description of starting frame in English",
    "cameraMotion": "Camera movement e.g. slow tracking shot in English",
    "actionDynamics": "Movement of subject over time in English",
    "styleAtmosphere": "Lighting, physics, pacing in English",
    "fullVideoPrompt": "Complete copy-paste video prompt in English"
  }
- "variations": [
    { "title": "Variation 1 Title", "description": "Kurze Erklärung auf Deutsch", "prompt": "Full English prompt" },
    { "title": "Variation 2 Title", "description": "Kurze Erklärung auf Deutsch", "prompt": "Full English prompt" },
    { "title": "Variation 3 Title", "description": "Kurze Erklärung auf Deutsch", "prompt": "Full English prompt" }
  ]`;

    const promptText = customInstruction 
      ? `Analysiere dieses Material und berücksichtigung folgenden Nutzerwunsch: "${customInstruction}". Erstelle die geforderten Prompts.`
      : `Analysiere dieses ${isVideo ? 'Videobild/Video' : 'Bild'} im Detail und erstelle präzise Prompts für Flux, Midjourney, Veo und Runway Gen-3.`;

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: imageBase64.replace(/^data:image\/\w+;base64,/, '').replace(/^data:video\/\w+;base64,/, ''),
      },
    };

    const responseText = await generateContentWithFallback(ai, {
      contents: { parts: [imagePart, { text: promptText }] },
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsedData = JSON.parse(responseText);
    res.json({ success: true, result: parsedData });

  } catch (error: any) {
    console.error('Error analyzing visual:', error);
    res.status(500).json({ error: error.message || 'Analyse fehlgeschlagen.' });
  }
});

// 2. High-End Prompt Generator for Image & Video
app.post('/api/generate-prompts', async (req, res) => {
  try {
    const { concept, mode = 'both', modelTarget = 'flux', loraContext } = req.body;

    if (!concept) {
      return res.status(400).json({ error: 'Kein Konzept übergeben.' });
    }

    const ai = getGeminiClient();

    const systemInstruction = `Du bist ein erstklassiger AI Visual & Prompt Engineering Specialist.
Erstelle aus der Nutzeridee hochpräzise, qualitativ überragende Prompts für führende Generatoren (${modelTarget}, Midjourney, Ideogram, Veo, Runway Gen-3, Luma).
Verwende präzise Fachbegriffe und keine vagen Buzzwords.
Erklärungen auf Deutsch, Prompts auf ENGLISCH!

Falls ein LoRA-Kontext gegeben ist (${loraContext || 'keiner'}), integriere Trigger-Words und Stilmerkmale natürlich in den Prompt.

Antworte strictly im folgenden JSON Format:
{
  "conceptTitle": "Kurzer prägnanter Titel auf Deutsch",
  "imagePrompt": {
    "subject": "Subject and key details in English",
    "environment": "Environment, scenery and lighting in English",
    "cameraTechnical": "Camera lens, shot type, render/photo style in English",
    "fullPrompt": "Full copy-paste prompt in English"
  },
  "videoPrompt": {
    "baseScene": "Starting frame description in English",
    "cameraMotion": "Exact camera movement in English",
    "actionDynamics": "Subject action and dynamics over time in English",
    "styleAtmosphere": "Lighting, motion physics, frame rate style in English",
    "fullVideoPrompt": "Full copy-paste video prompt in English"
  },
  "variations": [
    { "title": "Titel 1", "description": "Änderung z. B. Cyberpunk / Dramatisch", "prompt": "English Prompt" },
    { "title": "Titel 2", "description": "Änderung z. B. Macro / Studio", "prompt": "English Prompt" },
    { "title": "Titel 3", "description": "Änderung z. B. Anime / Watercolor", "prompt": "English Prompt" }
  ]
}`;

    const responseText = await generateContentWithFallback(ai, {
      contents: `Erstelle High-End Prompts für folgende Idee: "${concept}". Modellspezifisches Ziel: ${modelTarget}.`,
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(responseText || '{}');
    res.json({ success: true, result: parsed });

  } catch (error: any) {
    console.error('Error generating prompts:', error);
    res.status(500).json({ error: error.message || 'Prompt-Generierung fehlgeschlagen.' });
  }
});

// 3. AI Dataset Auto-Captioning & Trigger Word Extraction
app.post('/api/auto-caption', async (req, res) => {
  try {
    const { imageBase64, mimeType, triggerWord = 'ohwx', taskType = 'image' } = req.body;
    const ai = getGeminiClient();

    if (taskType === 'text') {
      const promptText = `Du bist ein AI Dataset Specialist. Generiere 5 hochwertige Trainings-Datensätze (JSON) mit Prompt/Completion Paarungen und Trigger-Word "${triggerWord}" für Fine-Tuning.`;
      const responseText = await generateContentWithFallback(ai, {
        contents: promptText,
        responseMimeType: 'application/json',
      });
      return res.json({ success: true, captions: JSON.parse(responseText || '[]') });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'Kein Bild für Captioning übergeben.' });
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
      },
    };

    const promptText = `Analysiere dieses Bild für ein LoRA Fine-Tuning Dataset. 
1. Erstelle eine detaillierte englische Bildbeschreibung (Caption) unter Verwendung des Trigger-Words "${triggerWord}".
2. Extrahiere Schlüsselwörter (Tags).
3. Beurteile die Eignung für LoRA Training (Schärfe, Beleuchtung, Komposition).

Antworte im JSON-Format:
{
  "caption": "A photo of ${triggerWord}, ...",
  "tags": ["tag1", "tag2", "tag3"],
  "qualityScore": 95,
  "recommendations": "Hinweise zur Nutzung im Trainingssatz auf Deutsch"
}`;

    const responseText = await generateContentWithFallback(ai, {
      contents: { parts: [imagePart, { text: promptText }] },
      responseMimeType: 'application/json',
    });

    res.json({ success: true, result: JSON.parse(responseText || '{}') });

  } catch (error: any) {
    console.error('Error in auto-caption:', error);
    res.status(500).json({ error: error.message || 'Captioning fehlgeschlagen.' });
  }
});

// 4. Test Image Preview Generation with Ultra-Fast Pollinations Engine
app.post('/api/preview-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Kein Prompt übergeben.' });
    }

    // High quality real-time Diffusion Engine (Pollinations AI)
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt);
    let width = 1024;
    let height = 1024;
    if (aspectRatio === '16:9') {
      width = 1280;
      height = 720;
    } else if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (aspectRatio === '4:3') {
      width = 1024;
      height = 768;
    } else if (aspectRatio === '3:4') {
      width = 768;
      height = 1024;
    }

    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

    res.json({ success: true, imageUrl });

  } catch (error: any) {
    console.error('Error generating preview image:', error);
    res.status(500).json({ error: error.message || 'Bildgenerierung fehlgeschlagen.' });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server gestartet auf http://localhost:${PORT}`);
  });
}

startServer();
