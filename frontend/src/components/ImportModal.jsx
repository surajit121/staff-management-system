import React, { useState, useRef } from 'react';
import { X, Upload, FileType, Check, AlertCircle, Loader2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";

export default function ImportModal({
  isOpen,
  onClose,
  onImport,
  title = "Import Data",
  templateData = [],
  requiredFields = []
}) {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
      toast.error("Please upload an Excel or CSV file");
      return;
    }

    setFile(selectedFile);
    processFile(selectedFile);
  };

  const processFile = (file) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) {
          toast.error("The file is empty");
          setIsProcessing(false);
          return;
        }

        // Basic validation: check if required fields exist in at least one row
        const keys = Object.keys(jsonData[0]);
        const missingFields = requiredFields.filter(f => !keys.some(k => k.toLowerCase() === f.toLowerCase()));

        if (missingFields.length > 0) {
          toast.warning(`Missing columns: ${missingFields.join(', ')}. Some data might be incomplete.`);
        }

        setData(jsonData);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Failed to parse file");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (data.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(data);
      toast.success(`Successfully imported ${data.length} records`);
      handleClose();
    } catch (error) {
      toast.error(error.message || "Failed to import data");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setData([]);
    onClose();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_Template.xlsx`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-surface text-text">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileType className="text-accent" size={20} />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-text2">
            Upload an Excel or CSV file to import multiple records at once. You can download a template for reference.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {!file ? (
            <div
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-accent hover:bg-accent/5 transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-surface2 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={24} className="text-text3 group-hover:text-accent" />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold">Click to upload or drag and drop</p>
                <p className="text-[13px] text-text3 mt-1">Excel (.xlsx, .xls) or CSV files</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                className="mt-4 text-[12px] text-accent flex items-center gap-2"
              >
                <Download size={14} />
                Download Template
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface2 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center text-green">
                    <Check size={20} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold truncate max-w-[250px]">{file.name}</p>
                    <p className="text-[12px] text-text3">{(file.size / 1024).toFixed(1)} KB • {data.length} rows found</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="text-text3 hover:text-red">
                  <X size={18} />
                </Button>
              </div>

              {isProcessing ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="animate-spin text-accent" size={32} />
                  <p className="text-[14px] text-text2">Analyzing file...</p>
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-[12px] border-collapse">
                    <thead className="bg-surface2 sticky top-0">
                      <tr>
                        {data.length > 0 && Object.keys(data[0]).map(key => (
                          <th key={key} className="px-3 py-2 font-bold border-b border-border">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-3 py-2 text-text2">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 5 && (
                    <div className="p-2 text-center text-[11px] text-text3 bg-surface2/50">
                      Showing first 5 of {data.length} rows
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-amber-light/30 rounded-lg border border-amber-light text-amber-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  Please ensure column names match the required fields. Roles and Departments must match the system's predefined list.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={!file || data.length === 0 || isImporting || isProcessing}
            className="bg-accent text-white"
          >
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
