# Multi-MC-modpack-Web-tool

## English

### Overview

Multi-MC-modpack-Web-tool is a GitHub Pages compatible React + TypeScript GUI for calculating alloy material combinations. The calculation logic was ported from the original Python Tkinter program into a pure TypeScript engine that runs directly in the browser.

Creator: Peaplant  
GitHub username: Peap1ant  
Repository: https://github.com/Peap1ant/Multi-MC-modpack-Web-tool

This program was developed with the help of AI.

### Live Demo

https://Peap1ant.github.io/Multi-MC-modpack-Web-tool/

### Features

- Static GitHub Pages deployment with no required Node.js server
- Browser-side alloy calculation under the 1 second target for normal inputs
- Vessel and Crucible calculation modes
- Ratio validation, capacity validation, and clear error messages
- Light, Dark, and Follow system display settings
- English and Korean UI language settings
- Settings are saved in `localStorage`
- Autosave restores the latest form after closing and reopening the site
- Save & Load presets for material names, colors, ratios, alloy name, and mB per ingot
- Color tooltip with supported Python-compatible colors
- Result pie chart with labels, legend, and tooltip
- Info modal with creator, version, repository link, and AI development message

### How To Use

1. Add one or more material rows.
2. Enter material name, owned item count, mB per item, ratio range, and color.
3. Enter the alloy target name, target craft count, and mB per ingot.
4. Choose Vessel or Crucible. Crucible requires a max capacity value.
5. Press Calculate.
6. Review the craftability result, material ratios, item counts, constraints, and pie chart.

For a single unique material, ratio values are ignored, matching the Python program behavior.

### Save & Load

Use the Save & Load button next to Calculate.

- Save (+): enter a preset name and save the current material names, colors, min/max ratios, alloy name, and mB per ingot.
- Load: applies a saved preset to the current form. It does not calculate automatically.
- Delete: removes a preset after confirmation.

Preset data is stored separately from autosave data in `localStorage`.

### Settings

Use the Settings button in the top-right header.

- Display: Light, Dark, or Follow system
- Language: English or Korean

Both settings persist through `localStorage`.

### Info

Use the Info button in the top-right header to see:

- Creator: Peaplant
- Web program version
- GitHub repository: https://github.com/Peap1ant/Multi-MC-modpack-Web-tool
- AI development message

The repository link opens in a new tab.

### Local Development

Install dependencies:

```bash
npm install
```

Run the GitHub Pages compatible frontend:

```bash
npm run dev:static
```

Run the optional full local stack including the backend wrapper:

```bash
npm run dev
```

### Build

Build the static GitHub Pages output:

```bash
npm run build
```

Static files are generated in:

```text
frontend/dist/
```

Run tests and type checks:

```bash
npm run test
npm run typecheck
```

### GitHub Pages Deployment

The project includes `gh-pages` deployment scripts:

```bash
npm run deploy
```

Then enable GitHub Pages for the `gh-pages` branch in the repository settings.

The root `package.json` contains:

```json
{
  "homepage": "https://Peap1ant.github.io/Multi-MC-modpack-Web-tool/",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d frontend/dist"
  }
}
```

## Korean

### 개요

Multi-MC-modpack-Web-tool은 합금 재료 조합을 계산하는 React + TypeScript 기반 웹 GUI입니다. 기존 Python Tkinter 프로그램의 계산 로직을 순수 TypeScript 엔진으로 변환했으며, GitHub Pages에서 Node.js 서버 없이 브라우저에서 직접 실행됩니다.

제작자: Peaplant  
GitHub 사용자 이름: Peap1ant  
저장소: https://github.com/Peap1ant/Multi-MC-modpack-Web-tool

이 프로그램은 AI의 도움을 받아 개발되었습니다.

### 실행 링크

https://Peap1ant.github.io/Multi-MC-modpack-Web-tool/

### 주요 기능

- Node.js 서버 없이 GitHub Pages 정적 배포 가능
- 일반 입력 기준 1초 미만을 목표로 하는 브라우저 내부 합금 계산
- Vessel 및 Crucible 계산 모드
- 비율, 용량, 입력값 검증과 명확한 오류 메시지
- 라이트, 다크, 시스템 설정 따르기 테마
- 영어/한국어 UI 언어 설정
- 설정값 localStorage 저장
- 사이트를 닫았다 열어도 이전 입력을 복원하는 자동 임시 저장
- 재료 이름, 색상, 비율, 합금 이름, 주괴당 mB를 저장/불러오기하는 preset 기능
- Python 프로그램과 같은 사용 가능 색상 안내 tooltip
- 계산 결과 기반 원 그래프, label, legend, tooltip
- 제작자, 버전, GitHub 링크, AI 개발 메시지를 보여주는 정보 모달

### 사용 방법

1. 재료 행을 하나 이상 추가합니다.
2. 재료 이름, 보유 개수, 아이템당 mB, 최소/최대 비율, 색상을 입력합니다.
3. 합금 목표 이름, 목표 제작 개수, 주괴당 mB를 입력합니다.
4. Vessel 또는 Crucible을 선택합니다. Crucible은 최대 용량 값이 필요합니다.
5. 계산 버튼을 누릅니다.
6. 제작 가능 여부, 재료 비율, 사용할 아이템 수, 제약 조건, 원 그래프를 확인합니다.

고유 재료가 하나뿐이면 Python 프로그램과 동일하게 비율 조건을 무시합니다.

### Save & Load

계산 버튼 오른쪽의 저장 & 불러오기 버튼을 사용합니다.

- 저장 (+): 저장 이름을 입력하고 현재 재료 이름, 색상, 최소/최대 비율, 합금 이름, 주괴당 mB를 저장합니다.
- 불러오기: 저장된 preset을 현재 입력 필드에 반영합니다. 자동 계산은 하지 않습니다.
- 삭제: 확인 후 preset을 삭제합니다.

preset 데이터는 autosave 데이터와 별도 localStorage key에 저장됩니다.

### 설정

화면 오른쪽 위 Settings 버튼에서 설정을 변경할 수 있습니다.

- 화면: 라이트, 다크, 시스템 설정 따르기
- 언어: 영어 또는 한국어

두 설정은 모두 localStorage에 저장되어 다음 방문 때 유지됩니다.

### 정보

화면 오른쪽 위 Info 버튼에서 다음 정보를 확인할 수 있습니다.

- Creator: Peaplant
- 웹 프로그램 버전
- GitHub 저장소: https://github.com/Peap1ant/Multi-MC-modpack-Web-tool
- AI 개발 도움 메시지

GitHub 저장소 링크는 새 탭에서 열립니다.

### 로컬 실행

의존성 설치:

```bash
npm install
```

GitHub Pages와 같은 정적 프론트엔드 실행:

```bash
npm run dev:static
```

선택 사항인 백엔드 wrapper까지 함께 실행:

```bash
npm run dev
```

### 빌드

GitHub Pages용 정적 파일 빌드:

```bash
npm run build
```

정적 파일은 다음 위치에 생성됩니다.

```text
frontend/dist/
```

테스트 및 타입 검사:

```bash
npm run test
npm run typecheck
```

### GitHub Pages 배포

`gh-pages` 배포 스크립트가 포함되어 있습니다.

```bash
npm run deploy
```

그 뒤 GitHub 저장소 설정에서 `gh-pages` 브랜치를 Pages 배포 대상으로 지정합니다.

루트 `package.json`에는 다음 설정이 포함되어 있습니다.

```json
{
  "homepage": "https://Peap1ant.github.io/Multi-MC-modpack-Web-tool/",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d frontend/dist"
  }
}
```
