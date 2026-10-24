/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BuildProgress, BuildRecord } from '../types';
import {
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileCheck,
  FolderGit2,
  Cpu,
  PackageCheck,
  QrCode,
  HelpCircle,
} from 'lucide-react';
import QRCode from 'qrcode';

interface BuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: BuildProgress;
  appName: string;
  onViewBuilds: () => void;
}

export const BuildModal: React.FC<BuildModalProps> = ({
  isOpen,
  onClose,
  progress,
  appName,
  onViewBuilds,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (progress.stage === 'done' && progress.apkUrl) {
      QRCode.toDataURL(progress.apkUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error(err));
    }
  }, [progress.stage, progress.apkUrl]);

  if (!isOpen) return null;

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins}:${String(remainingSec).padStart(2, '0')}`;
  };

  const steps = [
    {
      id: 'creating_repo',
      label: 'Creating Repository',
      desc: 'Provisioning public GitHub repository',
      icon: FolderGit2,
    },
    {
      id: 'uploading_files',
      label: 'Uploading Project Files',
      desc: 'Committing Android Gradle project & assets',
      icon: FileCheck,
    },
    {
      id: 'building',
      label: 'Building Android APK',
      desc: 'GitHub Action runner compiling with Gradle 8.7',
      icon: Cpu,
    },
    {
      id: 'publishing',
      label: 'Publishing Release',
      desc: 'Creating GitHub release and uploading APK artifact',
      icon: PackageCheck,
    },
  ];

  const getStepStatus = (stepId: string) => {
    if (progress.stage === 'failed') {
      if (progress.stage === stepId) return 'failed';
    }
    if (progress.stage === 'done') return 'completed';

    const order = ['creating_repo', 'uploading_files', 'building', 'publishing', 'done'];
    const currentIndex = order.indexOf(progress.stage);
    const stepIndex = order.indexOf(stepId);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>Building APK for</span>
              <span className="text-blue-600 dark:text-blue-400">{appName}</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
              {progress.repoName ? `Repo: ${progress.repoName}` : 'Preparing project build pipeline...'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono tabular-nums text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-md">
              Elapsed: {formatElapsed(progress.elapsedSeconds)}
            </span>
            {(progress.stage === 'done' || progress.stage === 'failed') && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Stepper Content */}
        <div className="py-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {steps.map((s, idx) => {
              const status = getStepStatus(s.id);
              const Icon = s.icon;

              return (
                <div
                  key={s.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    status === 'completed'
                      ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-neutral-900 dark:text-neutral-100'
                      : status === 'current'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : status === 'failed'
                      ? 'border-red-400 bg-red-50/50 dark:bg-red-950/30 text-neutral-900 dark:text-neutral-100'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-400 dark:text-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-neutral-500">0{idx + 1}</span>
                    {status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {status === 'current' && (
                      <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                    )}
                    {status === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    {status === 'pending' && <Icon className="w-4 h-4 opacity-40" />}
                  </div>

                  <div>
                    <p className="text-xs font-semibold leading-tight">{s.label}</p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Status Message Callout */}
          <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              {progress.stage !== 'done' && progress.stage !== 'failed' && (
                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
              )}
              {progress.stage === 'done' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {progress.stage === 'failed' && (
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <span className="font-medium text-neutral-800 dark:text-neutral-200">
                {progress.message}
              </span>
            </div>

            {progress.runUrl && (
              <a
                href={progress.runUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0 ml-3"
              >
                <span>Live Action Logs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Error Details if Failed */}
          {progress.stage === 'failed' && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Build Execution Error</span>
              </div>
              <p className="leading-relaxed">{progress.error}</p>
              {progress.failedStepName && (
                <p className="font-mono text-[11px]">Failed at step: {progress.failedStepName}</p>
              )}
              {progress.runUrl && (
                <div className="pt-2">
                  <a
                    href={progress.runUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                  >
                    <span>Inspect Raw GitHub Run Logs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Success View */}
          {progress.stage === 'done' && (
            <div className="space-y-6 pt-2">
              <div className="p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-3 flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Build & Release Completed</span>
                  </div>

                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    Your APK is ready to install!
                  </h3>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    The GitHub Action successfully compiled your HTML app into an Android package and uploaded it to your repository releases.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {progress.apkUrl && (
                      <a
                        href={progress.apkUrl}
                        download
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download APK</span>
                      </a>
                    )}

                    {progress.repoUrl && (
                      <a
                        href={progress.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <span>View Repository</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* QR Code Container */}
                {qrCodeUrl && (
                  <div className="flex flex-col items-center p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm shrink-0">
                    <img
                      src={qrCodeUrl}
                      alt="Download QR"
                      className="w-36 h-36 rounded-lg"
                    />
                    <span className="text-[11px] font-mono text-neutral-500 mt-2 flex items-center gap-1">
                      <QrCode className="w-3 h-3" />
                      <span>Scan with phone</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Installation Notice */}
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed space-y-1">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                  <span>How to install on your Android device:</span>
                </p>
                <p>
                  1. Download the APK file on your phone (or transfer it).
                  <br />
                  2. If blocked by Android, enable <em>"Install unknown apps"</em> for your browser in Device Settings.
                  <br />
                  3. Open the APK from notifications or your Downloads folder to install.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onViewBuilds}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            View in My Builds History →
          </button>

          {(progress.stage === 'done' || progress.stage === 'failed') && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
