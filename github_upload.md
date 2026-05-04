### GitHub Pages Deployment

The project includes `gh-pages` deployment scripts:

```bash
npm install
npm run build
npm run deploy
```

Then enable GitHub Pages for the `gh-pages` branch in the repository settings.

GitHub Pages settings:

- Source: Deploy from a branch
- Branch: `gh-pages`
- Folder: `/ (root)`

This is a Vite project. The deployed files come from `frontend/dist`, and `vite.config.ts` must keep this exact repository base path:

```ts
base: "/Multi-MC-modpack-Web-tool/"
```

The root `package.json` contains:

```json
{
  "homepage": "https://peap1ant.github.io/Multi-MC-modpack-Web-tool/",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d frontend/dist"
  }
}
```

### GitHub Pages 배포

`gh-pages` 배포 스크립트가 포함되어 있습니다.

```bash
npm install
npm run build
npm run deploy
```

그 뒤 GitHub 저장소 설정에서 `gh-pages` 브랜치를 Pages 배포 대상으로 지정합니다.

GitHub Pages 설정:

- Source: Deploy from a branch
- Branch: `gh-pages`
- Folder: `/ (root)`

이 프로젝트는 Vite 프로젝트입니다. 배포 파일은 `frontend/dist`에서 생성되며, `vite.config.ts`에는 실제 저장소 이름과 같은 다음 base path가 유지되어야 합니다.

```ts
base: "/Multi-MC-modpack-Web-tool/"
```

루트 `package.json`에는 다음 설정이 포함되어 있습니다.

```json
{
  "homepage": "https://peap1ant.github.io/Multi-MC-modpack-Web-tool/",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d frontend/dist"
  }
}
```
