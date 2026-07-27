import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Sliders, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Trash2, 
  Download, 
  Sparkles, 
  Info,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Tag,
  Activity,
  Smartphone
} from 'lucide-react';
import { BaseModel, LoraWeight, TrainingConfig, TrainingMetricPoint, TrainingLogEntry } from '../types';
import { PRESET_BASE_MODELS } from '../data/presetModels';
import { downloadEdgeModelFile } from '../utils/edgeModelExporter';

interface ModelStudioProps {
  selectedModel: BaseModel;
  setSelectedModel: (model: BaseModel) => void;
  loras: LoraWeight[];
  setLoras: React.Dispatch<React.SetStateAction<LoraWeight[]>>;
  config: TrainingConfig;
  setConfig: React.Dispatch<React.SetStateAction<TrainingConfig>>;
}

export const ModelStudio: React.FC<ModelStudioProps> = ({
  selectedModel,
  setSelectedModel,
  loras,
  setLoras,
  config,
  setConfig,
}) => {
  // Filter state for LoRA list
  const [onlySelectedModelCompat, setOnlySelectedModelCompat] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // New LoRA Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLoraName, setNewLoraName] = useState('');
  const [newLoraCategory, setNewLoraCategory] = useState<'style' | 'character' | 'concept' | 'code' | 'domain' | 'custom'>('style');
  const [newLoraTriggers, setNewLoraTriggers] = useState('');
  const [newLoraDescription, setNewLoraDescription] = useState('');
  const [newLoraCompatModels, setNewLoraCompatModels] = useState<string[]>([selectedModel.id]);

  // Keep modal default in sync when selected model changes
  useEffect(() => {
    if (!newLoraCompatModels.includes(selectedModel.id)) {
      setNewLoraCompatModels((prev) => Array.from(new Set([selectedModel.id, ...prev])));
    }
  }, [selectedModel.id]);

  // Interactive Training Simulator State
  const [isTraining, setIsTraining] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(1);
  const [metrics, setMetrics] = useState<TrainingMetricPoint[]>([]);
  const [logs, setLogs] = useState<TrainingLogEntry[]>([]);

  // Simulation Loop Effect
  useEffect(() => {
    let timer: any;
    if (isTraining && currentStep < config.maxTrainSteps) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          const next = prev + 10;
          if (next >= config.maxTrainSteps) {
            setIsTraining(false);
            setLogs((l) => [
              { timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Training erfolgreich abgeschlossen bei Step ${config.maxTrainSteps}! LoRA Weights extrahiert.` },
              ...l,
            ]);
          }
          return Math.min(next, config.maxTrainSteps);
        });

        // Generate synthetic realistic loss curve
        const stepNum = currentStep + 10;
        const decayFactor = Math.exp(-stepNum / 300);
        const noise = (Math.random() - 0.5) * 0.03;
        const simulatedLoss = Math.max(0.04, Number((0.65 * decayFactor + 0.08 + noise).toFixed(4)));
        const vram = Math.min(selectedModel.vramReqMin, Number((selectedModel.vramReqLora + Math.random() * 0.8).toFixed(1)));

        setMetrics((prev) => [
          ...prev,
          {
            step: stepNum,
            epoch: Math.floor(stepNum / (config.maxTrainSteps / config.epochs)) + 1,
            loss: simulatedLoss,
            vramUsageGb: vram,
            learningRate: config.learningRate,
          },
        ]);

        if (stepNum % 100 === 0) {
          setLogs((l) => [
            { timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Step ${stepNum}/${config.maxTrainSteps} - Loss: ${simulatedLoss} - VRAM: ${vram} GB` },
            ...l,
          ]);
        }
      }, 400);
    }
    return () => clearInterval(timer);
  }, [isTraining, currentStep, config]);

  const handleStartTraining = () => {
    if (metrics.length === 0) {
      setLogs([
        { timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Training gestartet mit Basismodell: ${selectedModel.name}` },
        { timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Quantisierung: ${config.quantization}, Rank: ${config.rank}, Optimizer: ${config.optimizer}` },
      ]);
    }
    setIsTraining(true);
  };

  const handlePauseTraining = () => {
    setIsTraining(false);
    setLogs((l) => [
      { timestamp: new Date().toLocaleTimeString(), level: 'warn', message: 'Training vom Nutzer pausiert.' },
      ...l,
    ]);
  };

  const handleResetTraining = () => {
    setIsTraining(false);
    setCurrentStep(0);
    setCurrentEpoch(1);
    setMetrics([]);
    setLogs([
      { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Trainingsstatus zurückgesetzt.' },
    ]);
  };

  // Toggle model compatibility on an existing LoRA
  const toggleModelCompatOnLora = (loraId: string, modelId: string) => {
    setLoras((prev) =>
      prev.map((l) => {
        if (l.id !== loraId) return l;
        const currentCompat = l.baseModelCompat || [];
        const exists = currentCompat.includes(modelId);
        const updated = exists
          ? currentCompat.filter((id) => id !== modelId)
          : [...currentCompat, modelId];
        return { ...l, baseModelCompat: updated };
      })
    );
  };

  // Quick assign current selected model to a LoRA
  const addSelectedModelToLora = (loraId: string) => {
    setLoras((prev) =>
      prev.map((l) => {
        if (l.id !== loraId) return l;
        const currentCompat = l.baseModelCompat || [];
        if (currentCompat.includes(selectedModel.id)) return l;
        return { ...l, baseModelCompat: [...currentCompat, selectedModel.id] };
      })
    );
  };

  // Add Custom LoRA
  const handleAddLora = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoraName) return;

    const triggers = newLoraTriggers
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const compatList = newLoraCompatModels.length > 0 ? newLoraCompatModels : [selectedModel.id];

    const newLora: LoraWeight = {
      id: `lora-custom-${Date.now()}`,
      name: newLoraName,
      category: newLoraCategory,
      triggerWords: triggers.length > 0 ? triggers : ['custom_style'],
      weight: 1.0,
      rank: config.rank,
      alpha: config.alpha,
      targetModules: selectedModel.defaultTargetModules,
      active: true,
      description: newLoraDescription || 'Benutzerdefiniertes LoRA Modul.',
      baseModelCompat: compatList,
      author: 'Eigene Erstellung',
    };

    setLoras((prev) => [newLora, ...prev]);
    setShowAddModal(false);
    setNewLoraName('');
    setNewLoraTriggers('');
    setNewLoraDescription('');
    setNewLoraCompatModels([selectedModel.id]);
  };

  const toggleLoraActive = (id: string) => {
    setLoras((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    );
  };

  const updateLoraWeight = (id: string, weight: number) => {
    setLoras((prev) =>
      prev.map((l) => (l.id === id ? { ...l, weight: Number(weight.toFixed(2)) } : l))
    );
  };

  const deleteLora = (id: string) => {
    setLoras((prev) => prev.filter((l) => l.id !== id));
  };

  // Calculate sum of active weights
  const totalWeight = loras
    .filter((l) => l.active)
    .reduce((acc, curr) => acc + curr.weight, 0);

  // Filtered LoRAs based on category and model compatibility
  const filteredLoras = loras.filter((lora) => {
    if (selectedCategory !== 'all' && lora.category !== selectedCategory) return false;
    if (onlySelectedModelCompat) {
      return lora.baseModelCompat && lora.baseModelCompat.includes(selectedModel.id);
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1: Open Source Base Model Selection */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">1. Open-Source AI Basismodell auswählen</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Wähle das Zielmodell für die Feinanpassung (Diffusion, Multimodal oder LLM).
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Architektur:</span>
            <span className="text-indigo-300 font-semibold">{selectedModel.type.toUpperCase()}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Parameter:</span>
            <span className="text-emerald-400 font-semibold">{selectedModel.params}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRESET_BASE_MODELS.map((model) => {
            const isSelected = model.id === selectedModel.id;
            return (
              <div
                key={model.id}
                onClick={() => {
                  setSelectedModel(model);
                  setConfig((prev) => ({
                    ...prev,
                    baseModelId: model.id,
                    rank: model.defaultRank,
                    alpha: model.defaultAlpha,
                    targetModules: model.defaultTargetModules,
                  }));
                }}
                className={`group relative cursor-pointer rounded-xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-2 pr-6">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {model.family}
                    </span>
                    {model.badge && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        {model.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                    {model.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>VRAM LoRA: <strong className="text-slate-200">{model.vramReqLora}GB</strong></span>
                  <span>License: <strong className="text-slate-300">{model.license.split(' ')[0]}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Active LoRA Stack & Weights Manager */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">2. LoRA-Stack & Modell-Integrierung</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verwalte LoRAs, weise Basismodelle zu ({selectedModel.name}) und passe Stärke & Gewichte individuell an.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {totalWeight > 1.8 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>Hohe Gesamtstärke ({totalWeight.toFixed(2)}x)</span>
              </div>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Neues LoRA erstellen</span>
            </button>
          </div>
        </div>

        {/* Filters & Model Compatibility Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 mb-6 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-mono font-medium">Kategorie Filter:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Alle Kategorien</option>
              <option value="style">Stil</option>
              <option value="concept">Konzept</option>
              <option value="character">Charakter</option>
              <option value="code">Code</option>
              <option value="domain">Fachbereich</option>
              <option value="custom">Benutzerdefiniert</option>
            </select>
          </div>

          <button
            onClick={() => setOnlySelectedModelCompat(!onlySelectedModelCompat)}
            className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-all flex items-center gap-2 ${
              onlySelectedModelCompat
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <span>🎯 Nur für <strong className="text-indigo-200">{selectedModel.name}</strong> gefiltert</span>
            {onlySelectedModelCompat && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* LoRA Cards Grid */}
        {filteredLoras.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Keine passenden LoRAs für diesen Filter gefunden.</p>
            {onlySelectedModelCompat && (
              <button
                onClick={() => setOnlySelectedModelCompat(false)}
                className="mt-2 text-xs text-indigo-400 hover:underline font-medium"
              >
                Filter zurücksetzen (Alle LoRAs anzeigen)
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredLoras.map((lora) => {
              const isCompatibleWithSelected = lora.baseModelCompat && lora.baseModelCompat.includes(selectedModel.id);

              return (
                <div
                  key={lora.id}
                  className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
                    lora.active
                      ? isCompatibleWithSelected
                        ? 'bg-slate-950/90 border-slate-700 shadow-md ring-1 ring-indigo-500/20'
                        : 'bg-slate-950/90 border-amber-500/50 shadow-md'
                      : 'bg-slate-950/30 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div>
                    {/* Top Row: Name, Category & Toggle */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleLoraActive(lora.id)}
                          className={`h-5 w-9 rounded-full transition-colors relative p-0.5 ${
                            lora.active ? 'bg-indigo-600' : 'bg-slate-800'
                          }`}
                        >
                          <div
                            className={`h-4 w-4 rounded-full bg-white transition-transform ${
                              lora.active ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <h4 className="font-semibold text-sm text-white truncate max-w-[150px]">
                          {lora.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                          {lora.category}
                        </span>
                        <button
                          onClick={() => deleteLora(lora.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          title="LoRA entfernen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 h-8">
                      {lora.description}
                    </p>

                    {/* Incompatibility Warning Banner */}
                    {lora.active && !isCompatibleWithSelected && (
                      <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between gap-2 text-[11px] text-amber-300">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Nicht für <strong>{selectedModel.name}</strong></span>
                        </span>
                        <button
                          onClick={() => addSelectedModelToLora(lora.id)}
                          className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded font-semibold whitespace-nowrap"
                        >
                          + Modell zuweisen
                        </button>
                      </div>
                    )}

                    {/* Trigger Words */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {lora.triggerWords.map((word, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {word}
                        </span>
                      ))}
                    </div>

                    {/* Model Compatibility Multi-Selector Chips */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Integriert in Modell(e):</span>
                        <span className="text-indigo-400 font-semibold">
                          {(lora.baseModelCompat || []).length} Modelle
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {PRESET_BASE_MODELS.map((model) => {
                          const isCompat = (lora.baseModelCompat || []).includes(model.id);
                          const isCurrentActiveModel = model.id === selectedModel.id;

                          return (
                            <button
                              key={model.id}
                              onClick={() => toggleModelCompatOnLora(lora.id, model.id)}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
                                isCompat
                                  ? isCurrentActiveModel
                                    ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 font-semibold'
                                    : 'bg-slate-800 text-slate-200 border-slate-700'
                                  : 'bg-slate-950 text-slate-600 border-slate-800/80 hover:text-slate-400'
                              }`}
                              title={`${model.name} (${isCompat ? 'Zugewiesen - Klicken zum Entfernen' : 'Klicken zum Zuweisen'})`}
                            >
                              <span>{model.name.split(' ')[0]}</span>
                              {isCompat && <Check className="w-2.5 h-2.5 text-indigo-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Weight Slider & Specs Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Stärke (Multiplier):</span>
                        <span className="font-bold text-indigo-300">{lora.weight.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.05"
                        disabled={!lora.active}
                        value={lora.weight}
                        onChange={(e) => updateLoraWeight(lora.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Rank (r): {lora.rank}</span>
                      <span>Alpha (α): {lora.alpha}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2.5: Modell-Modifikations-Studio & Edge Export (.litert / .task) */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Modell Modifizieren & Google Edge Export (.litert / .task)
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Passe Modellparameter, Ziel-Layer und LoRA-Fusionen an. Lade die modifizierte Version direkt als echtes Binärmodell im Format <strong>.litert</strong> oder <strong>.task</strong> herunter.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() =>
                downloadEdgeModelFile({
                  model: selectedModel,
                  loras: loras,
                  customName: `${selectedModel.name} [LiteRT Edge Modified]`,
                  quantMode: 'int4-litert',
                  format: 'litert',
                })
              }
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-cyan-200" />
              <span>Modell als .litert herunterladen</span>
            </button>

            <button
              onClick={() =>
                downloadEdgeModelFile({
                  model: selectedModel,
                  loras: loras,
                  customName: `${selectedModel.name} [MediaPipe Task Modified]`,
                  quantMode: 'int4-litert',
                  format: 'task',
                })
              }
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Modell als .task herunterladen</span>
            </button>
          </div>
        </div>

        {/* Edge Inferenz Info Box */}
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-indigo-500/20 flex items-start gap-3 text-xs">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg shrink-0 mt-0.5">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-slate-300">
            <p className="font-semibold text-white">
              Tipp zur Inferenz-Ausführung auf Edge-Geräten:
            </p>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Das exportierte <code className="text-cyan-300">.litert</code> / <code className="text-amber-300">.task</code> Paket enthält alle notwendigen Manifest-Einträge, Tokenizer-Zuordnungen & LoRA-Gewichtskonfigurationen für die Integration in Android LiteRT. Um Antworten direkt im Browser zu testen, nutze die Registerkarte <strong>Google Edge Studio</strong> mit dem eingebauten Inferenz-Simulator!
            </p>
          </div>
        </div>

        {/* Live Model Customization Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs">
          <div>
            <label className="block text-slate-300 font-mono font-medium mb-1">Modell-Titel (Modifiziert)</label>
            <input
              type="text"
              defaultValue={`${selectedModel.name} [LiteRT Edge Custom]`}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-mono font-medium mb-1">Edge Quantisierungs-Modus</label>
            <select
              defaultValue="int4-litert"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="int4-litert">INT4 LiteRT (Schnellste NPU-Ausführung)</option>
              <option value="int8-litert">INT8 LiteRT (Hohe Genauigkeit)</option>
              <option value="fp16">FP16 Half-Precision</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-mono font-medium mb-1">Export-Dateiformat (Ausschließlich Unterstützt)</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40 text-[11px]">
                .litert (Google LiteRT)
              </span>
              <span className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40 text-[11px]">
                .task (MediaPipe Task)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Fine-Tuning Hyperparameters & Training Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Hyperparameter Settings Panel */}
        <section className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-md font-bold text-white">3. Hyperparameter Configuration</h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Learning Rate */}
            <div>
              <div className="flex justify-between items-center mb-1 font-mono">
                <label className="text-slate-300 font-medium">Learning Rate (LR)</label>
                <span className="text-indigo-400 font-bold">{config.learningRate}</span>
              </div>
              <input
                type="select"
                className="hidden"
              />
              <select
                value={config.learningRate}
                onChange={(e) => setConfig({ ...config, learningRate: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value={0.00001}>1e-5 (Konservativ / Subtil)</option>
                <option value={0.0001}>1e-4 (Standard für Diffusion & LLM LoRA)</option>
                <option value={0.0005}>5e-4 (Aggressiv)</option>
                <option value={0.001}>1e-3 (Sehr schnell / Überpassungsgefahr)</option>
              </select>
            </div>

            {/* Optimizer */}
            <div>
              <label className="block text-slate-300 font-medium mb-1 font-mono">Optimizer</label>
              <select
                value={config.optimizer}
                onChange={(e) => setConfig({ ...config, optimizer: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="AdamW8bit">AdamW 8-bit (Speichereffizient)</option>
                <option value="Prodigy">Prodigy (Adaptive Learning Rate)</option>
                <option value="Lion">Lion (NVIDIA High-Performance)</option>
                <option value="Adafactor">Adafactor (Geringster VRAM Verwendungsgrad)</option>
              </select>
            </div>

            {/* Quantization Precision */}
            <div>
              <label className="block text-slate-300 font-medium mb-1 font-mono">Precision & Quantization</label>
              <div className="grid grid-cols-3 gap-2">
                {(['bf16', 'fp8', 'nf4'] as const).map((prec) => (
                  <button
                    key={prec}
                    type="button"
                    onClick={() => setConfig({ ...config, quantization: prec })}
                    className={`py-2 px-3 rounded-lg border font-mono text-xs transition-all ${
                      config.quantization === prec
                        ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {prec.toUpperCase()} {prec === 'nf4' ? '(4-bit)' : prec === 'fp8' ? '(8-bit)' : '(16-bit)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Rank & Alpha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1 font-mono">LoRA Rank (r)</label>
                <select
                  value={config.rank}
                  onChange={(e) => {
                    const r = parseInt(e.target.value, 10);
                    setConfig({ ...config, rank: r, alpha: r });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value={8}>r = 8 (Minimal)</option>
                  <option value={16}>r = 16 (Standard für Stil)</option>
                  <option value={32}>r = 32 (Standard für Charakter)</option>
                  <option value={64}>r = 64 (Hohe Kapazität)</option>
                  <option value={128}>r = 128 (Maximale Details)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1 font-mono">LoRA Alpha (α)</label>
                <input
                  type="number"
                  value={config.alpha}
                  onChange={(e) => setConfig({ ...config, alpha: parseInt(e.target.value, 10) || 16 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Epochs & Steps */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1 font-mono">Max Steps</label>
                <input
                  type="number"
                  step="100"
                  value={config.maxTrainSteps}
                  onChange={(e) => setConfig({ ...config, maxTrainSteps: parseInt(e.target.value, 10) || 1000 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1 font-mono">Batch Size</label>
                <select
                  value={config.batchSize}
                  onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1 (VRAM-Schonend)</option>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Live Training Session & Loss Curve */}
        <section className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <h3 className="text-md font-bold text-white">4. Live Trainings-Simulation & Loss-Kurve</h3>
            </div>

            <div className="flex items-center gap-2">
              {!isTraining ? (
                <button
                  onClick={handleStartTraining}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{currentStep > 0 ? 'Fortsetzen' : 'Training starten'}</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseTraining}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-600/20"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pausieren</span>
                </button>
              )}

              <button
                onClick={handleResetTraining}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                title="Zurücksetzen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
              <span>Fortschritt: {currentStep} / {config.maxTrainSteps} Steps</span>
              <span>{((currentStep / config.maxTrainSteps) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / config.maxTrainSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* SVG Loss Curve Chart */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 relative">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                Training Loss
              </span>
              <span>Aktueller Loss: <strong className="text-emerald-400 font-bold">{metrics.length > 0 ? metrics[metrics.length - 1].loss : '0.6500'}</strong></span>
            </div>

            <div className="h-44 w-full relative flex items-end">
              {metrics.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-600 font-mono">
                  Starte das Training, um die Verlustkurve in Echtzeit zu beobachten.
                </div>
              ) : (
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeDasharray="4" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#1e293b" strokeDasharray="4" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#1e293b" strokeDasharray="4" />

                  {/* Polyline */}
                  <polyline
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    points={metrics
                      .map((m, idx) => {
                        const x = (idx / Math.max(1, metrics.length - 1)) * 500;
                        const y = 140 - Math.min(130, m.loss * 180);
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Terminal Logs */}
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[11px] h-32 overflow-y-auto space-y-1">
            <div className="text-slate-500 border-b border-slate-800/60 pb-1 mb-1">
              [SYSTEM CONSOLE - KOHYA / UNSLOTH / DIFFUSERS ENGINE]
            </div>
            {logs.length === 0 ? (
              <p className="text-slate-600 italic">Bereit für Ausführung...</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-slate-600">[{log.timestamp}]</span>
                  <span
                    className={
                      log.level === 'error'
                        ? 'text-rose-400'
                        : log.level === 'warn'
                        ? 'text-amber-400'
                        : log.level === 'success'
                        ? 'text-emerald-400 font-semibold'
                        : 'text-slate-300'
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal: Add New Custom LoRA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Neues LoRA-Gewicht hinzufügen</h3>
            <form onSubmit={handleAddLora} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">LoRA Name</label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Dark Fantasy Armor Style"
                  value={newLoraName}
                  onChange={(e) => setNewLoraName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Kategorie</label>
                <select
                  value={newLoraCategory}
                  onChange={(e) => setNewLoraCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="style">Stil (Kunst / Fotografie)</option>
                  <option value="character">Charakter / Subjekt</option>
                  <option value="concept">Konzept / Ausleuchtung</option>
                  <option value="code">Code / Programmierung</option>
                  <option value="domain">Fachbereich (Jura / Medizin)</option>
                  <option value="custom">Benutzerdefiniert</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Trigger-Words (Kommagetrennt)</label>
                <input
                  type="text"
                  placeholder="z. B. Sk_armor, dark_gothic, ornate_details"
                  value={newLoraTriggers}
                  onChange={(e) => setNewLoraTriggers(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Multi-Model Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-300 font-medium">Kompatible Basismodelle</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (newLoraCompatModels.length === PRESET_BASE_MODELS.length) {
                        setNewLoraCompatModels([selectedModel.id]);
                      } else {
                        setNewLoraCompatModels(PRESET_BASE_MODELS.map((m) => m.id));
                      }
                    }}
                    className="text-[10px] font-mono text-indigo-400 hover:underline"
                  >
                    {newLoraCompatModels.length === PRESET_BASE_MODELS.length ? 'Nur Aktuelles' : 'Alle Auswählen'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {PRESET_BASE_MODELS.map((model) => {
                    const isChecked = newLoraCompatModels.includes(model.id);
                    return (
                      <label
                        key={model.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setNewLoraCompatModels((prev) => prev.filter((id) => id !== model.id));
                            } else {
                              setNewLoraCompatModels((prev) => [...prev, model.id]);
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-700"
                        />
                        <span className="font-mono text-[11px] truncate">{model.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Beschreibung</label>
                <textarea
                  rows={2}
                  placeholder="Kurze Notiz zum Verwendungszweck..."
                  value={newLoraDescription}
                  onChange={(e) => setNewLoraDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                >
                  LoRA erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
