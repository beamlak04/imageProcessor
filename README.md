# Pro Image Processor

A full-stack image processing app with a browser UI and an Express backend.

It supports:
- Image upload (drag and drop or file picker)
- Optional width-based resize (no upscaling)
- Format conversion (`webp`, `jpeg`, `png`)
- Adjustable quality (`1-100`)
- Optional AI background removal
- Preview, size stats, and download of the processed result

## Project Structure

```text
imageProcessor/
├── backend/
│   ├── package.json
│   └── server.js
└── frontend/
		├── index.html
		├── script.js
		└── style.css
```

## Tech Stack

- Backend: Node.js, Express, Multer, Sharp, CORS, `@imgly/background-removal-node`
- Frontend: Vanilla HTML/CSS/JavaScript

## Prerequisites

- Node.js 18+ (recommended)
- npm

## Setup

From the project root:

```bash
cd backend
npm install
```

## Run

1. Start backend server:

```bash
cd backend
node server.js
```

The API will run on `http://localhost:3000` by default.

2. Start frontend:

- Open `frontend/index.html` directly in a browser, or
- Serve `frontend/` with any static server.

The frontend currently sends requests to:

`http://localhost:3000/api/process-image`

If you change backend host/port, update the `fetch(...)` URL in `frontend/script.js`.

## API

### `POST /api/process-image`

`multipart/form-data` fields:

- `image` (required): uploaded image file
- `width` (optional): integer target width in pixels
- `format` (optional): `jpeg`, `png`, or `webp` (default: `jpeg`)
- `quality` (optional): integer `1-100` (default: `80`)
- `removeBg` (optional): `"true"` to enable AI background removal

Response:

- Binary image content
- Headers:
	- `Content-Type`
	- `Content-Disposition`
	- `X-Original-Size`
	- `X-Processed-Size`

## Notes

- Max upload size is `20 MB`.
- Unsupported output format returns HTTP `400`.
- Processing/background-removal failures return HTTP `500` with JSON error details.

## Troubleshooting

- `CORS` issues:
	- Ensure backend is running and reachable at `http://localhost:3000`.
- Large files fail to upload:
	- Check the `20 MB` Multer file size limit in `backend/server.js`.
- Background removal fails:
	- Retry with a smaller image and check backend logs for the specific error.
