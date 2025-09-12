import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IonPage, IonContent, IonButton, IonIcon, useIonRouter, IonHeader, IonToolbar, IonFooter, IonButtons, IonCard, IonCardContent, useIonViewDidLeave } from '@ionic/react';
import type { PluginListenerHandle } from '@capacitor/core';
import { settingsOutline, flashOutline, flashOffOutline, imagesOutline, qrCodeOutline } from 'ionicons/icons';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { App as CapacitorApp } from '@capacitor/app';
import './ScanQr.css';
import FullScreenDots from '../components/FullScreenDots';
import { setApiBaseUrl } from '../api/httpClient';

type ViewState = 'idle' | 'scanning' | 'blocked' | 'error';

const SUCCESS_DELAY_MS = 0; // kept for reference; success screen removed
const FILTER_TO_FRAME = false; // set true when we map cornerPoints to viewport accurately

const ScanQR: React.FC = () => {
  const router = useIonRouter();
  const [state, setState] = useState<ViewState>('idle');
  const [torchOn, setTorchOn] = useState(false);
  const [message, setMessage] = useState<string>('');
  const listenerRef = useRef<PluginListenerHandle | null>(null);
  const startingRef = useRef(false);
  const scanningRef = useRef(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [showDots, setShowDots] = useState(false);

  const cleanupScan = useCallback(async () => {
    try {
      if (listenerRef.current) {
        await listenerRef.current.remove();
        listenerRef.current = null;
      }
      await BarcodeScanner.stopScan();
    } catch {
      // ignore
    }
    scanningRef.current = false;
  }, []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const { camera } = await BarcodeScanner.checkPermissions();
    if (camera === 'granted') return true;
    const req = await BarcodeScanner.requestPermissions();
    return req.camera === 'granted';
  }, []);

  const isInsideFrame = (cornerPoints?: [number, number][]) => {
    if (!FILTER_TO_FRAME) return true;
    if (!cornerPoints || cornerPoints.length !== 4) return true; // accept when points missing
    const el = frameRef.current;
    if (!el) return true;
    const rect = el.getBoundingClientRect();
    // Try both pixel space and normalized [0..1] space; accept if either matches.
    const pxInside = cornerPoints.every(([x, y]) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
    if (pxInside) return true;
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const normRect = { left: rect.left / vw, right: rect.right / vw, top: rect.top / vh, bottom: rect.bottom / vh };
    const normInside = cornerPoints.every(([x, y]) => x >= normRect.left && x <= normRect.right && y >= normRect.top && y <= normRect.bottom);
    return normInside;
  };

  const startScanning = useCallback(async () => {
    if (startingRef.current || scanningRef.current) return;
    startingRef.current = true;
    setMessage('');
    const ok = await ensurePermission();
    if (!ok) {
      setState('blocked');
      startingRef.current = false;
      return;
    }

  setState('scanning');
  // Make webview transparent so native camera is visible behind
  document.documentElement.classList.add('barcode-scanner-active');
  document.body.classList.add('barcode-scanner-active');
    scanningRef.current = true;

    try {
      if (!listenerRef.current) {
        listenerRef.current = await BarcodeScanner.addListener('barcodesScanned', async (evt: any) => {
        const first = evt?.barcodes?.[0];
        if (!first) return;
        if (!isInsideFrame(first.cornerPoints as any)) return;
          // Stop scanning fast to avoid duplicate events; don't await to reduce races
          BarcodeScanner.stopScan().catch(() => {});
          listenerRef.current?.remove().catch(() => {});
          listenerRef.current = null;
          scanningRef.current = false;
          document.documentElement.classList.remove('barcode-scanner-active');
          document.body.classList.remove('barcode-scanner-active');
          // Restore non-transparent UI before overlay/navigation to avoid Android header sweep
          setState('idle');
          // Ensure the toolbar re-renders with opaque background before showing overlay
          await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          const raw = first.rawValue || first.displayValue || '';
          setMessage(raw);
          // If QR contains a URL, persist it immediately
          try {
            const maybeUrl = raw.trim();
            if (/^https?:\/\//i.test(maybeUrl)) {
              setApiBaseUrl(maybeUrl.replace(/\/$/, ''));
            }
          } catch {}
          // Now show white overlay and navigate
          try { localStorage.setItem('showLoginWelcomeToasts', JSON.stringify({ v: 1, ts: Date.now() })); } catch {}
          setShowDots(true);
          window.setTimeout(() => {
            router.push('/login', 'forward');
          }, 800);
        });
        // Also listen for scan errors to gracefully recover
        await BarcodeScanner.addListener('scanError', () => {
          scanningRef.current = false;
          setState('error');
          document.documentElement.classList.remove('barcode-scanner-active');
          document.body.classList.remove('barcode-scanner-active');
        });
      }

      await BarcodeScanner.startScan();
    } catch (e) {
      console.error(e);
      setState('error');
    } finally {
      startingRef.current = false;
    }
  }, [cleanupScan, ensurePermission, router]);

  useEffect(() => {
    // Handle Android hardware back to exit scanning if active
    let sub: PluginListenerHandle | undefined;
    (async () => {
      sub = await CapacitorApp.addListener('backButton', async () => {
        if (scanningRef.current) {
          await stopToIdle();
        }
      });
    })();
    return () => {
      sub?.remove();
    };
  }, []);

  useIonViewDidLeave(() => {
    // Guarantee cleanup when navigating away (e.g., system back)
  document.documentElement.classList.remove('barcode-scanner-active');
  document.body.classList.remove('barcode-scanner-active');
    cleanupScan();
    setState('idle');
    setShowDots(false);
  });

  const stopToIdle = async () => {
    await cleanupScan();
    setState('idle');
  document.documentElement.classList.remove('barcode-scanner-active');
  document.body.classList.remove('barcode-scanner-active');
  };

  const toggleTorch = async () => {
    try {
      if (torchOn) await BarcodeScanner.disableTorch();
      else await BarcodeScanner.enableTorch();
      setTorchOn(!torchOn);
    } catch {
      // ignore
    }
  };

  const pickFromPhotos = async () => {
    try {
      const photo = await Camera.getPhoto({
        source: CameraSource.Photos,
        resultType: CameraResultType.Uri,
        quality: 100,
      });

      let path: string | undefined = (photo as any).path; // native file path when available (Android)

      if (!path && photo.webPath) {
        // Persist the image to cache and obtain a native file URL
        const resp = await fetch(photo.webPath);
        const blob = await resp.blob();
        const reader = new FileReader();
  const dataUrl: string = await new Promise((resolve, reject) => {
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
  const base64 = dataUrl.split(',')[1] ?? dataUrl; // strip data URL prefix if present
        const fileName = `qr-${Date.now()}.jpg`;
        const write = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        // Prefer native file URL if available
        const uri = write.uri;
        // On iOS, ML Kit expects a file path without the file:// prefix; on Android content:// or file:// work.
        path = uri?.replace('file://', '') || uri;
      }

      if (!path) {
        console.warn('No image path available for barcode decoding');
        return;
      }

      const result = await BarcodeScanner.readBarcodesFromImage({
        path,
        formats: [BarcodeFormat.QrCode],
      });
      const first = result?.barcodes?.[0];
      if (first) {
        const raw = first.rawValue || first.displayValue || '';
        setMessage(raw);
        try {
          const maybeUrl = raw.trim();
          if (/^https?:\/\//i.test(maybeUrl)) {
            setApiBaseUrl(maybeUrl.replace(/\/$/, ''));
          }
        } catch {}
  try { localStorage.setItem('showLoginWelcomeToasts', JSON.stringify({ v: 1, ts: Date.now() })); } catch {}
  setShowDots(true);
        window.setTimeout(() => {
          router.push('/login', 'forward');
        }, 1500);
      } else {
        // optional: brief feedback? for now, stay idle
        console.warn('No QR code detected in selected image');
      }
    } catch (err) {
      // User canceled or failed to decode; stay idle
      console.warn('Photo selection/decoding failed', err);
    }
  };

  return (
    <IonPage className={`scanqr-page ${state === 'scanning' ? 'scanning' : ''}`}>
      <IonHeader>
        <IonToolbar style={{ '--background': state === 'scanning' ? 'transparent' : 'var(--app-header-footer-bg)', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
          <IonButtons slot="start">
            <div className="toolbar-title">Connect your app</div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
  <IonContent fullscreen className={`scanqr-content ${state === 'scanning' ? 'scanning' : ''}`} style={{ '--background': state === 'scanning' ? 'transparent' : 'var(--app-bg)' } as any}>
        {/* Idle view */}
  {state === 'idle' && (
          <div className="idle-wrap">
            <div className="idle-center">
              <div className="helper-block">
                <p className="helper-lead">Have a QR code? Scan it now.</p>
                <p className="helper">Alternatively, select one from your photos or manually set up your connection.</p>
              </div>
              <IonCard className="qr-card" aria-hidden="true">
                <IonCardContent className="qr-card-content">
                  <img src="/assets/qrcode.svg" alt="QR code illustration" className="qr-svg" />
                </IonCardContent>
              </IonCard>
              <div className="idle-actions">
                <div className="action-item" role="button" aria-label="Select from Photos" onClick={pickFromPhotos}>
                  <IonButton fill="clear" className="icon-btn" aria-hidden="true">
                    <IonIcon icon={imagesOutline} />
                  </IonButton>
                  <span className="action-label">Select from Photos</span>
                </div>
                <div className="action-item" role="button" aria-label="Manual set-up" onClick={() => router.push('/settings', 'forward')}>
                  <IonButton fill="clear" className="icon-btn" aria-hidden="true">
                    <IonIcon icon={settingsOutline} />
                  </IonButton>
                  <span className="action-label">Manual set-up</span>
                </div>
              </div>
            </div>
            {/* footer button moved to IonFooter to stay consistent across devices */}
          </div>
        )}

        {/* Scanning overlay (camera is behind the webview) */}
    {state === 'scanning' && (
          <div className="scan-overlay">
            <div className="crop-frame" ref={frameRef} />
      <div className="controls">
              <IonButton fill="clear" className="icon-btn" onClick={toggleTorch} aria-label="Toggle torch">
                <IonIcon icon={torchOn ? flashOffOutline : flashOutline} />
              </IonButton>
            </div>
  <p className="status">Scanning code…</p>
          </div>
        )}

  {/* White dots overlay during handoff */}
  <FullScreenDots show={showDots} ariaLabel="Continuing" />

        {/* Error / Blocked minimal messages */}
        {state === 'blocked' && (
          <div className="center-msg">
            <p>Camera permission blocked. Please enable it in Settings.</p>
            <IonButton onClick={() => BarcodeScanner.openSettings()}>Open Settings</IonButton>
          </div>
        )}
        {state === 'error' && (
          <div className="center-msg">
            <p>Scanner error. Try again.</p>
            <IonButton onClick={() => setState('idle')}>Back</IonButton>
          </div>
        )}
      </IonContent>
  {!showDots && (
        <IonFooter>
          <IonToolbar style={{ '--background': state !== 'scanning' ? 'var(--app-header-footer-bg)' : 'transparent', '--color': 'var(--app-header-footer-color)', '--border-width': '0' } as any}>
            {state !== 'scanning' ? (
              <div className="welcome-footer">
                <IonButton expand="block" color="primary" className="start-btn" onClick={startScanning} aria-label="Start scan">
                  Scan
                </IonButton>
              </div>
            ) : (
              <div className="welcome-footer">
                <IonButton expand="block" color="danger" className="cancel-btn" onClick={stopToIdle} aria-label="Cancel scan">
                  Cancel
                </IonButton>
              </div>
            )}
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
};

export default ScanQR;

// Settings bottom sheet modal
// Place after export default to keep component body clean
// This will render within the same React tree
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _SettingsSheetPortal: React.FC = () => null;
