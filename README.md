# OpenForge AI Studio ⚒️🤖

> **Professional Open-Source Model Studio for FLUX, LLaMA, Qwen & SDXL**
> LoRA Stacking, Fine-Tuning Configuration, Automated Dataset Captioning, AI Visual & Reverse Prompt Engineering, and Native **Google LiteRT (.litert)** / **MediaPipe Task Bundle (.task)** Edge Export.

---

## 🌟 Key Features

### 1. 🎛️ Open-Source Base Model Studio
- **Supported Base Architectures:**
  - `FLUX.1 [dev]` & `FLUX.1 [schnell]` (Black Forest Labs Next-Gen Diffusion)
  - `LLaMA 3.1 8B Instruct` & `LLaMA 3.2 3B` (Meta AI Open LLMs)
  - `Qwen 2.5 7B Coder` & `Qwen 2.5 VL` (Alibaba Cloud Multimodal LLM)
  - `Stable Diffusion XL 1.0` (Stability AI Base Diffusion)
- **Dynamic VRAM Estimator:** Real-time calculation of VRAM requirements based on quantization precision (NF4, FP8, BF16, FP16) and active LoRA stack rank sums.
- **LoRA Weight Stacking:** Blend and fuse multiple LoRAs with adjustable weight multipliers (0.0 – 2.0) and layer targeting.

### 2. ⚡ Google Edge & LiteRT Model Exporter (.litert / .task)
- Direct binary bundle builder for **Google LiteRT (`.litert`)** and **MediaPipe Tasks (`.task`)**.
- Fully compatible with the Google LiteRT LM runtime executor (`kPrefilDecodeModelNameInTaskBundle`).
- Includes auto-generated PKZIP memory-aligned archives containing `tf_lite_prefill_decode.bin`, `tokenizer.model`, `metadata.json`, and `task_manifest.json`.

### 3. 📸 Dataset & AI Auto-Captioning
- Upload visual training samples (JPG/PNG/WEBP).
- AI-powered automated captioning using **Gemini 3.6** with custom trigger-word injection, tag extraction, quality scoring, and training recommendations.
- One-click export to Hugging Face JSONL, Kohya_ss TXT metadata format, and ZIP archives.

### 4. 🎨 Visual & Reverse Prompt Engineering Studio
- Multimodal analysis of images and video keyframes.
- Extract photographic parameters: camera lenses (e.g. 85mm f/1.4), lighting setups (volumetric, golden hour), motion dynamics, and style aesthetics.
- High-precision English prompt generation for **Flux, Midjourney, Ideogram, Veo, Runway Gen-3, Sora, and Luma**.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ or Node 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/openforge-ai/openforge-ai-studio.git
cd openforge-ai-studio

# Install dependencies
npm install

# Set up Environment Variables
cp .env.example .env
```

Add your Gemini API key in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Development Server

```bash
# Start dev server on port 3000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build frontend and server
npm run build

# Start production server
npm start
```

---

## 📜 Open Source License

This project is licensed under the **Apache License 2.0**.
See the [LICENSE](./LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit pull requests or open issues for feature suggestions and bug fixes.
