/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSettings, AssetFile } from '../types';
import { MipmapIcons } from './iconGenerator';

export interface GeneratedProjectFile {
  path: string;
  content: string; // text or base64
  encoding: 'utf-8' | 'base64';
}

/**
 * Escapes XML strings
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, "\\'");
}

/**
 * Converts Uint8Array to base64
 */
function uint8ArrayToBase64(uint8: Uint8Array): string {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

/**
 * Sanitizes app name to lowercase letters, numbers, and hyphens for rootProject and repository naming
 */
export function sanitizeAppName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'app';
}

/**
 * Generates repository name with app name and timestamp (e.g. "myspace-apk-20261023-1145")
 */
export function generateRepoName(appName: string): string {
  const sanitized = sanitizeAppName(appName);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${year}${month}${day}-${hours}${mins}${secs}`;
  return `${sanitized}-apk-${timestamp}`;
}

export function generateAndroidProjectFiles(
  settings: AppSettings,
  htmlContent: string,
  extraAssets: AssetFile[],
  mipmapIcons: MipmapIcons,
  repoName: string
): GeneratedProjectFile[] {
  const files: GeneratedProjectFile[] = [];

  const sanitizedRootName = sanitizeAppName(settings.appName);
  const packagePath = settings.packageId.replace(/\./g, '/');
  const orientationAttr =
    settings.orientation === 'portrait'
      ? 'android:screenOrientation="portrait"'
      : settings.orientation === 'landscape'
      ? 'android:screenOrientation="sensorLandscape"'
      : 'android:screenOrientation="unspecified"';

  // 1. settings.gradle.kts
  files.push({
    path: 'settings.gradle.kts',
    encoding: 'utf-8',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${sanitizedRootName}"
include(":app")
`,
  });

  // 2. build.gradle.kts (root)
  files.push({
    path: 'build.gradle.kts',
    encoding: 'utf-8',
    content: `plugins {
    id("com.android.application") version "8.5.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.24" apply false
}
`,
  });

  // 3. gradle.properties
  files.push({
    path: 'gradle.properties',
    encoding: 'utf-8',
    content: `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`,
  });

  // 4. app/build.gradle.kts
  files.push({
    path: 'app/build.gradle.kts',
    encoding: 'utf-8',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${settings.packageId}"
    compileSdk = 34

    defaultConfig {
        applicationId = "${settings.packageId}"
        minSdk = 24
        targetSdk = 34
        versionCode = ${Math.max(1, settings.versionCode || 1)}
        versionName = "${settings.versionName || '1.0.0'}"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.biometric:biometric:1.2.0-alpha05")
}
`,
  });

  // 5. app/proguard-rules.pro
  files.push({
    path: 'app/proguard-rules.pro',
    encoding: 'utf-8',
    content: `-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class androidx.webkit.** { *; }
-keep class androidx.biometric.** { *; }
`,
  });

  // 6. Manifest permissions
  const manifestPermissions: string[] = [
    '<uses-permission android:name="android.permission.USE_BIOMETRIC" />',
  ];
  if (settings.permissions.internet) {
    manifestPermissions.push('<uses-permission android:name="android.permission.INTERNET" />');
  }
  if (settings.permissions.camera) {
    manifestPermissions.push('<uses-permission android:name="android.permission.CAMERA" />');
    manifestPermissions.push('<uses-feature android:name="android.hardware.camera" android:required="false" />');
  }
  if (settings.permissions.location) {
    manifestPermissions.push('<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />');
    manifestPermissions.push('<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />');
  }
  if (settings.permissions.microphone) {
    manifestPermissions.push('<uses-permission android:name="android.permission.RECORD_AUDIO" />');
    manifestPermissions.push('<uses-feature android:name="android.hardware.microphone" android:required="false" />');
  }

  // 7. app/src/main/AndroidManifest.xml
  files.push({
    path: 'app/src/main/AndroidManifest.xml',
    encoding: 'utf-8',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    ${manifestPermissions.join('\n    ')}

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.App"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            ${orientationAttr}
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|smallestScreenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`,
  });

  // 8. Runtime permission checks in Kotlin
  const runtimePermissionChecks: string[] = [];
  if (settings.permissions.camera) {
    runtimePermissionChecks.push(
      `if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) { permissionsToRequest.add(Manifest.permission.CAMERA) }`
    );
  }
  if (settings.permissions.location) {
    runtimePermissionChecks.push(
      `if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) { permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION) }`
    );
  }
  if (settings.permissions.microphone) {
    runtimePermissionChecks.push(
      `if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) { permissionsToRequest.add(Manifest.permission.RECORD_AUDIO) }`
    );
  }

  const fullscreenKotlin = settings.fullscreen
    ? `
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
`
    : '';

  // 9. app/src/main/java/{packagePath}/MainActivity.kt
  files.push({
    path: `app/src/main/java/${packagePath}/MainActivity.kt`,
    encoding: 'utf-8',
    content: `package ${settings.packageId}

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import java.util.concurrent.Executor
import ${settings.packageId}.R

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val results: Array<Uri>? = if (result.resultCode == RESULT_OK) {
                result.data?.data?.let { arrayOf(it) }
                    ?: result.data?.clipData?.let { clipData ->
                        Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                    }
            } else null
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // Runtime permissions granted or denied
    }

    inner class AndroidBiometricInterface {
        @JavascriptInterface
        fun isAvailable(): Boolean {
            val biometricManager = BiometricManager.from(this@MainActivity)
            val canAuth = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            return canAuth == BiometricManager.BIOMETRIC_SUCCESS
        }

        @JavascriptInterface
        fun authenticate(title: String?, subtitle: String?) {
            runOnUiThread {
                showBiometricPrompt(title, subtitle)
            }
        }
    }

    private fun showBiometricPrompt(title: String?, subtitle: String?) {
        val executor: Executor = ContextCompat.getMainExecutor(this)
        val promptTitle = if (title.isNullOrBlank()) "Authentication" else title
        val promptSubtitle = if (subtitle.isNullOrBlank()) "" else subtitle

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(promptTitle)
            .setSubtitle(promptSubtitle)
            .setNegativeButtonText("Cancel")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .build()

        val biometricPrompt = BiometricPrompt(this, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                sendBiometricResult(true, null)
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                sendBiometricResult(false, errString.toString())
            }

            override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
            }
        })

        try {
            biometricPrompt.authenticate(promptInfo)
        } catch (e: Exception) {
            sendBiometricResult(false, e.localizedMessage ?: "Biometric authentication failed")
        }
    }

    private fun sendBiometricResult(success: Boolean, errorMessage: String?) {
        val js = if (success) {
            "if (typeof window.onBiometricResult === 'function') { window.onBiometricResult(true, null); }"
        } else {
            val safeMsg = org.json.JSONObject.quote(errorMessage ?: "Authentication failed")
            "if (typeof window.onBiometricResult === 'function') { window.onBiometricResult(false, $safeMsg); }"
        }
        webView.post {
            webView.evaluateJavascript(js, null)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
${fullscreenKotlin}
        webView = findViewById(R.id.webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        // Expose native biometric interface to JavaScript
        webView.addJavascriptInterface(AndroidBiometricInterface(), "AndroidBiometric")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url.toString()
                return if (url.startsWith("https://appassets.androidplatform.net/assets/")) {
                    false
                } else {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, request.url)
                        startActivity(intent)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                    true
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                try {
                    fileChooserLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }

        // Back button goes back in WebView history
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        checkAndRequestPermissions()

        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    private fun checkAndRequestPermissions() {
        val permissionsToRequest = mutableListOf<String>()
        ${runtimePermissionChecks.join('\n        ')}
        if (permissionsToRequest.isNotEmpty()) {
            requestPermissionLauncher.launch(permissionsToRequest.toTypedArray())
        }
    }
}
`,
  });

  // 10. Layout: app/src/main/res/layout/activity_main.xml
  files.push({
    path: 'app/src/main/res/layout/activity_main.xml',
    encoding: 'utf-8',
    content: `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

</FrameLayout>
`,
  });

  // 11. Strings: app/src/main/res/values/strings.xml
  files.push({
    path: 'app/src/main/res/values/strings.xml',
    encoding: 'utf-8',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${escapeXml(settings.appName)}</string>
</resources>
`,
  });

  // 12. Themes: app/src/main/res/values/themes.xml
  const fullscreenThemeItem = settings.fullscreen
    ? '\n        <item name="android:windowFullscreen">true</item>'
    : '';

  files.push({
    path: 'app/src/main/res/values/themes.xml',
    encoding: 'utf-8',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.App" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="colorPrimary">${settings.themeColor || '#2563EB'}</item>
        <item name="android:statusBarColor">${settings.themeColor || '#2563EB'}</item>
        <item name="android:navigationBarColor">${settings.themeColor || '#2563EB'}</item>${fullscreenThemeItem}
    </style>
</resources>
`,
  });

  // 13. Launcher Icons for all densities
  files.push({
    path: 'app/src/main/res/mipmap-mdpi/ic_launcher.png',
    encoding: 'base64',
    content: mipmapIcons.mdpi,
  });
  files.push({
    path: 'app/src/main/res/mipmap-hdpi/ic_launcher.png',
    encoding: 'base64',
    content: mipmapIcons.hdpi,
  });
  files.push({
    path: 'app/src/main/res/mipmap-xhdpi/ic_launcher.png',
    encoding: 'base64',
    content: mipmapIcons.xhdpi,
  });
  files.push({
    path: 'app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
    encoding: 'base64',
    content: mipmapIcons.xxhdpi,
  });
  files.push({
    path: 'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
    encoding: 'base64',
    content: mipmapIcons.xxxhdpi,
  });

  // 14. HTML file: app/src/main/assets/index.html
  files.push({
    path: 'app/src/main/assets/index.html',
    encoding: 'utf-8',
    content: htmlContent,
  });

  // 15. Extra uploaded assets (if zip was provided)
  for (const asset of extraAssets) {
    if (asset.isBinary && asset.content instanceof Uint8Array) {
      files.push({
        path: `app/src/main/assets/${asset.path}`,
        encoding: 'base64',
        content: uint8ArrayToBase64(asset.content),
      });
    } else {
      files.push({
        path: `app/src/main/assets/${asset.path}`,
        encoding: 'utf-8',
        content: typeof asset.content === 'string' ? asset.content : '',
      });
    }
  }

  // 16. .gitignore for Android repo
  files.push({
    path: '.gitignore',
    encoding: 'utf-8',
    content: `*.iml
.gradle
/local.properties
/.idea/
.DS_Store
/build
/captures
.externalNativeBuild
.cxx
local.properties
`,
  });

  // 17. GitHub Actions Workflow: .github/workflows/build-apk.yml
  // STRICT REQUIREMENT: Exact content requested by the prompt
  files.push({
    path: '.github/workflows/build-apk.yml',
    encoding: 'utf-8',
    content: `name: Build Android APK
on:
  push:
    branches: [ main ]
  workflow_dispatch:
permissions:
  contents: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: 8.7
      - name: Build debug APK
        run: gradle assembleDebug --stacktrace --no-daemon
      - name: Locate APK
        id: locate
        run: echo "apk=$(find app/build/outputs/apk/debug -name '*.apk' | head -n 1)" >> "$GITHUB_OUTPUT"
      - name: Create release and upload APK
        uses: softprops/action-gh-release@v2
        with:
          tag_name: build-\${{ github.run_number }}
          name: "Build #\${{ github.run_number }}"
          files: \${{ steps.locate.outputs.apk }}
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`,
  });

  return files;
}
