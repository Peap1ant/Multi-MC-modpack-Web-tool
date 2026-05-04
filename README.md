# Multi-MC-modpack-Web-tool

Version: v0.1.1-beta

Live Demo: https://peap1ant.github.io/Multi-MC-modpack-Web-tool/  
Repository: https://github.com/Peap1ant/Multi-MC-modpack-Web-tool

## English

### Overview

Multi-MC-modpack-Web-tool is a GitHub Pages compatible React + TypeScript web tool collection for Minecraft modpack utilities. The first screen is now a Home screen with project information, version information, language controls, and the current feature list.

Creator: Peaplant  
GitHub username: Peap1ant

This program was developed with the help of AI.

### Navigation

The header menu uses a category-based structure:

- Home
- TFC
- TFC Alloy Calculator

Home is the default entry screen and always appears at the top of the menu. The previous test tab has been removed. TFC Alloy Calculator is listed under the TFC category.

### Features

- Home screen with project name, creator, version, language selector, and feature descriptions
- Category-based menu with expandable sections
- TFC Alloy Calculator for TerraFirmaCraft alloys and metal casting
- Vessel and Crucible calculation modes
- Ratio validation, capacity validation, and clear error messages
- Light, Dark, and Follow system display settings
- English and Korean UI language settings in both Home and Settings
- Settings are saved in `localStorage`
- Autosave restores the latest form after closing and reopening the site
- Save & Load presets for material names, colors, ratios, alloy name, and mB per ingot
- Result pie chart with labels, legend, and tooltip
- Info modal with creator, version, repository link, and AI development message
- Static GitHub Pages deployment with no required Node.js server

### How To Use TFC Alloy Calculator

1. Open the Menu.
2. Expand TFC.
3. Select TFC Alloy Calculator.
4. Add one or more material rows.
5. Enter material name, owned item count, mB per item, ratio range, and color.
6. Enter the alloy target name, target craft count, and mB per ingot.
7. Choose Vessel or Crucible. Crucible requires a max capacity value.
8. Press Calculate.
9. Review the craftability result, material ratios, item counts, constraints, and pie chart.

For a single unique material, ratio values are ignored, matching the original Python program behavior.

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

The Home screen also provides language controls. Home and Settings use the same language state and persisted setting.

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

## Korean

### 개요

Multi-MC-modpack-Web-tool은 Minecraft 모드팩 유틸리티를 위한 React + TypeScript 기반 웹 도구 모음입니다. 첫 진입 화면은 Home이며, 프로젝트 정보, 버전 정보, 언어 변경, 현재 기능 설명을 표시합니다.

제작자: Peaplant  
GitHub 사용자 이름: Peap1ant

이 프로그램은 AI의 도움을 받아 개발되었습니다.

### 메뉴 구조

상단 메뉴는 분류 기반 구조를 사용합니다.

- Home
- TFC
- TFC Alloy Calculator

Home은 기본 진입 화면이며 메뉴 최상단에 표시됩니다. 기존 테스트 탭은 삭제되었습니다. TFC Alloy Calculator는 TFC 분류 아래에 표시됩니다.

### 주요 기능

- 프로젝트 이름, 제작자, 버전, 언어 변경, 기능 설명을 표시하는 Home 화면
- 펼침/접힘이 가능한 분류 기반 메뉴
- TerraFirmaCraft 합금 및 금속 주조를 위한 TFC Alloy Calculator
- Vessel 및 Crucible 계산 모드
- 비율, 용량, 입력값 검증과 명확한 오류 메시지
- 라이트, 다크, 시스템 설정 따르기 테마
- Home과 Settings에서 모두 가능한 영어/한국어 UI 언어 설정
- 설정값 `localStorage` 저장
- 사이트를 닫았다 열어도 이전 입력을 복원하는 자동 임시 저장
- 재료 이름, 색상, 비율, 합금 이름, 주괴당 mB를 저장/불러오기하는 preset 기능
- 계산 결과 기반 원 그래프, label, legend, tooltip
- 제작자, 버전, GitHub 링크, AI 개발 메시지를 보여주는 정보 모달
- Node.js 서버 없이 GitHub Pages 정적 배포 가능

### TFC Alloy Calculator 사용 방법

1. 메뉴를 엽니다.
2. TFC 분류를 펼칩니다.
3. TFC Alloy Calculator를 선택합니다.
4. 재료 행을 하나 이상 추가합니다.
5. 재료 이름, 보유 개수, 아이템당 mB, 최소/최대 비율, 색상을 입력합니다.
6. 합금 목표 이름, 목표 제작 개수, 주괴당 mB를 입력합니다.
7. Vessel 또는 Crucible을 선택합니다. Crucible은 최대 용량 값이 필요합니다.
8. 계산 버튼을 누릅니다.
9. 제작 가능 여부, 재료 비율, 사용할 아이템 수, 제약 조건, 원 그래프를 확인합니다.

고유 재료가 하나뿐이면 기존 Python 프로그램과 동일하게 비율 조건을 무시합니다.

### 저장 & 불러오기

계산 버튼 오른쪽의 저장 & 불러오기 버튼을 사용합니다.

- 저장 (+): 저장 이름을 입력하고 현재 재료 이름, 색상, 최소/최대 비율, 합금 이름, 주괴당 mB를 저장합니다.
- 불러오기: 저장된 preset을 현재 입력 필드에 반영합니다. 자동 계산은 하지 않습니다.
- 삭제: 확인 후 preset을 삭제합니다.

preset 데이터는 autosave 데이터와 별도 `localStorage` key에 저장됩니다.

### 설정

화면 오른쪽 위 Settings 버튼에서 설정을 변경할 수 있습니다.

- 화면: 라이트, 다크, 시스템 설정 따르기
- 언어: 영어 또는 한국어

Home 화면에서도 언어를 변경할 수 있습니다. Home과 Settings는 같은 언어 상태와 저장된 설정을 사용합니다.

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
