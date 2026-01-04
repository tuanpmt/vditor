# Hướng dẫn Setup Development Environment

Vditor là một Markdown editor được viết bằng TypeScript, hỗ trợ nhiều chế độ editing: WYSIWYG, Instant Rendering (IR), và Split View (SV).

## Yêu cầu hệ thống

- **Node.js**: >= 16.x (khuyến nghị LTS)
- **pnpm**: >= 7.x (package manager chính của dự án)

## Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/Vanessa219/vditor.git
cd vditor
```

### 2. Cài đặt dependencies

```bash
pnpm install
```

## Các lệnh phát triển

| Lệnh | Mô tả |
|------|-------|
| `pnpm start` | Khởi động dev server tại `http://localhost:9000` |
| `pnpm build` | Build production vào thư mục `dist/` |
| `pnpm test` | Chạy test suite với Jest |
| `pnpm test:watch` | Chạy test ở chế độ watch |
| `pnpm lint` | Kiểm tra code với ESLint |

## Cấu trúc dự án

```
vditor/
├── src/                    # Source code chính
│   ├── index.ts           # Entry point chính
│   ├── method.ts          # Utility methods (preview, render)
│   ├── ts/                # TypeScript modules
│   │   ├── ir/            # Instant Rendering mode
│   │   ├── sv/            # Split View mode
│   │   ├── wysiwyg/       # WYSIWYG mode
│   │   ├── markdown/      # Markdown rendering utilities
│   │   ├── toolbar/       # Toolbar components
│   │   ├── ui/            # UI components
│   │   └── util/          # Shared utilities
│   ├── assets/            # Styles (Less)
│   ├── js/                # Vendor libraries (Lute, KaTeX, Mermaid, etc.)
│   ├── css/               # Compiled CSS themes
│   └── images/            # Image assets
├── demo/                   # Demo pages để test editor
│   ├── index.html         # Demo chính
│   ├── index.js           # Demo entry point
│   ├── render.html        # Demo markdown rendering
│   └── comment.html       # Demo comment feature
├── types/                  # TypeScript type definitions
├── __test__/              # Test files (Jest)
├── dist/                   # Build output (gitignored)
├── webpack.config.js      # Production build config
├── webpack.start.js       # Development server config
├── tsconfig.json          # TypeScript config
└── eslint.config.mjs      # ESLint config
```

## Phát triển

### Chạy Development Server

```bash
pnpm start
```

Dev server sẽ khởi động tại `http://localhost:9000`. Các trang demo có sẵn:

- `/` - Demo chính với đầy đủ tính năng
- `/render.html` - Demo markdown rendering
- `/comment.html` - Demo comment feature

### Build Production

```bash
pnpm build
```

Output sẽ được tạo trong thư mục `dist/`:

- `index.js` / `index.min.js` - Main bundle
- `method.js` / `method.min.js` - Utility methods bundle
- `index.css` - Compiled styles
- `js/` - Vendor libraries
- `css/` - Theme CSS files
- `images/` - Image assets

## Tech Stack

- **TypeScript** 4.9.x - Language chính
- **Webpack** 5.x - Module bundler
- **Less** - CSS preprocessor
- **Babel** - JavaScript transpiler
- **Jest** - Testing framework
- **Puppeteer** - E2E testing
- **ESLint** + **Prettier** - Code quality
- **Lute** - Markdown parser (Go compiled to WASM)

## Vendor Libraries

Dự án bao gồm các third-party libraries đã được bundle:

| Library | Mục đích |
|---------|----------|
| Lute | Markdown parsing engine |
| KaTeX / MathJax | Math rendering |
| Mermaid | Diagram rendering |
| highlight.js | Code syntax highlighting |
| ECharts | Chart rendering |
| abcjs | Music notation |
| Graphviz | Graph visualization |
| Markmap | Mind map rendering |

## Proxy Configuration

Dev server có cấu hình proxy cho API testing:

- `/api/*` -> `http://localhost:8080`
- `/ld246/*` -> `https://ld246.com`

## Internationalization

Editor hỗ trợ đa ngôn ngữ. Các file i18n nằm trong `src/js/i18n/`:

- `zh_CN.js` - Tiếng Trung (giản thể)
- `zh_TW.js` - Tiếng Trung (phồn thể)
- `en_US.js` - Tiếng Anh
- `vi_VN.js` - Tiếng Việt
- `ja_JP.js` - Tiếng Nhật
- `ko_KR.js` - Tiếng Hàn
- Và nhiều ngôn ngữ khác...

## Troubleshooting

### Lỗi khi cài đặt dependencies

Nếu gặp lỗi với pnpm, thử xóa cache và cài lại:

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Port 9000 đã được sử dụng

Dev server mặc định chạy trên port 9000. Nếu port này đã được sử dụng, có thể thay đổi trong `webpack.start.js`:

```javascript
devServer: {
    port: 9001,  // Thay đổi port tại đây
    // ...
}
```

### Build thất bại

Đảm bảo TypeScript version tương thích:

```bash
pnpm add typescript@4.9.5 -D
```

## Tài liệu tham khảo

- [Vditor Documentation](https://b3log.org/vditor)
- [GitHub Repository](https://github.com/Vanessa219/vditor)
- [Lute Parser](https://github.com/88250/lute)
