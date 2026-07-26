import React from 'react';
import { Cpu, Layers, Sparkles, HardDrive, Download, FileText, Wand2, Smartphone } from 'lucide-react';
import { BaseModel, LoraWeight } from '../types';

interface HeaderProps {
  activeTab: 'model' | 'dataset' | 'prompt' | 'mobile_edge' | 'export';
  setActiveTab: (tab: 'model' | 'dataset' | 'prompt' | 'mobile_edge' | 'export') => void;
  selectedModel: BaseModel;
  activeLoras: LoraWeight[];
  vramUsed: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedModel,
  activeLoras,
  vramUsed,
}) => {
  const activeCount = activeLoras.filter((l) => l.active).length;

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Active Model Info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">OpenForge AI</h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  LoRA & Model Studio
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Modell: <strong className="text-indigo-300">{selectedModel.name}</strong></span>
                <span>•</span>
                <span>LoRAs aktiv: <strong className="text-emerald-400">{activeCount}</strong></span>
              </p>
            </div>
          </div>

          {/* VRAM Gauge pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium">VRAM geschätzt</span>
              <span className={`font-mono font-semibold ${vramUsed > selectedModel.vramReqLora ? 'text-amber-400' : 'text-emerald-400'}`}>
                {vramUsed.toFixed(1)} GB / {selectedModel.vramReqMin} GB
              </span>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('model')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'model'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Modell & LoRA Tuning</span>
            {activeCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-400/20 text-indigo-200 text-[10px]">
                {activeCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dataset')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'dataset'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Datensatz & Captions</span>
          </button>

          <button
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'prompt'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Wand2 className="w-4 h-4 text-pink-400" />
            <span>Visual & Prompt Studio</span>
            <Sparkles className="w-3 h-3 text-amber-300" />
          </button>

          <button
            onClick={() => setActiveTab('mobile_edge')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'mobile_edge'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Mobile & Edge Galerie</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-cyan-500/20 text-cyan-300">
              Google Edge
            </span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'export'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export & Scripts</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
