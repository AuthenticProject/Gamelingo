# GameLingo

> **"Play Beyond Language."**  
> Lightweight Real-Time Game Translator for Windows.

GameLingo is a non-invasive, lightweight Windows desktop application designed to translate in-game English dialogue and text into Indonesian in near real time. Built specifically for PC titles such as **Wuthering Waves**, GameLingo operates entirely externally without modifying game files, injecting DLLs, reading protected game memory, or triggering anti-cheat systems.

---

## Key Features

- **Non-Invasive Architecture**: Uses external screen capture, Windows OCR, and transparent desktop overlays. Safe to run alongside modern anti-cheat solutions.
- **Wuthering Waves Profile**: Pre-configured dialogue capture zones, font scaling calibration, and an editable fantasy terminology glossary (names, resonators, echoes).
- **Two Display Modes**:
  - **Mode A: Subtitle Overlay**: Always-on-top, click-through, custom HUD subtitles with configurable typography, shadows, and opacity.
  - **Mode B: Visual Text Replacement**: Non-destructive screen-space mask overlay positioning Indonesian text directly over the original dialogue box.
- **Windows Native OCR**: Leverages built-in `Windows.Media.Ocr` engine to eliminate heavy machine learning runtimes (no PyTorch, PaddleOCR, CUDA, or large models required).
- **Hybrid Translation Pipeline**:
  - **Online**: DeepL, Google Translate, LibreTranslate, OpenAI compatible endpoints.
  - **Offline**: Optional lightweight model engine architecture with local dictionary/grammar engine.
  - **Hybrid**: Automatic fallback and smart local caching to prevent redundant API queries.
- **Resource Efficient**: Engineered for AMD Ryzen APU systems with strict CPU, RAM, and storage limits.

---

## System Requirements

- **OS**: Windows 10 / Windows 11 (64-bit)
- **CPU**: AMD Ryzen 5/7 or Intel Core i5/i7 (Tested on AMD Ryzen 7 5700U)
- **RAM**: 8 GB minimum (16 GB recommended)
- **GPU**: Integrated or Dedicated DirectX 11/12 compatible GPU
- **Runtime**: Windows WebView2 Runtime (Pre-installed on Windows 10/11)

---

## Project Structure

```text
gamelingo/
├── src/                  # Frontend UI (React + TypeScript + Vite + Tailwind CSS)
│   ├── components/       # Reusable UI widgets, HUD overlay components
│   ├── pages/            # Dashboard, Overlay Settings, Glossaries, Diagnostics
│   ├── hooks/            # Hotkey listeners, polling adapters, bridge hooks
│   ├── stores/           # Global state (Zustand / Reactive store)
│   ├── services/         # OCR processing, translation adapters, cache
│   ├── styles/           # Tailwind CSS design system tokens
│   └── types/            # TypeScript interfaces
├── src-tauri/            # Native Core (Rust / Windows native subsystems)
│   ├── src/
│   │   ├── capture/      # Screen & window capture service
│   │   ├── ocr/          # Windows.Media.Ocr native bridge
│   │   ├── translation/  # Online/Offline/Hybrid translation pipeline
│   │   ├── overlay/      # Transparent click-through overlay window management
│   │   ├── settings/     # JSON configuration manager
│   │   └── windows/      # Window enumeration & DPI scaling utilities
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                 # Architectural specifications and manuals
├── ARCHITECTURE.md       # Technical design document
├── DEVELOPMENT_PROGRESS.md # Phase-by-phase implementation tracker
├── STORAGE_REPORT.md     # Disk space allocation and footprint audit
├── TEST_REPORT.md        # Test suite verification logs
├── KNOWN_LIMITATIONS.md  # Known constraints and platform boundaries
└── README.md
```

---

## License

Proprietary / Open Source under MIT License.
GameLingo is not affiliated with or endorsed by Kuro Games or Wuthering Waves.
