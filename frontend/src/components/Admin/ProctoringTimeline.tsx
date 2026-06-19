import React from "react";
import { Clock, ShieldAlert, Image, AlertTriangle } from "lucide-react";

interface ProctoringEvent {
  id: string;
  event_type: string;
  severity: string;
  severity_score: number;
  duration_seconds: number;
  image_url: string | null;
  metadata: any;
  created_at: string;
}

interface ProctoringTimelineProps {
  events: ProctoringEvent[];
  totalRiskScore: number;
  loading: boolean;
}

export function ProctoringTimeline({ events, totalRiskScore, loading }: ProctoringTimelineProps) {
  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading Security Records...</p>
      </div>
    );
  }

  // Risk assessment calculation
  let riskLevel = "Low Risk";
  let riskBg = "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300";
  if (totalRiskScore >= 9) {
    riskLevel = "High Risk";
    riskBg = "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300";
  } else if (totalRiskScore >= 4) {
    riskLevel = "Medium Risk";
    riskBg = "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300";
  }

  return (
    <div className="space-y-6">
      {/* Unified Risk Score Card */}
      <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-none">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Security Audit Status</p>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase leading-none">Unified Proctoring Timeline</h3>
          </div>
        </div>
        <div className="text-right flex items-center gap-4">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Risk Score</p>
            <p className="text-base font-black tabular-nums text-slate-900 dark:text-white">{totalRiskScore}</p>
          </div>
          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border border-transparent ${riskBg}`}>
            {riskLevel}
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest border border-dashed border-slate-200 dark:border-slate-800 p-8">
          No security violations or monitoring anomalies recorded for this attempt.
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-6 ml-4 space-y-8 py-2">
          {events.map((evt) => {
            const timeStr = new Date(evt.created_at).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            // Severity styling map
            let sevStyle = "border-slate-200 text-slate-500 bg-slate-50";
            if (evt.severity === "MEDIUM") sevStyle = "border-amber-200 text-amber-600 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20";
            if (evt.severity === "HIGH") sevStyle = "border-red-200 text-red-600 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20";

            return (
              <div key={evt.id} className="relative group animate-in fade-in-50 duration-200">
                {/* Custom timeline node */}
                <div className={`absolute -left-[31px] top-1.5 h-[10px] w-[10px] rounded-full border-2 bg-white dark:bg-slate-900 flex items-center justify-center ${
                  evt.severity === "HIGH" ? "border-red-500" : evt.severity === "MEDIUM" ? "border-amber-500" : "border-slate-400"
                }`} />

                <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-none bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{timeStr}</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase mt-0.5 tracking-tight">{evt.event_type.replace(/_/g, " ")}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider border rounded-sm ${sevStyle}`}>
                        {evt.severity} (+{evt.severity_score})
                      </span>
                    </div>
                  </div>

                  {evt.duration_seconds > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Duration: {evt.duration_seconds.toFixed(1)} Seconds</span>
                    </div>
                  )}

                  {evt.image_url && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Image className="h-3 w-3" /> Evidence Capture
                      </span>
                      <div className="relative aspect-video max-w-sm bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden group/img">
                        <img
                          src={evt.image_url}
                          alt="Violation Snapshot Evidence"
                          className="h-full w-full object-cover transition-transform group-hover/img:scale-105"
                        />
                      </div>
                    </div>
                  )}

                  {evt.metadata && (
                    <div className="text-[10px] bg-slate-100/50 dark:bg-slate-950/40 p-2 border border-slate-100 dark:border-slate-900/60 font-mono text-slate-500 space-y-1">
                      <p className="font-bold text-[8px] uppercase tracking-widest text-slate-400 leading-none mb-1">Metadata log</p>
                      <pre className="whitespace-pre-wrap leading-relaxed text-[9px] text-slate-500 dark:text-slate-400">
                        {JSON.stringify(evt.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
