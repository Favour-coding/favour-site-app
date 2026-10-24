/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GitHubUser } from '../types';
import { verifyGitHubToken } from '../utils/github';
import {
  Github,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  GitBranch,
} from 'lucide-react';

interface GitHubScreenProps {
  token: string;
  onSaveToken: (token: string, user: GitHubUser) => void;
  onDisconnect: () => void;
  currentUser: GitHubUser | null;
}

export const GitHubScreen: React.FC<GitHubScreenProps> = ({
  token,
  onSaveToken,
  onDisconnect,
  currentUser,
}) => {
  const [inputToken, setInputToken] = useState(token);
  const [showToken, setShowToken] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputToken.trim()) {
      setErrorMessage('Please enter your GitHub Personal Access Token.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const user = await verifyGitHubToken(inputToken.trim());
      onSaveToken(inputToken.trim(), user);
      setSuccessNotice(`Successfully connected as @${user.login}!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate token with GitHub API.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Title & Scope explanation */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <Github className="w-6 h-6 text-neutral-900 dark:text-neutral-100" />
          <span>GitHub Connection & Authorization</span>
        </h2>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
          HTML to APK Studio runs 100% in your browser. To create the build repository and trigger the
          GitHub Actions workflow, enter a Personal Access Token (Classic or Fine-Grained).
        </p>
      </div>

      {/* Connected Account Card */}
      {currentUser && (
        <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={currentUser.avatar_url}
              alt={currentUser.login}
              className="w-12 h-12 rounded-full ring-2 ring-emerald-500/40"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  {currentUser.name || currentUser.login}
                </span>
                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  @{currentUser.login}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authenticated & Ready to Build</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{currentUser.public_repos} public repos</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={currentUser.html_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors inline-flex items-center gap-1.5"
            >
              <span>GitHub Profile</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={onDisconnect}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 transition-colors inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}

      {/* Token Input Form */}
      <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-4">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              Personal Access Token
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showToken ? 'text' : 'password'}
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxxxx"
                className="w-full pl-9 pr-10 py-2.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Stored strictly in your local browser, transmitted only to api.github.com</span>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !inputToken.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isVerifying ? 'Verifying...' : currentUser ? 'Update Token' : 'Verify & Connect'}</span>
            </button>
          </div>
        </form>

        {/* Step-by-step Guide */}
        <div className="pt-5 border-t border-neutral-200 dark:border-neutral-800">
          <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 mb-3">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>How to generate your GitHub token in 60 seconds</span>
          </h4>

          <ol className="text-xs text-neutral-600 dark:text-neutral-400 space-y-2.5 list-decimal pl-4 leading-relaxed">
            <li>
              Open the GitHub token creation page:{' '}
              <a
                href="https://github.com/settings/tokens/new"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span>github.com/settings/tokens/new</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Give it a Note like <strong>HTML to APK Studio</strong>.</li>
            <li>
              Tick ONLY these two required scopes:
              <ul className="mt-1 pl-4 list-disc space-y-1 text-neutral-700 dark:text-neutral-300">
                <li>
                  <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px]">
                    repo
                  </code>{' '}
                  — Full control of repositories (creates the temporary build repo and commits project files)
                </li>
                <li>
                  <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px]">
                    workflow
                  </code>{' '}
                  — Update GitHub Action workflows (executes the cloud Android compiler)
                </li>
              </ul>
            </li>
            <li>Click <strong>Generate token</strong> at the bottom of the page.</li>
            <li>Copy the token string and paste it into the field above.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
