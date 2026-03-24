# 日语学习工具

这是一个可以直接上传到 GitHub Pages 的静态网站版本。

## 文件说明
- `index.html`：主页面
- `styles.css`：样式
- `app.js`：逻辑
- `words-data.js`：外置词库数据（当前约 4379 词）
- `verbs-data.js`：100 个常用动词

## 上传到 GitHub
1. 新建一个公开仓库
2. 把这 5 个文件全部上传到仓库根目录
3. 在 Settings -> Pages 里开启 GitHub Pages
4. Source 选 `Deploy from a branch`
5. Branch 选 `main`，目录选 `/root`

## 说明
- 词库已经外置，不再把所有数据塞进一个 HTML 里
- 词库页默认只显示前 120 个，靠搜索查看更多，避免卡顿
- 自定义词库保存在浏览器本地
