/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ActiveScreen, GitHubUser } from '../types';
import { Smartphone, Github, History, Wrench, Moon, Sun, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  activeScreen: ActiveScreen;
  onSelectScreen: (screen: ActiveScreen) => void;
  user: GitHubUser | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  buildsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  onSelectScreen,
  user,
  darkMode,
  onToggleDarkMode,
  buildsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <button
            onClick={() => onSelectScreen('builder')}
            className="text-left font-bold text-lg tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap hover:opacity-90 transition-opacity"
          >
            HTML to APK Studio
          </button>
        </div>

        {/* Zone 2: Navigation links / segmented tabs */}
        <nav className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
          <button
            onClick={() => onSelectScreen('builder')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
              activeScreen === 'builder'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Builder</span>
          </button>

          <button
            onClick={() => onSelectScreen('github')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
              activeScreen === 'github'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Connection</span>
            {user ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => onSelectScreen('builds')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
              activeScreen === 'builds'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>My Builds</span>
            {buildsCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                ({buildsCount})
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Account status / Dark mode trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <button
              onClick={() => onSelectScreen('github')}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors whitespace-nowrap shrink-0"
              title="View GitHub details"
            >
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-5 h-5 rounded-full ring-1 ring-neutral-300 dark:ring-neutral-700"
                referrerPolicy="no-referrer"
              />
              <span className="font-mono text-[11px] truncate max-w-[120px]">@{user.login}</span>
            </button>
          ) : (
            <button
              onClick={() => onSelectScreen('github')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Connect GitHub</span>
            </button>
          )}

          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors shrink-0"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
