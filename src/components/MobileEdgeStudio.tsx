import React, { useState } from 'react';
import {
  Smartphone,
  Cpu,
  Zap,
  Download,
  Copy,
  Check,
  Code,
  Layers,
  Terminal,
  ShieldAlert,
  BatteryCharging,
  Gauge,
  Sparkles,
  FileJson,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { BaseModel, LoraWeight, TrainingConfig } from '../types';
import { PRESET_BASE_MODELS } from '../data/presetModels';

interface MobileEdgeStudioProps {
  selectedModel: BaseModel;
  loras: LoraWeight[];
  config: TrainingConfig;
  setSelectedModel: (model: BaseModel) => void;
}

interface MobileDevicePreset {
  id: string;
  name: string;
  chipset: string;
  ramGb: number;
  npuTops: number;
  type: 'Android (Tensor)' | 'Android (Snapdragon)' | 'Android (Fairphone / Modular)' | 'iOS (Apple Silicon)' | 'Linux Edge (Coral/Pi)';
  recommendedQuant: string;
}

const MOBILE_DEVICE_PRESETS: MobileDevicePreset[] = [
  {
    id: 'pixel-9-pro',
    name: 'Google Pixel 9 Pro',
    chipset: 'Google Tensor G4 (TPU/NPU)',
    ramGb: 16,
    npuTops: 45,
    type: 'Android (Tensor)',
    recommendedQuant: 'INT4 / int4-W4A16',
  },
  {
    id: 'fairphone-6',
    name: 'Fairphone Gen. 6 (Modular)',
    chipset: 'Qualcomm Snapdragon 7s Gen 3 / Fair-NPU',
    ramGb: 12,
    npuTops: 28,
    type: 'Android (Fairphone / Modular)',
    recommendedQuant: 'INT4 / int4-W4A16',
  },
  {
    id: 'galaxy-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    chipset: 'Snapdragon 8 Gen 3 (Hexagon NPU)',
    ramGb: 12,
    npuTops: 45,
    type: 'Android (Snapdragon)',
    recommendedQuant: 'INT4 / FP16',
  },
  {
    id: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    chipset: 'Apple A18 Pro (16-Core Neural Engine)',
    ramGb: 8,
    npuTops: 35,
    type: 'iOS (Apple Silicon)',
    recommendedQuant: 'CoreML INT4',
  },
  {
    id: 'raspberry-pi-5',
    name: 'Raspberry Pi 5 + Hailo-8 NPU',
    chipset: 'Broadcom BCM2712 + Hailo-8L',
    ramGb: 8,
    npuTops: 13,
    type: 'Linux Edge (Coral/Pi)',
    recommendedQuant: 'INT8 / TFLite',
  },
];

export const MobileEdgeStudio: React.FC<MobileEdgeStudioProps> = ({
  selectedModel,
  loras,
  config,
  setSelectedModel,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<MobileDevicePreset>(MOBILE_DEVICE_PRESETS[0]);
  const [quantMode, setQuantMode] = useState<'int4' | 'int8' | 'fp16'>('int4');
  const [activeCodeTab, setActiveCodeTab] = useState<'litert' | 'gallery' | 'kotlin' | 'python'>('litert');
  const [copied, setCopied] = useState(false);

  const activeLoras = loras.filter((l) => l.active);

  // Quick switch to Gemma-4 LiteRT model
  const selectGemma4LiteRT = () => {
    const g4 = PRESET_BASE_MODELS.find((m) => m.id === 'gemma-4-e2b-it-litert');
    if (g4) setSelectedModel(g4);
  };

  // Performance Estimations
  const modelParamsNum = parseFloat(selectedModel.params.replace('B', '')) || 2.0;
  const bytesPerParam = quantMode === 'int4' ? 0.5 : quantMode === 'int8' ? 1.0 : 2.0;
  const rawModelMemory = modelParamsNum * bytesPerParam; // in GB
  const loraMemory = activeLoras.length * 0.15; // GB
  const totalRamUsage = Number((rawModelMemory + loraMemory + 0.8).toFixed(2)); // + 0.8GB OS buffer

  const isRamSufficient = totalRamUsage <= selectedDevice.ramGb * 0.7; // Leave 30% for OS
  const estimatedSpeedTok = Number(
    Math.min(
      95,
      (selectedDevice.npuTops * 2.1) / (modelParamsNum * (quantMode === 'int4' ? 0.7 : 1.4))
    ).toFixed(1)
  );

  // LiteRT Manifest JSON
  const liteRtManifest = JSON.stringify(
    {
      litert_version: '2.0-edge',
      target_engine: 'Google LiteRT (Edge TPU / NPU Accelerator)',
      model_family: 'Gemma-4-E2B-it LiteRT Ready',
      model_id: selectedModel.id,
      model_title: `${selectedModel.name} + ${activeLoras.length} LoRAs`,
      developer: 'OpenForge AI Studio',
      runtime: 'Google AI Edge / LiteRT Framework',
      quantization: `${quantMode.toUpperCase()}_LITERT_W4A16`,
      base_model: {
        name: selectedModel.name,
        params: selectedModel.params,
        type: selectedModel.type,
      },
      litert_lora_adapters: activeLoras.map((l) => ({
        id: l.id,
        name: l.name,
        weight: l.weight,
        rank: l.rank,
        trigger_words: l.triggerWords,
        litert_file: `${l.id}_litert.bin`,
      })),
      edge_hardware_requirements: {
        min_ram_gb: Math.ceil(totalRamUsage + 1),
        recommended_chipset: selectedDevice.chipset,
        npu_acceleration: 'Required (LiteRT Delegate)',
      },
    },
    null,
    2
  );

  // Gallery Manifest JSON
  const galleryManifest = JSON.stringify(
    {
      format_version: '1.0',
      model_id: selectedModel.id,
      model_title: `${selectedModel.name} + ${activeLoras.length} LoRAs`,
      developer: 'OpenForge AI Studio',
      runtime: 'Google AI Edge / LiteRT MediaPipe',
      quantization: quantMode.toUpperCase(),
      base_model: {
        name: selectedModel.name,
        params: selectedModel.params,
        type: selectedModel.type,
      },
      lora_adapters: activeLoras.map((l) => ({
        id: l.id,
        name: l.name,
        weight: l.weight,
        rank: l.rank,
        trigger_words: l.triggerWords,
        file: `${l.id}_edge.litert`,
      })),
      edge_hardware_requirements: {
        min_ram_gb: Math.ceil(totalRamUsage + 1),
        recommended_chipset: selectedDevice.chipset,
        npu_acceleration_recommended: true,
      },
    },
    null,
    2
  );

  // Kotlin Android LiteRT MediaPipe Code
  const kotlinCode = `// Android Google LiteRT LLM Task Integration (Edge Galerie Ready)
import com.google.ai.edge.litert.LiteRtInference
import com.google.ai.edge.litert.LiteRtOptions

class LiteRtModelManager(private val context: Context) {

    private var liteRtEngine: LiteRtInference? = null

    fun initializeGemma4LiteRtModel() {
        val options = LiteRtOptions.builder()
            .setModelPath("/data/local/tmp/edge_models/${selectedModel.id}_${quantMode}.litert")
            .setNpuDelegate(LiteRtOptions.NpuDelegate.GOOGLE_TENSOR_NPU)
            .setMaxTokens(1024)
            .setTemperature(0.7f)
            // Attach Active LiteRT LoRA Weights
            ${activeLoras
              .map(
                (l) =>
                  `.addLoraAdapter("/sdcard/Download/loras/${l.id}.litert", ${l.weight}f)`
              )
              .join('\n            ')}
            .build()

        liteRtEngine = LiteRtInference.createFromOptions(context, options)
    }

    fun generateEdgeResponse(prompt: String, onStreamChunk: (String) -> Unit) {
        val triggers = "${activeLoras.map((l) => l.triggerWords.join(' ')).join(' ')}"
        val formattedPrompt = if (triggers.isNotEmpty()) "$triggers $prompt" else prompt

        liteRtEngine?.generateStream(formattedPrompt) { chunk ->
            onStreamChunk(chunk)
        }
    }
}`;

  // Python AI Edge Torch / LiteRT Conversion
  const pythonConversionScript = `# Convert Gemma-4 & LoRA Stack to Google LiteRT (.litert) Format
import ai_edge_torch
import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM

model_id = "${selectedModel.name}"
print(f"🚀 Loading Model {model_id} for Google LiteRT compilation...")

base_model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float16)

# Fuse LoRA Stack for LiteRT
${activeLoras
  .map(
    (l) =>
      `print("Fusing LoRA: ${l.name}")\nbase_model = PeftModel.from_pretrained(base_model, "./weights/${l.id}.safetensors")`
  )
  .join('\n')}

merged_model = base_model.merge_and_unload()
merged_model.eval()

# Convert to Google LiteRT format (.litert)
sample_inputs = (torch.zeros((1, 128), dtype=torch.int32),)
edge_model = ai_edge_torch.convert(merged_model, sample_inputs)

output_path = "output_mobile/${selectedModel.id}_fused_${quantMode}.litert"
edge_model.export(output_path)
print(f"✅ Successfully created Google LiteRT Edge Package: {output_path}")
`;

  const getCodeContent = () => {
    switch (activeCodeTab) {
      case 'litert':
        return liteRtManifest;
      case 'gallery':
        return galleryManifest;
      case 'kotlin':
        return kotlinCode;
      case 'python':
        return pythonConversionScript;
      default:
        return liteRtManifest;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeCodeTab === 'python' ? 'py' : activeCodeTab === 'kotlin' ? 'kt' : 'json';
    const filename = `google_edge_${selectedModel.id}_config.${ext}`;
    const blob = new Blob([getCodeContent()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Smartphone className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  Google AI Edge & LiteRT Galerie Integration
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    LiteRT Engine
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Optimiere & konvertiere deine LoRAs für <strong>Google LiteRT</strong> (ehemals TFLite) auf Android, Tensor G4 NPU & der Google Edge Galerie.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Select Edge Compatible Base Model */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-mono">Modell:</span>
            <select
              value={selectedModel.id}
              onChange={(e) => {
                const found = PRESET_BASE_MODELS.find((m) => m.id === e.target.value);
                if (found) setSelectedModel(found);
              }}
              className="bg-slate-900 border border-slate-700 text-xs text-indigo-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-indigo-500"
            >
              {PRESET_BASE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.params})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feature Highlight Banner for Gemma-4-E2B-it LiteRT Ready */}
      <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-cyan-950/90 border border-indigo-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/40 text-indigo-300 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Google Gemma-4-E2B-it LiteRT Ready Integration</h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Next-Gen Edge Runtime
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Gemma-4-E2B-it wurde speziell für Google LiteRT auf Edge-Geräten entwickelt. Es bietet On-Device Inference in Sub-Sekunden-Geschwindigkeit mit minimaler NPU-Erwärmung und direkter Anbindung an die Android Edge Galerie.
            </p>
          </div>
        </div>

        <button
          onClick={selectGemma4LiteRT}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all shrink-0 flex items-center gap-2 ${
            selectedModel.id === 'gemma-4-e2b-it-litert'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
          }`}
        >
          {selectedModel.id === 'gemma-4-e2b-it-litert' ? (
            <>
              <Check className="w-4 h-4 text-emerald-200" />
              <span>Gemma-4 LiteRT Aktiv</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Gemma-4 LiteRT Auswählen</span>
            </>
          )}
        </button>
      </div>

      {/* SECTION 1: Hardware & Performance Simulator */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">1. Mobile On-Device Hardware Simulator</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Simuliere Performanz, NPU-Auslastung und RAM-Bedarf auf realen Smartphones & Edge-Geräten.
            </p>
          </div>

          {/* Quantization Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 px-2">Quantisierung:</span>
            {(['int4', 'int8', 'fp16'] as const).map((q) => (
              <button
                key={q}
                onClick={() => setQuantMode(q)}
                className={`px-2.5 py-1 rounded-lg uppercase transition-all ${
                  quantMode === q
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Device Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {MOBILE_DEVICE_PRESETS.map((dev) => {
            const isSelected = selectedDevice.id === dev.id;

            return (
              <button
                key={dev.id}
                onClick={() => setSelectedDevice(dev)}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg ring-1 ring-indigo-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                    {dev.type}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{dev.name}</h3>
                <p className="text-xs text-slate-400 font-mono mb-3">{dev.chipset}</p>

                <div className="space-y-1 text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2">
                  <div className="flex justify-between">
                    <span>Arbeitsspeicher:</span>
                    <span className="text-slate-200">{dev.ramGb} GB RAM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NPU Power:</span>
                    <span className="text-slate-200">{dev.npuTops} TOPS</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Performance Metrics Output */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Erforderlicher RAM:
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-bold font-mono ${isRamSufficient ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalRamUsage} GB
              </span>
              <span className="text-xs text-slate-500">/ {selectedDevice.ramGb} GB</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {isRamSufficient ? '✅ Passt problemlos in den RAM' : '⚠️ Kann Memory Thrashing auslösen'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Geschätzte Geschwindigkeit:
            </span>
            <div className="text-xl font-bold font-mono text-amber-400">
              ~{estimatedSpeedTok} {selectedModel.type === 'llm-text' ? 'Tok/s' : 'ms/Step'}
            </div>
            <p className="text-[11px] text-slate-500">NPU Beschleunigung aktiv</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-cyan-400" />
              Energie & Thermik:
            </span>
            <div className="text-xl font-bold font-mono text-cyan-300">
              {quantMode === 'int4' ? 'Sehr Effizient' : quantMode === 'int8' ? 'Moderat' : 'Hohe Hitze'}
            </div>
            <p className="text-[11px] text-slate-500">
              {quantMode === 'int4' ? 'Ideal für Dauerbetrieb' : 'Kann Drosselung auslösen'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Integrierte LoRAs:
            </span>
            <div className="text-xl font-bold font-mono text-indigo-300">
              {activeLoras.length} Module ({activeLoras.reduce((a, b) => a + b.weight, 0).toFixed(2)}x)
            </div>
            <p className="text-[11px] text-slate-500">Kombiniert in TFLite Pipeline</p>
          </div>
        </div>
      </section>

      {/* SECTION 2: Google Edge Gallery Code & Manifest Exporter */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">2. Google Edge Galerie & Code Exporter</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Exportiere fertige Konfigurationen für die Android Google AI Edge Galerie oder binde dein Modell nativ in Apps ein.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopiert!' : 'Code kopieren'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Paket herunterladen</span>
            </button>
          </div>
        </div>

        {/* Code View Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 text-xs font-mono">
          <button
            onClick={() => setActiveCodeTab('litert')}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeCodeTab === 'litert' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Google LiteRT Manifest (.litert)
          </button>
          <button
            onClick={() => setActiveCodeTab('gallery')}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeCodeTab === 'gallery' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Google Edge Gallery Manifest (JSON)
          </button>
          <button
            onClick={() => setActiveCodeTab('kotlin')}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeCodeTab === 'kotlin' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Android LiteRT / MediaPipe (Kotlin)
          </button>
          <button
            onClick={() => setActiveCodeTab('python')}
            className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeCodeTab === 'python' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            AI Edge Torch (.litert Convert)
          </button>
        </div>

        {/* Code Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-indigo-300 max-h-[450px]">
          <pre>{getCodeContent()}</pre>
        </div>
      </section>
    </div>
  );
};
