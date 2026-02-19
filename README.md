# Chrome PDF to NotebookLM

Turn a PDF, arXiv page, or webpage into a NotebookLM notebook and generate artifacts in one workflow.

## Screenshots
![Pipeline progress](./screenshot1.png)
![Artifact settings](./screenshot2.png)

## 한국어 안내

### 소개
**Chrome PDF to NotebookLM**은 현재 탭의 PDF/웹페이지/로컬 파일을 NotebookLM 소스로 추가하고, 오디오 개요를 포함한 아티팩트 생성을 자동으로 진행하는 크롬 확장 프로그램입니다.

### 주요 기능
- PDF 자동 감지: 직접 PDF URL, arXiv 페이지, 페이지 내 PDF 링크 감지
- 원클릭 실행: 노트북 생성부터 소스 추가, 아티팩트 생성까지 한 번에 실행
- 백그라운드 진행: 팝업을 닫아도 진행 상태 유지
- 로컬 PDF 업로드 지원: 필요 시 파일 선택으로 업로드
- 아티팩트 설정 제공: Audio/Infographic 등 생성 옵션 조절

### 설치 (개발자 모드)
1. 이 저장소를 다운로드 또는 클론합니다.
2. Chrome에서 `chrome://extensions`를 엽니다.
3. 우측 상단에서 **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드**를 클릭합니다.
5. 이 저장소의 루트 폴더(현재 `manifest.json`이 있는 폴더)를 선택합니다.
6. 확장 목록에서 **Chrome PDF to NotebookLM**이 보이면 설치 완료입니다.

### 사용 방법
1. NotebookLM(`https://notebooklm.google.com`)에 Google 계정으로 로그인합니다.
2. PDF/arXiv/웹페이지를 연 뒤 확장 아이콘을 클릭합니다.
3. 상황에 맞게 아래 버튼 중 하나를 선택합니다.
- `Generate Audio Overview` (PDF 감지됨)
- `Use Current Webpage URL` (PDF 미감지)
- `Upload Local PDF` 또는 `Use Current PDF and Generate` (로컬 파일)
4. 진행 화면에서 상태를 확인하고 완료 후 `Open Notebook in NotebookLM`으로 이동합니다.

### 권한 관련 안내
- 로컬 `file://` PDF를 현재 탭에서 직접 읽으려면 확장 상세 설정에서 **파일 URL에 대한 액세스 허용**을 켜야 할 수 있습니다.
- 권한과 동작은 NotebookLM 및 Chrome 정책 변경에 따라 영향을 받을 수 있습니다.

### 문제 해결
- 버튼 동작이 없으면: NotebookLM 로그인 상태를 먼저 확인하세요.
- 로컬 PDF 읽기 실패 시: `Allow access to file URLs` 활성화 후 다시 시도하세요.
- URL 소스 추가 실패 시: `Upload Local PDF` 방식으로 업로드를 시도하세요.

---

## English Guide

### Overview
**Chrome PDF to NotebookLM** is a Chrome extension that takes a PDF/web source from your current tab, adds it to NotebookLM, and runs artifact generation (including audio overview) in a streamlined flow.

### Key Features
- Smart PDF detection: direct PDF URLs, arXiv pages, and PDF links on pages
- One-click pipeline: notebook creation, source add, and artifact generation
- Background progress: keeps running even when the popup is closed
- Local PDF upload support with fallback file picker
- Artifact settings for Audio/Infographic and more

### Install (Developer Mode)
1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository root folder (the folder that contains `manifest.json`).
6. Confirm **Chrome PDF to NotebookLM** appears in your extension list.

### How to Use
1. Sign in to NotebookLM at `https://notebooklm.google.com`.
2. Open a PDF/arXiv/webpage and click the extension icon.
3. Choose the appropriate action:
- `Generate Audio Overview` (when PDF is detected)
- `Use Current Webpage URL` (when no PDF is detected)
- `Upload Local PDF` or `Use Current PDF and Generate` (for local files)
4. Track progress in the popup and open results via `Open Notebook in NotebookLM`.

### Permission Notes
- For direct reading of local `file://` PDFs from the current tab, you may need to enable **Allow access to file URLs** in extension settings.
- Behavior can be affected by NotebookLM and Chrome policy changes.

### Troubleshooting
- No progress after start: verify you are logged into NotebookLM.
- Local PDF read fails: enable `Allow access to file URLs` and retry.
- URL import fails: use `Upload Local PDF` as a fallback.

## Credits
- NotebookLM protocol implementation was heavily informed by [`teng-lin/notebooklm-py`](https://github.com/teng-lin/notebooklm-py).

## License
MIT. See [LICENSE](./LICENSE).
