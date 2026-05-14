const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    analysisStats: {
        totalRows: Number,
        totalColumns: Number,
        columnStats: Object,
        numericStats: Object,
        duplicates: Number
    },
    reportData: {
        summary: String,
        anomalies: [String],
        recommendations: [String]
    },
    pdfPath: {
        type: String
    },
    originalFilePath: {
        type: String
    }
});

module.exports = mongoose.model('Report', ReportSchema);
