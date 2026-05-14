const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { parseFile } = require('../controllers/fileParser');
const { analyzeData } = require('../controllers/dataAnalyzer');
const { generateAIReport } = require('../controllers/aiReporter');
const { generatePDF } = require('../utils/pdfGenerator');
const Report = require('../models/Report');

// In-memory fallback store when MongoDB is unavailable
const memoryStore = new Map();

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const filePath = req.file.path;
        const rawData = parseFile(filePath);
        const stats = analyzeData(rawData);
        const aiReport = await generateAIReport(stats, req.file.originalname);

        const reportObj = {
            filename: req.file.originalname,
            uploadedAt: new Date(),
            analysisStats: stats,
            reportData: aiReport,
            originalFilePath: filePath
        };

        const pdfPath = await generatePDF(reportObj, req.file.originalname);
        reportObj.pdfPath = pdfPath;

        // Try MongoDB, fall back to in-memory store
        let reportId;
        try {
            const newReport = new Report(reportObj);
            await newReport.save();
            reportId = newReport._id.toString();
            memoryStore.set(reportId, { ...reportObj, _id: reportId });
        } catch (dbErr) {
            console.warn('MongoDB unavailable, using in-memory store:', dbErr.message);
            reportId = crypto.randomUUID();
            reportObj._id = reportId;
            memoryStore.set(reportId, reportObj);
        }

        res.status(200).json({
            message: "Report generated successfully",
            reportId,
            report: { ...reportObj, _id: reportId }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error processing report", error: error.message });
    }
});

router.get('/history', async (req, res) => {
    try {
        const reports = await Report.find().sort({ uploadedAt: -1 });
        res.json(reports);
    } catch (error) {
        const reports = Array.from(memoryStore.values()).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        res.json(reports);
    }
});

router.get('/report/:id', async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (report) return res.json(report);
        const memReport = memoryStore.get(req.params.id);
        if (memReport) return res.json(memReport);
        res.status(404).json({ message: "Report not found" });
    } catch (error) {
        const memReport = memoryStore.get(req.params.id);
        if (memReport) return res.json(memReport);
        res.status(500).json({ message: "Error fetching report" });
    }
});

router.get('/report/:id/download', async (req, res) => {
    try {
        let report;
        try {
            report = await Report.findById(req.params.id);
        } catch (_) {}
        if (!report) report = memoryStore.get(req.params.id);
        if (!report || !report.pdfPath) return res.status(404).json({ message: "PDF not found" });
        res.download(report.pdfPath, `${report.filename}-report.pdf`);
    } catch (error) {
        res.status(500).json({ message: "Error downloading PDF" });
    }
});

router.get('/report/:id/download-original', async (req, res) => {
    try {
        let report;
        try {
            report = await Report.findById(req.params.id);
        } catch (_) {}
        if (!report) report = memoryStore.get(req.params.id);
        if (!report || !report.originalFilePath) return res.status(404).json({ message: "Original file not found" });
        res.download(report.originalFilePath, report.filename);
    } catch (error) {
        res.status(500).json({ message: "Error downloading original file" });
    }
});

module.exports = router;
