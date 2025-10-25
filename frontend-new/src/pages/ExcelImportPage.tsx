import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cashflow } from '../services/cashflow';
import './ExcelImportPage.css';

interface ValidationResult {
  valid: boolean;
  months: string[];
  sheets: string[];
  errors: string[];
}

interface ImportResult {
  success: boolean;
  periodsCreated: number;
  feesImported: number;
  payrollImported: number;
  expensesImported: number;
  errors: string[];
}

export const ExcelImportPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidation(null);
      setResult(null);
      validateFile(selectedFile);
    }
  };

  const validateFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('Validating file:', file.name, file.size, 'bytes');
      const response = await cashflow.validateExcel(formData);
      console.log('Validation response:', response);
      setValidation(response);
    } catch (error: any) {
      console.error('Validation error:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Unknown error occurred';
      setValidation({
        valid: false,
        months: [],
        sheets: [],
        errors: [errorMessage],
      });
    }
  };

  const handleImport = async () => {
    if (!file || !validation?.valid) return;

    setImporting(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await cashflow.importExcel(formData);
      
      clearInterval(progressInterval);
      setProgress(100);
      setResult(response);
    } catch (error: any) {
      setResult({
        success: false,
        periodsCreated: 0,
        feesImported: 0,
        payrollImported: 0,
        expensesImported: 0,
        errors: [error.response?.data?.error || error.message],
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="excel-import-page">
      <div className="import-header">
        <button className="back-btn" onClick={() => navigate('/cashflow')}>
          ← Back to Cashflow
        </button>
        <h1>Import Historical Cashflow Data</h1>
        <p className="subtitle">Upload your Excel file to import historical monthly cashflow records</p>
      </div>

      <div className="import-container">
        {/* File Upload Section */}
        <div className="upload-section">
          <div className="dropzone">
            <input
              type="file"
              id="excel-file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={importing}
            />
            <label htmlFor="excel-file">
              <div className="dropzone-content">
                <span className="upload-icon">📊</span>
                <span className="upload-text">
                  {file ? file.name : 'Click to select or drag Excel file here'}
                </span>
                <span className="upload-hint">Supports .xlsx and .xls files</span>
              </div>
            </label>
          </div>
        </div>

        {/* Validation Preview */}
        {validation && (
          <div className={`validation-panel ${validation.valid ? 'valid' : 'invalid'}`}>
            <h3>
              {validation.valid ? '✅ Validation Passed' : '❌ Validation Failed'}
            </h3>

            {validation.valid && (
              <div className="validation-details">
                <div className="detail-row">
                  <strong>Months Found:</strong>
                  <span>{validation.months.join(', ')}</span>
                </div>
                <div className="detail-row">
                  <strong>Sheets Detected:</strong>
                  <span>{validation.sheets.join(', ')}</span>
                </div>
              </div>
            )}

            {validation.errors.length > 0 && (
              <div className="validation-errors">
                <strong>Errors:</strong>
                <ul>
                  {validation.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Import Button & Progress */}
        {validation?.valid && !result && (
          <div className="import-actions">
            <button
              className="import-btn"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? `Importing... ${progress}%` : 'Import Data'}
            </button>

            {importing && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Import Results */}
        {result && (
          <div className={`result-panel ${result.success ? 'success' : 'error'}`}>
            <h3>
              {result.success ? '✅ Import Successful' : '❌ Import Failed'}
            </h3>

            {result.success && (
              <div className="result-summary">
                <div className="summary-item">
                  <span className="summary-label">Periods Created:</span>
                  <span className="summary-value">{result.periodsCreated}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Student Fees Imported:</span>
                  <span className="summary-value">{result.feesImported}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Payroll Records Imported:</span>
                  <span className="summary-value">{result.payrollImported}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Expenses Imported:</span>
                  <span className="summary-value">{result.expensesImported}</span>
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="result-errors">
                <strong>Errors:</strong>
                <ul>
                  {result.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.success && (
              <button
                className="view-cashflow-btn"
                onClick={() => navigate('/cashflow')}
              >
                View Cashflow →
              </button>
            )}
          </div>
        )}
      </div>

      <div className="import-instructions">
        <h3>Expected Excel Format</h3>
        <ul>
          <li><strong>Sheet 1:</strong> "Cashflow Statement" - Monthly cashflow summary with formulas</li>
          <li><strong>Sheet 2:</strong> "School Fees Revenue" - Student fee payment details</li>
          <li><strong>Required Columns:</strong> Month, Amount, Date, Category, Description</li>
          <li><strong>Date Format:</strong> YYYY-MM-DD or DD/MM/YYYY</li>
          <li><strong>Historical Data:</strong> All imported periods will be locked (READ ONLY)</li>
        </ul>
      </div>
    </div>
  );
};
