export type ModelType = 'image-diffusion' | 'video-diffusion' | 'llm-text';

export interface BaseModel {
  id: string;
  name: string;
  family: string;
  type: ModelType;
  params: string; // e.g. "12B", "70B", "3.5B"
  vramReqMin: number; // in GB
  vramReqLora: number; // in GB with 4-bit/8-bit LoRA
  defaultRank: number;
  defaultAlpha: number;
  supportedPrecisions: ('fp16' | 'bf16' | 'fp8' | 'nf4' | 'int4-litert' | 'int8-litert')[];
  defaultTargetModules: string[];
  description: string;
  license: string;
  badge?: string;
}

export interface LoraWeight {
  id: string;
  name: string;
  category: 'style' | 'character' | 'concept' | 'code' | 'domain' | 'custom';
  triggerWords: string[];
  weight: number; // default 0.8 - 1.0
  rank: number; // e.g. 16, 32
  alpha: number; // e.g. 16, 32
  targetModules: string[];
  active: boolean;
  description: string;
  baseModelCompat: string[];
  previewImageUrl?: string;
  author?: string;
}

export interface TrainingConfig {
  baseModelId: string;
  datasetName: string;
  triggerWord: string;
  learningRate: number; // e.g. 1e-4
  epochs: number;
  batchSize: number;
  gradientAccumulationSteps: number;
  rank: number;
  alpha: number;
  dropout: number;
  optimizer: 'AdamW8bit' | 'Prodigy' | 'Lion' | 'Adafactor';
  quantization: 'bf16' | 'fp8' | 'nf4';
  targetModules: string[];
  maxTrainSteps: number;
  saveEverySteps: number;
  mixedPrecision: 'bf16' | 'fp16' | 'no';
}

export interface TrainingMetricPoint {
  step: number;
  epoch: number;
  loss: number;
  vramUsageGb: number;
  learningRate: number;
}

export interface TrainingLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'success' | 'error';
  message: string;
}

export interface DatasetItem {
  id: string;
  type: 'image' | 'text';
  previewUrl?: string;
  content?: string;
  filename: string;
  caption: string;
  tags: string[];
  qualityScore?: number;
  qualityNotes?: string;
  status: 'raw' | 'captioned' | 'approved';
}

export interface VisualAnalysisResult {
  analysis: {
    style: string;
    lighting: string;
    camera: string;
    motion?: string;
  };
  imagePrompt: {
    subject: string;
    environment: string;
    cameraTechnical: string;
    fullPrompt: string;
  };
  videoPrompt: {
    baseScene: string;
    cameraMotion: string;
    actionDynamics: string;
    styleAtmosphere: string;
    fullVideoPrompt: string;
  };
  variations: {
    title: string;
    description: string;
    prompt: string;
  }[];
}

export interface GeneratedPromptsResult {
  conceptTitle: string;
  imagePrompt: {
    subject: string;
    environment: string;
    cameraTechnical: string;
    fullPrompt: string;
  };
  videoPrompt: {
    baseScene: string;
    cameraMotion: string;
    actionDynamics: string;
    styleAtmosphere: string;
    fullVideoPrompt: string;
  };
  variations: {
    title: string;
    description: string;
    prompt: string;
  }[];
}
