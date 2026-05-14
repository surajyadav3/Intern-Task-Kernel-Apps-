const xlsx = require('xlsx');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

const parseFile = (filePath) => {
    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension === '.csv') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const results = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            transformHeader: h => h.trim()
        });
        return results.data;
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json(sheet, { defval: null });
    } else {
        throw new Error('Unsupported file format. Use CSV, XLSX, or XLS.');
    }
};

module.exports = { parseFile };
