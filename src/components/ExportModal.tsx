import React, { useState } from 'react';
import { Download, Copy, Check, Code, FileCode, Layers, Terminal } from 'lucide-react';
import { BaseModel, LoraWeight, TrainingConfig } from '../types';

interface ExportModalProps {
  selectedModel: BaseModel;
  loras: LoraWeight[];
  config: TrainingConfig;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  selectedModel,
  loras,
  config,
}) => {
  const [activeTab, setActiveTab] = useState<'peft' | 'unsloth' | 'kohya' | 'diffusers' | 'comfy' | 'edge_tflite' | 'litert'>('litert');
  const [copied, setCopied] = useState(false);

  const activeLoras = loras.filter((l) => l.active);

  // Generate PEFT HuggingFace Config JSON
  const peftJson = JSON.stringify(
    {
      peft_type: 'LORA',
      auto_mapping: null,
      base_model_name_or_path: selectedModel.name,
      r: config.rank,
      lora_alpha: config.alpha,
      lora_dropout: config.dropout,
      target_modules: selectedModel.defaultTargetModules,
      bias: 'none',
      task_type: selectedModel.type === 'llm-text' ? 'CAUSAL_LM' : 'FEATURE_EXTRACTION',
      quantization_bit: config.quantization === 'nf4' ? 4 : config.quantization === 'fp8' ? 8 : 16,
    },
    null,
    2
  );

  // Generate Unsloth Training Script
  const unslothScript = `# Unsloth Fine-Tuning Script for ${selectedModel.name}
from unsloth import FastLanguageModel
import torch

max_seq_length = 2048
dtype = None # Auto detection
load_in_4bit = ${config.quantization === 'nf4' ? 'True' : 'False'}

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "${selectedModel.name}",
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
)

model = FastLanguageModel.get_peft_model(
    model,
    r = ${config.rank},
    target_modules = ${JSON.stringify(selectedModel.defaultTargetModules)},
    lora_alpha = ${config.alpha},
    lora_dropout = ${config.dropout},
    bias = "none",
    use_gradient_checkpointing = "unsloth",
    random_state = 3407,
)

print("LoRA Model initialized successfully!")
`;

  // Generate Kohya_ss TOML Config
  const kohyaToml = `[model_arguments]
v2 = false
v_parameterization = false
pretrained_model_name_or_path = "${selectedModel.name}"

[dataset_arguments]
debug_dataset = false

[training_arguments]
output_dir = "./output_lora"
output_name = "${config.datasetName || 'my_custom_lora'}"
save_precision = "fp16"
save_model_as = "safetensors"
train_batch_size = ${config.batchSize}
max_train_steps = ${config.maxTrainSteps}
learning_rate = ${config.learningRate}
lr_scheduler = "cosine"
optimizer_type = "${config.optimizer}"
mixed_precision = "${config.quantization}"
network_dim = ${config.rank}
network_alpha = ${config.alpha}
network_module = "networks.lora"
`;

  // Generate PyTorch Diffusers Pipeline Script
  const diffusersScript = `# PyTorch Diffusers Multi-LoRA Loading Pipeline
import torch
from diffusers import DiffusionPipeline

pipe = DiffusionPipeline.from_pretrained(
    "${selectedModel.name}",
    torch_dtype=torch.bfloat16
).to("cuda")

# Load and fuse active LoRA stack
${activeLoras
  .map(
    (l, idx) =>
      `pipe.load_lora_weights("./weights/${l.id}.safetensors", adapter_name="lora_${idx}")`
  )
  .join('\n')}

# Set LoRA adapter weights
adapter_names = [${activeLoras.map((_, i) => `"lora_${i}"`).join(', ')}]
adapter_weights = [${activeLoras.map((l) => l.weight).join(', ')}]

pipe.set_adapters(adapter_names, adapter_weights=adapter_weights)

prompt = "A photo of ohwx_style in luxury studio lighting"
image = pipe(prompt).images[0]
image.save("result_lora_stack.png")
`;

  // Generate ComfyUI Load LoRA Node Workflow JSON
  const comfyJson = JSON.stringify(
    {
      nodes: [
        {
          id: 1,
          type: 'CheckpointLoaderSimple',
          widgets_values: [selectedModel.name],
        },
        ...activeLoras.map((l, i) => ({
          id: i + 2,
          type: 'LoraLoader',
          widgets_values: [`${l.id}.safetensors`, l.weight, l.weight],
        })),
      ],
    },
    null,
    2
  );

  // Generate Google AI Edge / LiteRT Config
  const liteRtConfig = JSON.stringify(
    {
      format: 'Google LiteRT Package (.litert)',
      target_engine: 'Google LiteRT Runtime (On-Device NPU / TPU Delegate)',
      target_model: selectedModel.name,
      model_family: selectedModel.id === 'gemma-4-e2b-it-litert' ? 'Gemma-4-E2B-it LiteRT Native' : selectedModel.name,
      runtime: 'LiteRT LLM Inference / AI Edge Torch',
      quantization: 'INT4_W4A16_LITERT',
      active_loras: activeLoras.map((l) => ({
        id: l.id,
        name: l.name,
        weight: l.weight,
        rank: l.rank,
        trigger_words: l.triggerWords,
        file: `${l.id}_litert.bin`,
      })),
      conversion_command: `ai-edge-torch convert --model ${selectedModel.id} --lora-weights ${activeLoras.map((l) => l.id).join(',')} --output ${selectedModel.id}_litert.litert --quantize int4`,
    },
    null,
    2
  );

  // Generate Google AI Edge / MediaPipe .task Config
  const edgeTfliteConfig = JSON.stringify(
    {
      format: 'Google AI Edge / MediaPipe Task Bundle',
      target_model: selectedModel.name,
      runtime: 'MediaPipe LLM Task / TFLite GPU',
      active_loras: activeLoras.map((l) => ({
        id: l.id,
        name: l.name,
        weight: l.weight,
        rank: l.rank,
        trigger_words: l.triggerWords,
      })),
      conversion_command: `ai-edge-torch convert --model ${selectedModel.id} --lora-weights ${activeLoras.map((l) => l.id).join(',')} --quantize int4`,
    },
    null,
    2
  );

  const getCodeContent = () => {
    switch (activeTab) {
      case 'litert':
        return liteRtConfig;
      case 'peft':
        return peftJson;
      case 'unsloth':
        return unslothScript;
      case 'kohya':
        return kohyaToml;
      case 'diffusers':
        return diffusersScript;
      case 'comfy':
        return comfyJson;
      case 'edge_tflite':
        return edgeTfliteConfig;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeTab === 'unsloth' || activeTab === 'diffusers' ? 'py' : activeTab === 'kohya' ? 'toml' : 'json';
    const filename = `openforge_${activeTab}_config.${ext}`;
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Export & Modellausgabe-Konfigurationen</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Exportiere fertige LoRA-Gewichte, Hyperparameter-Configs und Trainingsskripte für Unsloth, Kohya_ss, Diffusers oder ComfyUI.
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
              <span>Datei herunterladen</span>
            </button>
          </div>
        </div>

        {/* Script Selection Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('peft')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeTab === 'peft' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            PEFT / HuggingFace (JSON)
          </button>
          <button
            onClick={() => setActiveTab('unsloth')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeTab === 'unsloth' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Unsloth Script (Python)
          </button>
          <button
            onClick={() => setActiveTab('kohya')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeTab === 'kohya' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Kohya_ss Config (TOML)
          </button>
          <button
            onClick={() => setActiveTab('diffusers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeTab === 'diffusers' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Diffusers Stacking (Python)
          </button>
          <button
            onClick={() => setActiveTab('comfy')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeTab === 'comfy' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            ComfyUI Workflow (JSON)
          </button>
          <button
            onClick={() => setActiveTab('litert')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'litert' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Google LiteRT (.litert)
          </button>
          <button
            onClick={() => setActiveTab('edge_tflite')}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeTab === 'edge_tflite' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            MediaPipe Task (.task)
          </button>
        </div>

        {/* Code View */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto text-indigo-300 max-h-[500px]">
          <pre>{getCodeContent()}</pre>
        </div>
      </div>
    </div>
  );
};
