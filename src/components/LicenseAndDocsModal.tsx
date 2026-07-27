import React, { useState } from 'react';
import { X, BookOpen, ShieldCheck, FileText, Cpu, Download, Check, ExternalLink, Code } from 'lucide-react';

interface LicenseAndDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseAndDocsModal: React.FC<LicenseAndDocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'about' | 'readme' | 'license'>('about');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLicense = () => {
    const licenseText = `Apache License Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright 2026 OpenForge AI Studio Contributors.
Licensed under the Apache License, Version 2.0.`;
    navigator.clipboard.writeText(licenseText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                OpenForge AI Studio — Dokumentation & Lizenz
              </h2>
              <p className="text-xs text-slate-400">
                Open-Source Architektur, Modell-Studio & Apache 2.0 Lizenzbestimmungen
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Sub-navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'about'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Projekt-Beschreibung</span>
          </button>

          <button
            onClick={() => setActiveTab('readme')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'readme'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>README.md</span>
          </button>

          <button
            onClick={() => setActiveTab('license')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'license'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Apache 2.0 Lizenz</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-sm leading-relaxed">
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div className="p-5 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 rounded-xl space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  Was ist OpenForge AI Studio?
                </h3>
                <p className="text-slate-300 text-xs md:text-sm">
                  <strong>OpenForge AI Studio</strong> ist eine führende Open-Source Plattform zur visuellen Feineinstellung, LoRA-Gewichtung, Datensatz-Aufbereitung und Prompt-Optimierung für modernste Open-Source KI-Modelle.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-semibold text-white text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    Open Source Basis-Modelle
                  </h4>
                  <p className="text-xs text-slate-400">
                    Unterstützt FLUX.1 [dev/schnell], LLaMA 3.1 8B, Qwen 2.5 Coder/VL und Stable Diffusion XL. Inklusive präziser VRAM-Kalkulation und Quantisierung (NF4, FP8, BF16).
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-semibold text-white text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Google Edge (.litert & .task) Export
                  </h4>
                  <p className="text-xs text-slate-400">
                    Direkter Export in echte Google LiteRT (<code className="text-cyan-300">.litert</code>) und MediaPipe Task Bundles (<code className="text-amber-300">.task</code>), kompatibel mit Android Tensor NPUs und LiteRT LM Executoren.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-semibold text-white text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    LoRA Stacking & Fusion
                  </h4>
                  <p className="text-xs text-slate-400">
                    Kombiniere und gewichte mehrere LoRA-Adapter gleichzeitig. Passe Skalierungsfaktoren (0.0 bis 2.0) und Ziel-Layer für Bild- und Sprachmodelle an.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-semibold text-white text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pink-400" />
                    Visual & Reverse Prompt Studio
                  </h4>
                  <p className="text-xs text-slate-400">
                    Multi-modale Analyse von Bildern und Videos mit automatischer Extraktion von Kamera-Objektiven, Lichtsetups und Generierung von High-End Prompts für Flux, Veo, Midjourney & Runway.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'readme' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-md border border-slate-800">
                  README.md
                </span>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
{`# OpenForge AI Studio ⚒️🤖

Professional Open-Source Model Studio for FLUX, LLaMA, Qwen & SDXL.
LoRA Stacking, Fine-Tuning Configuration, Automated Dataset Captioning, AI Visual & Reverse Prompt Engineering, and Native Google LiteRT (.litert) / MediaPipe Task Bundle (.task) Edge Export.

---

## 🌟 Key Features

1. Open-Source Base Model Studio (FLUX.1, LLaMA 3.1, Qwen 2.5, SDXL)
2. Google Edge & LiteRT Model Exporter (.litert / .task)
3. Dataset & AI Auto-Captioning with Gemini 3.6
4. Visual & Reverse Prompt Engineering Studio

---

## 📜 Open Source License

This project is licensed under the Apache License 2.0.
Free to modify, distribute, and integrate into commercial or private workflows.`}
              </pre>
            </div>
          )}

          {activeTab === 'license' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white text-sm">Apache License 2.0</span>
                </div>
                <button
                  onClick={handleCopyLicense}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Kopiert!' : 'Lizenz kopieren'}</span>
                </button>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 space-y-3 leading-relaxed">
                <p className="text-emerald-300 font-semibold">
                  Copyright 2026 OpenForge AI Studio Contributors.
                </p>
                <p>
                  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at:
                </p>
                <a
                  href="http://www.apache.org/licenses/LICENSE-2.0"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1 text-xs"
                >
                  http://www.apache.org/licenses/LICENSE-2.0
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-slate-400 text-[11px] pt-2 border-t border-slate-900">
                  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>OpenForge AI Studio — Open Source & Community Driven</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/30"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
