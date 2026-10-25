import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { sendViaWhatsApp, copyTextToClipboard } from '../utils/dispatchFormatter';
import {
  FileSpreadsheet,
  X,
  Send,
  Copy,
  CheckCircle2,
  TrendingUp,
  Scale,
  Users,
  Download,
  Calendar
} from 'lucide-react';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({ isOpen, onClose }) => {
  const { requests, samplers } = useApp();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Calculate metrics
  const totalSamples = requests.length;
  const totalTons = requests.reduce((sum, r) => sum + (r.tonnageNumber || 0), 0);
  const collectedCount = requests.filter((r) => r.status === 'collected').length;

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  // Breakdown by sampler
  const samplerBreakdown = samplers.map((s) => {
    const sRequests = requests.filter((r) => r.assignedSamplerId === s.id);
    const sTons = sRequests.reduce((sum, r) => sum + (r.tonnageNumber || 0), 0);
    const locations = sRequests.map((r) => r.locationName);
    return {
      sampler: s,
      count: sRequests.length,
      tons: Number(sTons.toFixed(1)),
      locations
    };
  });

  // Generate WhatsApp summary report
  const generateDailyReportText = (): string => {
    const lines: string[] = [];
    lines.push(`📊 *NSP Labs Daily Sampling & Harvest Report*`);
    lines.push(`📅 Date: ${todayStr}`);
    lines.push(`🦐 Total Ponds: ${totalSamples}`);
    lines.push(`⚖️ Total Prawn Harvest: ${totalTons.toFixed(1)} Tons`);
    lines.push('');
    lines.push(`*Sampler Allocations:*`);

    samplerBreakdown.forEach((item) => {
      if (item.count > 0) {
        lines.push(
          `• @${item.sampler.name}: ${item.count} ponds (${item.locations.join(', ')}) - ${item.tons} Tons`
        );
      }
    });

    lines.push('');
    lines.push(`*Harvest List:*`);
    requests.forEach((r, idx) => {
      const sampler = samplers.find((s) => s.id === r.assignedSamplerId);
      lines.push(
        `${idx + 1}. ${r.farmerCode} | ${r.countTons} | ${r.locationName} ➔ ${sampler?.name || 'Pending'}`
      );
    });

    lines.push('');
    lines.push(`*NSP Labs Lab Dispatch System*`);
    return lines.join('\n');
  };

  const reportText = generateDailyReportText();

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Harvest Date',
      'Company',
      'Farmer Code',
      'Count & Tons',
      'Tonnage Number',
      'Specs',
      'Location',
      'Landmark',
      'Owner Phone',
      'Alt Contact',
      'Assigned Sampler',
      'Status'
    ];

    const rows = requests.map((r) => {
      const sampler = samplers.find((s) => s.id === r.assignedSamplerId);
      return [
        `"${r.harvestDate}"`,
        `"${r.company}"`,
        `"${r.farmerCode}"`,
        `"${r.countTons}"`,
        `"${r.tonnageNumber || 0}"`,
        `"${r.rateSpecs}"`,
        `"${r.locationName}"`,
        `"${r.subLocation || ''}"`,
        `"${r.ownerPhone}"`,
        `"${r.altContactName || ''} ${r.altContactPhone || ''}"`,
        `"${sampler?.name || 'Unassigned'}"`,
        `"${r.status}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NSP_Labs_Harvest_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCopy = async () => {
    const success = await copyTextToClipboard(reportText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    sendViaWhatsApp(reportText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Daily Harvest & Sampling Summary</h2>
              <p className="text-[11px] text-slate-500">{todayStr} • NSP Labs Operations Report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Key KPI Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                Total Ponds
              </span>
              <span className="text-xl font-extrabold text-blue-900">{totalSamples}</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Total Harvest
              </span>
              <span className="text-xl font-extrabold text-emerald-900">
                {totalTons.toFixed(1)} <span className="text-xs font-semibold">Tons</span>
              </span>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
              <span className="block text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                Samples Collected
              </span>
              <span className="text-xl font-extrabold text-purple-900">
                {collectedCount} / {totalSamples}
              </span>
            </div>
          </div>

          {/* Sampler Breakdown Cards */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Sampler Workload Today:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {samplerBreakdown.map((item) => (
                <div
                  key={item.sampler.id}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.sampler.color }}
                    />
                    <span className="font-bold text-slate-800">{item.sampler.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex justify-between">
                    <span>{item.count} ponds</span>
                    <span className="font-bold text-slate-800">{item.tons} Tons</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Report Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-700 text-xs">
                WhatsApp Daily Summary Message:
              </h3>
              <span className="text-[10px] text-slate-400">Ready to share</span>
            </div>

            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto shadow-inner">
              <pre className="whitespace-pre-wrap leading-relaxed">{reportText}</pre>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              onClick={handleSendWhatsApp}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Share to WhatsApp</span>
            </button>

            <button
              onClick={handleCopy}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy Report'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
