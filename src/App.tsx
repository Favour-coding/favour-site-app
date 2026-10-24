/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveScreen,
  AppSettings,
  AssetFile,
  BuildProgress,
  BuildRecord,
  GitHubUser,
} from './types';
import { Header } from './components/Header';
import { BuilderScreen } from './components/BuilderScreen';
import { GitHubScreen } from './components/GitHubScreen';
import { BuildsScreen } from './components/BuildsScreen';
import { BuildModal } from './components/BuildModal';
import {
  checkRepoExists,
  commitFilesToRepo,
  createRepository,
  deleteBuildRecordFromDataRepo,
  fetchBuildsJson,
  getLatestWorkflowRun,
  getReleaseApkAsset,
  getWorkflowRunJobDetails,
  loadAppSourceFromDataRepo,
  saveBuildRecordAndSource,
  updateReleaseBody,
  verifyGitHubToken,
} from './utils/github';
import { generateAndroidProjectFiles, generateRepoName } from './utils/androidTemplates';
import { generateMipmapIcons } from './utils/iconGenerator';

const STORAGE_KEY_TOKEN = 'html_to_apk_gh_token';
const STORAGE_KEY_BUILDS = 'html_to_apk_builds';
const STORAGE_KEY_DARK = 'html_to_apk_dark_mode';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('builder');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DARK);
    if (saved !== null) return saved === 'true';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Builder state - starts strictly EMPTY as per rules
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    appName: '',
    packageId: '',
    versionName: '1.0.0',
    versionCode: 1,
    themeColor: '#2563EB',
    orientation: 'auto',
    fullscreen: false,
    permissions: {
      internet: true,
      camera: false,
      location: false,
      microphone: false,
    },
    iconDataUrl: null,
  });

  // Update mode state
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [targetRepoName, setTargetRepoName] = useState('');
  const [targetRepoUrl, setTargetRepoUrl] = useState('');
  const [whatsNew, setWhatsNew] = useState('');

  // GitHub state
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN) || '';
  });
  const [gitHubUser, setGitHubUser] = useState<GitHubUser | null>(null);

  // My Builds state (synced with GitHub apk-studio-data, cached in localStorage)
  const [builds, setBuilds] = useState<BuildRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BUILDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Cloud Sync indicators
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [cloudSyncNote, setCloudSyncNote] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Build Progress & Modal
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [buildProgress, setBuildProgress] = useState<BuildProgress>({
    stage: 'idle',
    message: '',
    elapsedSeconds: 0,
  });

  const timerIntervalRef = useRef<number | null>(null);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_DARK, String(darkMode));
  }, [darkMode]);

  // Save builds to localStorage as offline cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BUILDS, JSON.stringify(builds));
  }, [builds]);

  // Token verification on open
  useEffect(() => {
    if (token && !gitHubUser) {
      verifyGitHubToken(token)
        .then((user) => {
          setGitHubUser(user);
        })
        .catch(() => {
          // Token might be invalid or revoked
        });
    }
  }, [token, gitHubUser]);

  // ON APP OPEN: Fetch builds.json from apk-studio-data once user is verified
  useEffect(() => {
    if (!token || !gitHubUser) return;

    let isMounted = true;
    setIsSyncingCloud(true);

    fetchBuildsJson(token, gitHubUser.login)
      .then((remoteBuilds) => {
        if (!isMounted) return;
        if (remoteBuilds && remoteBuilds.length > 0) {
          setBuilds(remoteBuilds);
          setIsCloudSynced(true);
          setCloudSyncNote(null);
        } else if (remoteBuilds && remoteBuilds.length === 0) {
          setIsCloudSynced(true);
          setCloudSyncNote(null);
        } else {
          // apk-studio-data doesn't exist yet or is empty
          setIsCloudSynced(false);
          if (builds.length > 0) {
            setCloudSyncNote('Local cache active. Builds will sync to apk-studio-data on your next build.');
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Could not sync with apk-studio-data:', err);
        setIsCloudSynced(false);
        if (builds.length > 0) {
          setCloudSyncNote('Cloud sync unavailable; running on local offline cache.');
        }
      })
      .finally(() => {
        if (isMounted) setIsSyncingCloud(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, gitHubUser]);

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const handleClearEditor = () => {
    if (
      (htmlContent || assets.length > 0) &&
      !window.confirm('Are you sure you want to clear the editor and all loaded assets?')
    ) {
      return;
    }
    setHtmlContent('');
    setAssets([]);
    if (isUpdateMode) {
      setIsUpdateMode(false);
      setTargetRepoName('');
      setWhatsNew('');
    }
  };

  const handleSaveToken = (newToken: string, user: GitHubUser) => {
    setToken(newToken);
    setGitHubUser(user);
    localStorage.setItem(STORAGE_KEY_TOKEN, newToken);
  };

  const handleDisconnectGitHub = () => {
    setToken('');
    setGitHubUser(null);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    setIsCloudSynced(false);
  };

  // UPDATE THIS APP: Load saved settings and source from apk-studio-data
  const handleUpdateApp = async (build: BuildRecord) => {
    // Safety check: Never overwrite user's HTML without confirmation
    if (htmlContent.trim().length > 0) {
      const confirmReplace = window.confirm(
        `Loading "${build.appName}" will replace your current editor content and assets. Do you want to continue?`
      );
      if (!confirmReplace) return;
    }

    try {
      let loadedHtml = '';
      let loadedAssets: AssetFile[] = [];
      let loadedIcon: string | null = build.iconDataUrl || null;

      // Try loading source files from apk-studio-data
      if (token && gitHubUser) {
        try {
          const appSource = await loadAppSourceFromDataRepo(token, gitHubUser.login, build.packageId);
          if (appSource.html) {
            loadedHtml = appSource.html;
          }
          if (appSource.assets.length > 0) {
            loadedAssets = appSource.assets;
          }
          if (appSource.iconDataUrl) {
            loadedIcon = appSource.iconDataUrl;
          }
        } catch (sourceErr) {
          console.warn('Could not load source from apk-studio-data, using available build record', sourceErr);
        }
      }

      setHtmlContent(loadedHtml);
      setAssets(loadedAssets);

      // Pre-fill form: lock packageId, version code = previous + 1
      setSettings({
        appName: build.appName,
        packageId: build.packageId,
        versionName: build.versionName || '1.0.1',
        versionCode: (build.versionCode || 1) + 1,
        themeColor: build.themeColor || '#2563EB',
        orientation: build.orientation || 'auto',
        fullscreen: build.fullscreen || false,
        permissions: build.permissions || {
          internet: true,
          camera: false,
          location: false,
          microphone: false,
        },
        iconDataUrl: loadedIcon,
      });

      // Activate Update Mode
      setIsUpdateMode(true);
      setTargetRepoName(build.repoName);
      setTargetRepoUrl(build.repoUrl);
      setWhatsNew('');

      setActiveScreen('builder');
    } catch (err: any) {
      alert(`Could not load app for update: ${err.message || err}`);
    }
  };

  const handleCancelUpdateMode = () => {
    setIsUpdateMode(false);
    setTargetRepoName('');
    setTargetRepoUrl('');
    setWhatsNew('');
  };

  const handleRemoveBuild = async (id: string) => {
    const updated = builds.filter((b) => b.id !== id);
    setBuilds(updated);

    if (token && gitHubUser) {
      try {
        await deleteBuildRecordFromDataRepo(token, gitHubUser.login, id);
      } catch (err) {
        console.warn('Could not remove build from remote apk-studio-data', err);
      }
    }
  };

  const handleClearAllBuilds = () => {
    if (window.confirm('Are you sure you want to clear all build history?')) {
      setBuilds([]);
    }
  };

  // BUILD ANDROID APK / BUILD UPDATE WORKFLOW
  const handleStartBuild = async () => {
    if (!token || !gitHubUser) {
      setActiveScreen('github');
      return;
    }

    let currentRepoName = isUpdateMode && targetRepoName ? targetRepoName : generateRepoName(settings.appName);
    let createdRepoUrl = isUpdateMode && targetRepoUrl ? targetRepoUrl : '';

    setIsBuildModalOpen(true);
    setBuildProgress({
      stage: 'validating',
      message: isUpdateMode
        ? `Preparing update for repository ${currentRepoName}...`
        : `Creating repository ${currentRepoName}...`,
      elapsedSeconds: 0,
      repoName: currentRepoName,
    });

    const startTime = Date.now();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
      setBuildProgress((prev) => ({
        ...prev,
        elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
      }));
    }, 1000);

    const buildRecordId = `build-${Date.now()}`;

    try {
      // 1. Repository Setup: Check or Create
      if (isUpdateMode) {
        setBuildProgress((prev) => ({
          ...prev,
          stage: 'checking_repo',
          message: `Verifying existing repository "${currentRepoName}" on GitHub...`,
        }));

        const exists = await checkRepoExists(token, gitHubUser.login, currentRepoName);
        if (!exists) {
          // Repo was deleted on GitHub (404) -> offer to create a new repo with same settings
          const createNew = window.confirm(
            `The repository "${currentRepoName}" was deleted or not found on GitHub (404).\n\nWould you like to create a new repository for this app update with the same settings?`
          );
          if (!createNew) {
            setIsBuildModalOpen(false);
            return;
          }

          // Create new repo with same settings
          currentRepoName = generateRepoName(settings.appName);
          setBuildProgress((prev) => ({
            ...prev,
            stage: 'creating_repo',
            message: `Creating new repository ${currentRepoName}...`,
            repoName: currentRepoName,
          }));

          const repoData = await createRepository(token, currentRepoName, settings.appName);
          createdRepoUrl = repoData.html_url;
          setTargetRepoName(currentRepoName);
          setTargetRepoUrl(createdRepoUrl);
        }
      } else {
        // Brand new build -> Create new public repo
        setBuildProgress((prev) => ({
          ...prev,
          stage: 'creating_repo',
          message: `Creating new public repository: ${currentRepoName}...`,
        }));

        const repoData = await createRepository(token, currentRepoName, settings.appName);
        createdRepoUrl = repoData.html_url;
      }

      setBuildProgress((prev) => ({
        ...prev,
        stage: 'uploading_files',
        message: 'Generating Android project and icon mipmaps...',
        repoUrl: createdRepoUrl,
      }));

      // 2. Generate Mipmap Icons & Android Project Files in Memory
      const mipmaps = await generateMipmapIcons(
        settings.iconDataUrl,
        settings.appName,
        settings.themeColor
      );

      const files = generateAndroidProjectFiles(
        settings,
        htmlContent,
        assets,
        mipmaps,
        currentRepoName
      );

      setBuildProgress((prev) => ({
        ...prev,
        message: `Committing ${files.length} project files via Git Blobs and Trees API...`,
      }));

      // 3. Commit files
      const commitMessage = isUpdateMode
        ? `Update ${settings.appName} to v${settings.versionName} (build ${settings.versionCode})\n\n${whatsNew || ''}`
        : `Initial commit for ${settings.appName}`;

      await commitFilesToRepo(
        token,
        gitHubUser.login,
        currentRepoName,
        files,
        commitMessage,
        (uploaded, total) => {
          setBuildProgress((prev) => ({
            ...prev,
            message: `Uploaded ${uploaded}/${total} files to repository...`,
          }));
        }
      );

      // 4. Building Stage - Poll Actions API
      setBuildProgress((prev) => ({
        ...prev,
        stage: 'building',
        message: 'Triggered GitHub Actions runner. Compiling with Gradle 8.7...',
      }));

      // Add temporary building record to history
      const tempRecord: BuildRecord = {
        id: buildRecordId,
        appName: settings.appName,
        packageId: settings.packageId,
        versionName: settings.versionName || '1.0.0',
        versionCode: settings.versionCode || 1,
        themeColor: settings.themeColor || '#2563EB',
        orientation: settings.orientation,
        fullscreen: settings.fullscreen,
        permissions: settings.permissions,
        repoName: currentRepoName,
        repoUrl: createdRepoUrl,
        createdAt: new Date().toISOString(),
        status: 'building',
        whatsNew: whatsNew || undefined,
        iconDataUrl: settings.iconDataUrl,
      };

      setBuilds((prev) => [tempRecord, ...prev.filter((b) => b.id !== buildRecordId)]);

      let runId: number | null = null;
      let runNumber: number | null = null;
      let runUrl: string | null = null;
      let pollCount = 0;
      const maxPollAttempts = 120; // 10 minutes max (polling every 5s)

      while (pollCount < maxPollAttempts) {
        await new Promise((r) => setTimeout(r, 5000));
        pollCount++;

        const run = await getLatestWorkflowRun(token, gitHubUser.login, currentRepoName);

        if (!run) {
          setBuildProgress((prev) => ({
            ...prev,
            message: 'Queuing GitHub Actions build on ubuntu-latest...',
          }));
          continue;
        }

        runId = run.id;
        runNumber = run.run_number;
        runUrl = run.html_url;

        // Inspect current running step
        const jobDetails = await getWorkflowRunJobDetails(
          token,
          gitHubUser.login,
          currentRepoName,
          run.id
        );

        const currentStep = jobDetails.currentStepName
          ? `Running: ${jobDetails.currentStepName}`
          : 'Compiling Android application...';

        if (run.status !== 'completed') {
          setBuildProgress((prev) => ({
            ...prev,
            stage: 'building',
            message: currentStep,
            runId: run.id,
            runUrl: run.html_url,
          }));
          continue;
        }

        // Run is completed! Check conclusion
        if (run.conclusion === 'success') {
          setBuildProgress((prev) => ({
            ...prev,
            stage: 'publishing',
            message: 'Locating published APK release asset...',
            runId: run.id,
            runUrl: run.html_url,
          }));

          let releaseData: { apkUrl: string; releaseUrl: string; releaseId?: number } | null = null;
          for (let r = 0; r < 6; r++) {
            releaseData = await getReleaseApkAsset(
              token,
              gitHubUser.login,
              currentRepoName,
              runNumber
            );
            if (releaseData) break;
            await new Promise((res) => setTimeout(res, 3000));
          }

          const apkUrl = releaseData?.apkUrl;
          const releaseUrl = releaseData?.releaseUrl || `${createdRepoUrl}/releases`;

          // If what's new note exists, update release description
          if (whatsNew && releaseData?.releaseId) {
            await updateReleaseBody(
              token,
              gitHubUser.login,
              currentRepoName,
              releaseData.releaseId,
              `### What's New\n\n${whatsNew}`
            );
          }

          // 5. Save to apk-studio-data cloud storage
          setBuildProgress((prev) => ({
            ...prev,
            stage: 'saving_data',
            message: 'Syncing build record and app source to apk-studio-data...',
          }));

          const completedRecord: BuildRecord = {
            id: buildRecordId,
            appName: settings.appName,
            packageId: settings.packageId,
            versionName: settings.versionName || '1.0.0',
            versionCode: settings.versionCode || 1,
            themeColor: settings.themeColor || '#2563EB',
            orientation: settings.orientation,
            fullscreen: settings.fullscreen,
            permissions: settings.permissions,
            repoName: currentRepoName,
            repoUrl: createdRepoUrl,
            apkDownloadUrl: apkUrl,
            releaseUrl,
            runId: run.id,
            runUrl: run.html_url,
            createdAt: new Date().toISOString(),
            status: 'success',
            whatsNew: whatsNew || undefined,
            iconDataUrl: settings.iconDataUrl,
          };

          try {
            const syncedList = await saveBuildRecordAndSource(
              token,
              gitHubUser.login,
              completedRecord,
              htmlContent,
              settings.iconDataUrl,
              assets
            );
            setBuilds(syncedList);
            setIsCloudSynced(true);
            setCloudSyncNote(null);
          } catch (syncErr: any) {
            console.warn('Could not save to apk-studio-data:', syncErr);
            setBuilds((prev) => [completedRecord, ...prev.filter((b) => b.id !== buildRecordId)]);
            setCloudSyncNote(`Build succeeded, but cloud sync to apk-studio-data failed: ${syncErr.message || syncErr}`);
          }

          setBuildProgress((prev) => ({
            ...prev,
            stage: 'done',
            message: isUpdateMode
              ? 'Update compiled and published successfully!'
              : 'APK generated and published successfully!',
            apkUrl,
            releaseUrl,
            runUrl: run.html_url,
          }));

          break;
        } else {
          // Failure or cancellation
          const failedStep = jobDetails.failedStepName || 'Build debug APK';
          const errorMsg = `GitHub Actions run failed during step "${failedStep}". Check the action logs for compile trace.`;

          setBuildProgress((prev) => ({
            ...prev,
            stage: 'failed',
            message: 'Build failed.',
            error: errorMsg,
            failedStepName: failedStep,
            runId: run.id,
            runUrl: run.html_url,
          }));

          setBuilds((prev) =>
            prev.map((b) =>
              b.id === buildRecordId
                ? {
                    ...b,
                    status: 'failure',
                    errorMessage: errorMsg,
                    runId: run.id,
                    runUrl: run.html_url,
                  }
                : b
            )
          );

          break;
        }
      }

      if (pollCount >= maxPollAttempts) {
        throw new Error('Build monitoring timed out after 10 minutes. Please check your GitHub repository.');
      }
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred during the build process.';
      setBuildProgress((prev) => ({
        ...prev,
        stage: 'failed',
        message: 'Build encountered an error.',
        error: errMsg,
      }));

      setBuilds((prev) =>
        prev.map((b) =>
          b.id === buildRecordId
            ? {
                ...b,
                status: 'failure',
                errorMessage: errMsg,
              }
            : b
        )
      );
    } finally {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const lastBuild = builds.length > 0 ? builds[0] : null;

  return (
    <div className="min-h-screen bg-neutral-100/70 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors selection:bg-blue-500 selection:text-white">
      <Header
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        user={gitHubUser}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        buildsCount={builds.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeScreen === 'builder' && (
          <BuilderScreen
            htmlContent={htmlContent}
            onChangeHtml={setHtmlContent}
            assets={assets}
            onSetAssets={setAssets}
            onClear={handleClearEditor}
            settings={settings}
            onChangeSettings={setSettings}
            onStartBuild={handleStartBuild}
            gitHubUser={gitHubUser}
            onGoToGitHub={() => setActiveScreen('github')}
            isBuilding={
              buildProgress.stage !== 'idle' &&
              buildProgress.stage !== 'done' &&
              buildProgress.stage !== 'failed'
            }
            lastBuild={lastBuild}
            onUpdateApp={handleUpdateApp}
            onViewHistory={() => setActiveScreen('builds')}
            isUpdateMode={isUpdateMode}
            targetRepoName={targetRepoName}
            whatsNew={whatsNew}
            onChangeWhatsNew={setWhatsNew}
            onCancelUpdateMode={handleCancelUpdateMode}
            isCloudSyncing={isSyncingCloud}
            isCloudSynced={isCloudSynced}
            cloudSyncNote={cloudSyncNote}
          />
        )}

        {activeScreen === 'github' && (
          <GitHubScreen
            token={token}
            onSaveToken={handleSaveToken}
            onDisconnect={handleDisconnectGitHub}
            currentUser={gitHubUser}
          />
        )}

        {activeScreen === 'builds' && (
          <BuildsScreen
            builds={builds}
            onRemoveBuild={handleRemoveBuild}
            onClearAll={handleClearAllBuilds}
            onGoToBuilder={() => setActiveScreen('builder')}
            onSelectAppForUpdate={handleUpdateApp}
            isSyncedWithCloud={isCloudSynced}
          />
        )}
      </main>

      {/* Build Progress Modal */}
      <BuildModal
        isOpen={isBuildModalOpen}
        onClose={() => setIsBuildModalOpen(false)}
        progress={buildProgress}
        appName={settings.appName}
        onViewBuilds={() => {
          setIsBuildModalOpen(false);
          setActiveScreen('builds');
        }}
      />
    </div>
  );
}
