# AI-Based File Reader & Report Generator

This project is a MERN-stack application that uses self-hosted LLaMA 3 (via Ollama) to analyze CSV and Excel files and generate professional data analysis reports.

## Features
- **File Upload**: Drag-and-drop CSV, XLSX, and XLS files.
- **AI Analysis**: Automatic profiling, statistics, and anomaly detection.
- **Report Generation**: LLaMA 3 generated executive summaries and recommendations.
- **PDF Export**: Download reports as professional PDF documents.
- **Visualizations**: Interactive charts for data insights.

## Tech Stack
- **Frontend**: React, Recharts, Lucide React, Axios, React Dropzone.
- **Backend**: Node.js, Express, MongoDB (Mongoose), Multer, PDFKit.
- **AI Layer**: Ollama (LLaMA 3).

## Prerequisites
1. **Ollama**: Install from [ollama.com](https://ollama.com/).
2. **LLaMA 3**: Run `ollama pull llama3` in your terminal.
3. **MongoDB**: Have a MongoDB instance running (or use the one in `.env`).

## Setup Instructions

### 1. Backend Setup
```bash
cd Backend
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd Frontend/frontend
npm install
npm start
```

## How to Use
1. Open your browser to `http://localhost:3000`.
2. Drag and drop a CSV or Excel file.
3. Wait for the AI to process the data (~10 seconds).
4. View the report with charts and AI insights.
5. Click "Download PDF" to save the report locally.
