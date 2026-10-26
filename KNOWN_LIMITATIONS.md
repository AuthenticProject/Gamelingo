# GameLingo Known Limitations & Technical Boundaries

## 1. Window Mode & Display Limitations
- **Exclusive Fullscreen**: Windows desktop overlay rendering (transparent layered windows) cannot render above DirectX applications running in Exclusive Fullscreen mode. GameLingo requires Wuthering Waves (and other games) to run in **Borderless Windowed** or **Windowed** mode.
- **Hardware-Protected Content (DRM)**: Windows Graphics Capture cannot capture windows protected by hardware DRM flags (`SetWindowDisplayAffinity`). Wuthering Waves standard rendering does not enable this flag.
- **Dynamic Text Backgrounds**: In Text Replacement Mode (Mode B), text displayed over 3D animated particle effects or high-contrast cinematics will use a semi-transparent readability mask. True background inpainting is intentionally avoided to preserve APU performance.

## 2. OCR & Language Scope
- **Character Set**: Native `Windows.Media.Ocr` utilizes the installed Windows English language OCR pack. Stylized Gothic fonts, non-Latin symbols, or heavily compressed low-resolution video may exhibit reduced detection accuracy.
- **Dialogue Animation Stutter**: Typewriter-style letter-by-letter dialogue animations require the temporal stability filter (2-frame debounce) before triggering translation. Subtitles will appear approximately 250–500 ms after the sentence is fully rendered.

## 3. Platform & Storage Constraints
- **Drive C Sensitivity**: With approximately 4 GB of free storage on Drive C, heavy development toolchains (Visual Studio Build Tools, full Windows SDK, large ML libraries) are strictly isolated to Drive D or replaced with lightweight alternatives to avoid system disk exhaustion.
- **Third-Party Anti-Cheat Safety**: GameLingo is 100% external. It does not hook into game processes, inject DLLs, read game memory, or simulate keyboard/mouse inputs. However, players should always review specific game terms of service regarding third-party overlay utilities.
