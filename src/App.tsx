import React, { useState } from 'react';
import { Header } from './components/Header';
import { ModelStudio } from './components/ModelStudio';
import { DatasetStudio } from './components/DatasetStudio';
import { PromptStudio } from './components/PromptStudio';
import { MobileEdgeStudio } from './components/MobileEdgeStudio';
import { ExportModal } from './components/ExportModal';
import { BaseModel, LoraWeight, TrainingConfig, DatasetItem } from './types';
import { PRESET_BASE_MODELS } from './data/presetModels';
import { PRESET_LORAS } from './data/presetLoras';

export default function App() {
  const [activeTab, setActiveTab] = useState<'model' | 'dataset' | 'prompt' | 'mobile_edge' | 'export'>('model');

  // Selected Open Source Base Model
  const [selectedModel, setSelectedModel] = useState<BaseModel>(PRESET_BASE_MODELS[0]);

  // LoRA Stack Manager State
  const [loras, setLoras] = useState<LoraWeight[]>(PRESET_LORAS);

  // Dataset State
  const [dataset, setDataset] = useState<DatasetItem[]>([]);

  // Fine-tuning Configuration
  const [config, setConfig] = useState<TrainingConfig>({
    baseModelId: PRESET_BASE_MODELS[0].id,
    datasetName: 'flux_custom_style_lora',
    triggerWord: 'ohwx_style',
    learningRate: 0.0001,
    epochs: 10,
    batchSize: 1,
    gradientAccumulationSteps: 4,
    rank: 16,
    alpha: 16,
    dropout: 0.05,
    optimizer: 'AdamW8bit',
    quantization: 'bf16',
    targetModules: PRESET_BASE_MODELS[0].defaultTargetModules,
    maxTrainSteps: 1000,
    saveEverySteps: 200,
    mixedPrecision: 'bf16',
  });

  // Dynamic VRAM Usage Calculation
  const activeLoras = loras.filter((l) => l.active);
  const activeLoraCount = activeLoras.length;
  const rankSum = activeLoras.reduce((acc, curr) => acc + curr.rank, 0);

  const baseVram = selectedModel.vramReqLora; // base in quantized/lora mode
  const quantFactor = config.quantization === 'nf4' ? 0.6 : config.quantization === 'fp8' ? 0.8 : 1.0;
  const loraAddVram = (rankSum / 64) * 1.2 + activeLoraCount * 0.4;
  const calculatedVram = Number((baseVram * quantFactor + loraAddVram).toFixed(1));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedModel={selectedModel}
        activeLoras={loras}
        vramUsed={calculatedVram}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'model' && (
          <ModelStudio
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            loras={loras}
            setLoras={setLoras}
            config={config}
            setConfig={setConfig}
          />
        )}

        {activeTab === 'dataset' && (
          <DatasetStudio
            dataset={dataset}
            setDataset={setDataset}
            defaultTrigger={config.triggerWord}
          />
        )}

        {activeTab === 'prompt' && (
          <PromptStudio activeLoras={loras} />
        )}

        {activeTab === 'mobile_edge' && (
          <MobileEdgeStudio
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            loras={loras}
            config={config}
          />
        )}

        {activeTab === 'export' && (
          <ExportModal
            selectedModel={selectedModel}
            loras={loras}
            config={config}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p>© OpenForge AI Studio — Modellanpassung, LoRA Stacking & AI Visual Engineering</p>
          <p className="font-mono text-[11px] text-slate-600">
            Powered by Gemini 3.6 & Open-Source AI Architecture
          </p>
        </div>
      </footer>
    </div>
  );
}
