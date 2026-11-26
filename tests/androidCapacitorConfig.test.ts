import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseAppDeepLink } from '../src/lib/capacitorBridge';

const rootDir = resolve(__dirname, '..');

function readText(relativePath: string): string {
  return readFileSync(resolve(rootDir, relativePath), 'utf8');
}

describe('Capacitor Android configuration & deep linking', () => {
  it('uses matching Capacitor 8 dependencies in package.json', () => {
    const pkg = JSON.parse(readText('package.json')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(pkg.dependencies['@capacitor/core']).toMatch(/^\^?8\./);
    expect(pkg.dependencies['@capacitor/android']).toMatch(/^\^?8\./);
    expect(pkg.devDependencies['@capacitor/cli']).toMatch(/^\^?8\./);
  });

  it('configures capacitor.config.ts for local bundled dist without default server.url', () => {
    const capConfig = readText('capacitor.config.ts');

    expect(capConfig).toContain("appId: 'com.rassa.dastbedast'");
    expect(capConfig).toContain("appName: 'دست‌به‌دست'");
    expect(capConfig).toContain("webDir: 'dist'");
    expect(capConfig).toContain("androidScheme: 'https'");
    expect(capConfig).not.toMatch(/\burl\s*:\s*['"]https?:\/\//);
  });

  it('targets Android 7.0+ (minSdkVersion = 24) while preserving modern targetSdkVersion', () => {
    const varsGradle = readText('android/variables.gradle');
    const appGradle = readText('android/app/build.gradle');

    expect(varsGradle).toMatch(/minSdkVersion\s*=\s*24\b/);
    const targetMatch = varsGradle.match(/targetSdkVersion\s*=\s*(\d+)/);
    expect(targetMatch).not.toBeNull();
    expect(Number(targetMatch?.[1])).toBeGreaterThanOrEqual(35);

    expect(appGradle).toContain('applicationId "com.rassa.dastbedast"');
    expect(appGradle).toContain('versionCode 1');
    expect(appGradle).toContain('versionName "1.0.0"');
    expect(appGradle).toContain('JavaVersion.VERSION_21');
  });

  it('configures AndroidManifest.xml with RTL, permissions, adjustResize, and auth deep link', () => {
    const manifest = readText('android/app/src/main/AndroidManifest.xml');

    expect(manifest).toContain('android:supportsRtl="true"');
    expect(manifest).toContain('android:windowSoftInputMode="adjustResize"');
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).toContain('android.permission.INTERNET');
    expect(manifest).toContain('android.permission.ACCESS_NETWORK_STATE');
    expect(manifest).toContain('@string/custom_url_scheme');
  });

  it('contains branded PNG launcher icons and splash screens across Android densities', () => {
    const requiredAssets = [
      'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
      'android/app/src/main/res/mipmap-hdpi/ic_launcher.png',
      'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png',
      'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
      'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
      'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png',
      'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
      'android/app/src/main/res/drawable/splash_icon.png',
      'android/app/src/main/res/drawable/splash.png',
      'android/app/src/main/res/drawable-port-xxxhdpi/splash.png',
      'android/app/src/main/res/drawable-land-xxxhdpi/splash.png',
    ];

    for (const relPath of requiredAssets) {
      expect(existsSync(resolve(rootDir, relPath)), `${relPath} should exist`).toBe(true);
    }
    expect(existsSync(resolve(rootDir, 'android/app/src/main/res/drawable/ic_launcher_background.xml'))).toBe(false);
    expect(existsSync(resolve(rootDir, 'android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml'))).toBe(false);
  });

  it('includes Android GitHub Actions workflow and Android documentation', () => {
    const workflow = readText('.github/workflows/build-android-apk.yml');
    const readme = readText('README-ANDROID.md');

    expect(workflow).toContain('./gradlew --no-daemon assembleDebug');
    expect(workflow).toContain('DastBeDast-v1.0.0-debug.apk');
    expect(workflow).toContain('ANDROID_KEYSTORE_BASE64');
    expect(readme).toContain('com.rassa.dastbedast');
    expect(readme).toContain('ANDROID_KEYSTORE_BASE64');
  });

  it('parses Supabase auth recovery and PKCE deep links cleanly', () => {
    const recovery = parseAppDeepLink(
      'com.rassa.dastbedast://auth/reset-password#access_token=acc123&refresh_token=ref456&type=recovery'
    );
    expect(recovery).toEqual({
      routePath: '/auth/reset-password',
      code: null,
      accessToken: 'acc123',
      refreshToken: 'ref456',
      type: 'recovery',
    });

    const pkce = parseAppDeepLink('com.rassa.dastbedast://auth/login?code=pkce-xyz');
    expect(pkce).toEqual({
      routePath: '/auth/login',
      code: 'pkce-xyz',
      accessToken: null,
      refreshToken: null,
      type: null,
    });

    expect(parseAppDeepLink('https://example.com/auth/login')).toBeNull();
  });
});
