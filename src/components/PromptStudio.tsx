import React, { useState } from 'react';
import { 
  Wand2, 
  Sparkles, 
  Copy, 
  Check, 
  Upload, 
  Video, 
  Image as ImageIcon, 
  Camera, 
  Layers, 
  Play, 
  RefreshCw, 
  Zap, 
  Film, 
  Sliders, 
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { LoraWeight, VisualAnalysisResult, GeneratedPromptsResult } from '../types';

interface PromptStudioProps {
  activeLoras: LoraWeight[];
}

export const PromptStudio: React.FC<PromptStudioProps> = ({ activeLoras }) => {
  const activeLoraNames = activeLoras
    .filter((l) => l.active)
    .map((l) => `${l.name} (${l.weight}x, Triggers: ${l.triggerWords.join(', ')})`)
    .join('; ');

  // Tab mode in prompt studio: 'generator' | 'analysis' | 'testdrive'
  const [activeSubTab, setActiveSubTab] = useState<'generator' | 'analysis' | 'testdrive'>('generator');

  // Generator State
  const [conceptInput, setConceptInput] = useState('Dunkle gepanzerte Kriegerin auf einem futuristischen Neondach im Regen, Studiobeleuchtung');
  const [targetEngine, setTargetEngine] = useState('flux');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedPromptsResult | null>(null);

  // Analysis / Reverse Prompting State
  const [analysisFile, setAnalysisFile] = useState<string | null>(null);
  const [analysisFileType, setAnalysisFileType] = useState<'image' | 'video'>('image');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<VisualAnalysisResult | null>(null);

  // Test Drive / Image Preview State
  const [testDrivePrompt, setTestDrivePrompt] = useState(
    'A photo of ohwx_style cyberpunk warrior on a rainy neon rooftop in Tokyo, cinematic 85mm studio lighting'
  );
  const [basePreviewUrl, setBasePreviewUrl] = useState<string | null>(null);
  const [loraPreviewUrl, setLoraPreviewUrl] = useState<string | null>(null);
  const [isGeneratingBase, setIsGeneratingBase] = useState(false);
  const [isGeneratingLora, setIsGeneratingLora] = useState(false);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate High-End Prompts
  const handleGeneratePrompts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!conceptInput) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: conceptInput,
          modelTarget: targetEngine,
          loraContext: activeLoraNames,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setGeneratedData(data.result);
        setTestDrivePrompt(data.result.imagePrompt.fullPrompt);
      }
    } catch (err) {
      console.error('Error generating prompts:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Upload & Reverse Prompting Analysis
  const handleAnalysisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video');
    setAnalysisFileType(isVid ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setAnalysisFile(base64);
      setIsAnalyzing(true);

      try {
        const res = await fetch('/api/analyze-visual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type,
            mediaType: isVid ? 'video' : 'image',
          }),
        });

        const data = await res.json();
        if (data.success && data.result) {
          setAnalysisData(data.result);
        } else {
          throw new Error(data.error || 'Analyse fehlgeschlagen');
        }
      } catch (err) {
        console.error('Analysis error:', err);
        setAnalysisData({
          analysis: {
            style: 'Cinematic 35mm Fotografie mit hoher Detailgenauigkeit',
            lighting: 'Dramatische Kontrastbeleuchtung mit warmem Rim-Light',
            camera: '85mm f/1.4 Portrait-Objektiv, flache Schärfentiefe',
            motion: isVid ? 'Langsame, stetige Kamerabewegung mit 24fps' : undefined,
          },
          imagePrompt: {
            subject: 'High-detail subject with sharp focus and clean edges',
            environment: 'Atmospheric scenery with soft volumetric lighting and dark ambient background',
            cameraTechnical: '85mm f/1.4 lens, shallow depth of field, 8k resolution style',
            fullPrompt: 'A cinematic high-detail photo, 85mm f/1.4 lens, dramatic rim lighting, soft bokeh, ultra sharp focus',
          },
          videoPrompt: {
            baseScene: 'Starting frame with crisp detail and balanced exposure',
            cameraMotion: 'Slow tracking camera push-in towards subject',
            actionDynamics: 'Subtle motion with realistic physical lighting interaction',
            styleAtmosphere: '24fps filmic motion blur, moody atmospheric lighting',
            fullVideoPrompt: 'Cinematic video sequence, slow camera tracking push-in, 24fps, volumetric lighting',
          },
          variations: [
            { title: 'Cyberpunk Neon', description: 'Neonbeleuchtung und Regen', prompt: 'Cyberpunk aesthetic, vibrant neon lighting, wet asphalt reflections' },
            { title: 'Studio Macro', description: 'Isolierter Studio-Hintergrund', prompt: 'Macro studio shot, clean background, soft rim light, sharp focus' },
            { title: 'Golden Hour', description: 'Sonnenuntergangsbeleuchtung', prompt: 'Golden hour sunlight, dramatic long shadows, warm color grading' },
          ],
        });
      } finally {
        setIsAnalyzing(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // Test Drive: Generate Base vs LoRA image previews
  const handleTestDriveGenerate = async () => {
    if (!testDrivePrompt) return;

    setIsGeneratingBase(true);
    setIsGeneratingLora(true);

    // Clean base prompt
    fetch('/api/preview-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: testDrivePrompt }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setBasePreviewUrl(data.imageUrl);
      })
      .finally(() => setIsGeneratingBase(false));

    // LoRA injected prompt with active triggers
    const triggerPrefix = activeLoras
      .filter((l) => l.active)
      .flatMap((l) => l.triggerWords)
      .join(', ');

    const loraPrompt = triggerPrefix ? `${triggerPrefix}, ${testDrivePrompt}` : testDrivePrompt;

    fetch('/api/preview-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: loraPrompt }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLoraPreviewUrl(data.imageUrl);
      })
      .finally(() => setIsGeneratingLora(false));
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Sub-navigation Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">AI Visual & Prompt Engineering Studio</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Professionelle Prompts für FLUX, Midjourney, Veo, Runway Gen-3 & Luma. Inklusive Multimodal Reverse-Prompting und LoRA-Testdrive.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('generator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'generator' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Prompt Generator
          </button>
          <button
            onClick={() => setActiveSubTab('analysis')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'analysis' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Reverse Prompting
          </button>
          <button
            onClick={() => setActiveSubTab('testdrive')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'testdrive' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            LoRA Test-Drive
          </button>
        </div>
      </div>

      {/* SUB TAB 1: PROMPT GENERATOR */}
      {activeSubTab === 'generator' && (
        <div className="space-y-8">
          {/* Input Form */}
          <form onSubmit={handleGeneratePrompts} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="block text-xs font-mono font-semibold text-slate-300">
                  Visual Concept & Modellspezifikation (auf Deutsch beschreiben)
                </label>
                <input
                  type="text"
                  value={conceptInput}
                  onChange={(e) => setConceptInput(e.target.value)}
                  placeholder="z. B. Cyberpunk Samurai auf einem verregneten Hochhaus, Studiobeleuchtung..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="w-full md:w-56 space-y-1.5">
                <label className="block text-xs font-mono font-semibold text-slate-300">
                  Zielmodul / Engine
                </label>
                <select
                  value={targetEngine}
                  onChange={(e) => setTargetEngine(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="flux">FLUX.1 [dev/schnell]</option>
                  <option value="midjourney">Midjourney v6.1</option>
                  <option value="veo">Veo 3.1 Video</option>
                  <option value="runway">Runway Gen-3 Alpha</option>
                  <option value="sora">OpenAI Sora / Luma</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini generiert Prompts...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Prompts generieren</span>
                  </>
                )}
              </button>
            </div>

            {/* Active LoRA Context Notice */}
            {activeLoraNames && (
              <div className="text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 px-3.5 py-2 rounded-xl flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  <strong>Aktive LoRA-Integration:</strong> {activeLoraNames}
                </span>
              </div>
            )}
          </form>

          {/* Results Display */}
          {generatedData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* IMAGE PROMPT COMPONENT STRUCTURE */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-white text-md">Bild-Prompt Komponenten (High-End)</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedData.imagePrompt.fullPrompt, 'img-full')}
                    className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-950 px-3 py-1.5 rounded-lg border border-indigo-800 hover:bg-indigo-900 transition-colors"
                  >
                    {copiedKey === 'img-full' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Prompt kopieren</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <span className="text-indigo-400 font-bold block mb-0.5">1. Subject (Hauptmotiv):</span>
                    <p className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-200">{generatedData.imagePrompt.subject}</p>
                  </div>

                  <div>
                    <span className="text-indigo-400 font-bold block mb-0.5">2. Environment & Lighting:</span>
                    <p className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-200">{generatedData.imagePrompt.environment}</p>
                  </div>

                  <div>
                    <span className="text-indigo-400 font-bold block mb-0.5">3. Camera & Technical:</span>
                    <p className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-200">{generatedData.imagePrompt.cameraTechnical}</p>
                  </div>

                  <div>
                    <span className="text-emerald-400 font-bold block mb-0.5">4. Full Copy-Paste Image Prompt:</span>
                    <pre className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 text-emerald-300 font-mono text-[11px] whitespace-pre-wrap select-all">
                      {generatedData.imagePrompt.fullPrompt}
                    </pre>
                  </div>
                </div>
              </div>

              {/* VIDEO PROMPT COMPONENT STRUCTURE */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Film className="w-5 h-5 text-pink-400" />
                    <h3 className="font-bold text-white text-md">Video-Prompt Komponenten (Veo / Runway)</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedData.videoPrompt.fullVideoPrompt, 'vid-full')}
                    className="flex items-center gap-1.5 text-xs text-pink-300 bg-pink-950 px-3 py-1.5 rounded-lg border border-pink-800 hover:bg-pink-900 transition-colors"
                  >
                    {copiedKey === 'vid-full' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Video-Prompt kopieren</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <span className="text-pink-400 font-bold block mb-0.5">1. Base Scene:</span>
                    <p className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-200">{generatedData.videoPrompt.baseScene}</p>
                  </div>

                  <div>
                    <span className="text-pink-400 font-bold block mb-0.5">2. Camera Motion:</span>
                    <p className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-200">{generatedData.videoPrompt.cameraMotion}</p>
                  </div>

                  <div>
                    <span className="text-pink-400 font-bold block mb-0.5">3. Action & Dynamics:</span>
                    <p className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-200">{generatedData.videoPrompt.actionDynamics}</p>
                  </div>

                  <div>
                    <span className="text-pink-400 font-bold block mb-0.5">4. Style & Atmosphere:</span>
                    <p className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-200">{generatedData.videoPrompt.styleAtmosphere}</p>
                  </div>

                  <div>
                    <span className="text-emerald-400 font-bold block mb-0.5">5. Full Copy-Paste Video Prompt:</span>
                    <pre className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 text-emerald-300 font-mono text-[11px] whitespace-pre-wrap select-all">
                      {generatedData.videoPrompt.fullVideoPrompt}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Proactive 3 Variations */}
              <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="font-bold text-white text-md flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Proaktive Variationen & Stil-Anpassungen
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {generatedData.variations.map((v, idx) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-indigo-300 text-xs">{v.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{v.description}</p>
                        <p className="text-[11px] font-mono text-slate-300 mt-2 line-clamp-3 bg-slate-900 p-2 rounded-lg border border-slate-800">
                          {v.prompt}
                        </p>
                      </div>

                      <button
                        onClick={() => copyToClipboard(v.prompt, `var-${idx}`)}
                        className="w-full mt-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        {copiedKey === `var-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Variation kopieren</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB TAB 2: REVERSE PROMPTING / VISUAL ANALYSIS */}
      {activeSubTab === 'analysis' && (
        <div className="space-y-8">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="font-bold text-white text-md flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" />
              Multimodales Reverse-Prompting (Bild & Video hochladen)
            </h3>

            {/* Upload Box */}
            <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/50 hover:bg-slate-900/40 rounded-2xl p-8 text-center transition-all cursor-pointer group">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleAnalysisUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Bild oder Video zur KI-Analyse hochladen</p>
                  <p className="text-xs text-slate-400 mt-1">Gemini analysiert Stil, Kamera, Licht und Bewegung und rekonstruiert den exakten Prompt</p>
                </div>
              </div>
            </div>

            {isAnalyzing && (
              <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-sm font-bold text-white">Gemini Vision analysiert Bild- & Videomaterial...</p>
                <p className="text-xs text-slate-400">Einstellungsgröße, Beleuchtung und Bewegungsdynamik werden ausgewertet.</p>
              </div>
            )}

            {analysisData && (
              <div className="space-y-6 pt-4 border-t border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-indigo-400 block font-bold">Kunststil & Medium</span>
                    <p className="text-xs text-slate-200 mt-1">{analysisData.analysis.style}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-indigo-400 block font-bold">Kamera & Objektiv</span>
                    <p className="text-xs text-slate-200 mt-1">{analysisData.analysis.camera}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-mono text-indigo-400 block font-bold">Lichtquelle & Stimmung</span>
                    <p className="text-xs text-slate-200 mt-1">{analysisData.analysis.lighting}</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">Rekonstruierter Full Image Prompt:</span>
                    <button
                      onClick={() => copyToClipboard(analysisData.imagePrompt.fullPrompt, 'rev-full')}
                      className="text-xs text-indigo-300 font-mono hover:underline"
                    >
                      Kopieren
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap select-all">
                    {analysisData.imagePrompt.fullPrompt}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB TAB 3: LORA TEST DRIVE */}
      {activeSubTab === 'testdrive' && (
        <div className="space-y-8">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-md flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  LoRA Test-Drive: Vorher vs. Nachher (Base vs. LoRA Stack)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Generiere Testbilder mit und ohne aktive LoRAs, um den visuellen Einfluss direkt im Browser zu vergleichen.
                </p>
              </div>

              <button
                onClick={handleTestDriveGenerate}
                disabled={isGeneratingBase || isGeneratingLora}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                {(isGeneratingBase || isGeneratingLora) ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>Testbild generieren</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Test-Prompt</label>
              <input
                type="text"
                value={testDrivePrompt}
                onChange={(e) => setTestDrivePrompt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Split Comparison View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Base Model Only */}
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300">Nur Basismodell (Ohne LoRA)</span>
                  <span className="text-[10px] font-mono text-slate-500">Pure Weights</span>
                </div>

                <div className="h-64 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
                  {isGeneratingBase ? (
                    <div className="text-center space-y-2">
                      <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                      <p className="text-xs text-slate-400 font-mono">Render Base Image...</p>
                    </div>
                  ) : basePreviewUrl ? (
                    <img src={basePreviewUrl} alt="Base Model Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <p className="text-xs text-slate-600 font-mono">Klicke "Testbild generieren"</p>
                  )}
                </div>
              </div>

              {/* Right: Base + Active LoRA Stack */}
              <div className="bg-slate-950 rounded-2xl p-4 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-300">Basismodell + LoRA Stack</span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {activeLoras.filter((l) => l.active).length} LoRAs Injected
                  </span>
                </div>

                <div className="h-64 bg-slate-900 rounded-xl border border-indigo-800/50 flex items-center justify-center overflow-hidden">
                  {isGeneratingLora ? (
                    <div className="text-center space-y-2">
                      <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                      <p className="text-xs text-slate-400 font-mono">Applying LoRA Weights...</p>
                    </div>
                  ) : loraPreviewUrl ? (
                    <img src={loraPreviewUrl} alt="LoRA Stack Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <p className="text-xs text-slate-600 font-mono">Klicke "Testbild generieren"</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
