import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { sendViaWhatsApp, copyTextToClipboard } from '../utils/dispatchFormatter';
import {
  FileSpreadsheet,
  X,
  Send,
  Copy,
  Users,
  Download
} from 'lucide-react';

interface DailySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailySummaryModal: React.FC<DailySummaryModalProps> = ({ isOpen, onClose }) => {
  const { requests, samplers } = useApp();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalSamples = requests.length;
  const totalTons = requests.reduce((sum, r) => sum + (r.tonnageNumber || 0), 0);
  const collectedCount = requests.filter((r) => r.status === 'collected').length;

  const todayStr = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Daily Harvest & Sampling Summary</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">{todayStr} • NSP Labs Operations Report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Key KPI Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                Total Ponds
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-blue-900">{totalSamples}</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Harvest
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-emerald-900">
                {totalTons.toFixed(1)} <span className="text-xs font-semibold">T</span>
              </span>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
              <span className="block text-[9px] sm:text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                Collected
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-purple-900">
                {collectedCount}/{totalSamples}
              </span>
            </div>
          </div>

          {/* Sampler Breakdown Cards */}
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Sampler Workload:</span>
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
                    <span className="font-extrabold text-slate-900">{item.sampler.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex justify-between">
                    <span>{item.count} ponds</span>
                    <span className="font-extrabold text-slate-800">{item.tons} Tons</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Report Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs">
                WhatsApp Summary Report:
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold">Ready to share</span>
            </div>

            <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] max-h-44 overflow-y-auto shadow-inner">
              <pre className="whitespace-pre-wrap leading-relaxed">{reportText}</pre>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              onClick={handleSendWhatsApp}
              className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Share to WhatsApp</span>
            </button>

            <button
              onClick={handleCopy}
              className="py-3 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="py-3 px-3 bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Download Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
