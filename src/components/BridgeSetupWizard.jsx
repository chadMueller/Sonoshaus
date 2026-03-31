import { useState, useEffect } from 'react';
import {
  getEffectiveBridgeBaseUrl,
  setBridgeBaseUrlOverride,
  clearBridgeBaseUrlOverride,
} from '../api/sonos.js';
import './bridge-setup.css';

/**
 * Shown when the Sonos bridge (node-sonos-http-api) is not reachable.
 * In Electron, `window.sonohaus.openBridgeInstaller()` runs the bundled installer.
 */
export function BridgeSetupWizard({
  loading,
  errorMessage,
  onRetry,
}) {
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState(null);
  const [installerHint, setInstallerHint] = useState(null);

  useEffect(() => {
    try {
      setUrlInput(getEffectiveBridgeBaseUrl());
    } catch {
      setUrlInput('http://localhost:5005');
    }
  }, []);

  const handleApplyUrl = () => {
    setUrlError(null);
    try {
      setBridgeBaseUrlOverride(urlInput);
      onRetry?.();
    } catch (e) {
      setUrlError(e?.message || 'Invalid URL');
    }
  };

  const handleClearOverride = () => {
    setUrlError(null);
    clearBridgeBaseUrlOverride();
    try {
      setUrlInput(getEffectiveBridgeBaseUrl());
    } catch {
      setUrlInput('http://localhost:5005');
    }
    onRetry?.();
  };

  const handleOpenInstaller = async () => {
    setInstallerHint(null);
    if (typeof window !== 'undefined' && window.sonohaus?.openBridgeInstaller) {
      try {
        const result = await window.sonohaus.openBridgeInstaller();
        if (result?.ok === false && result?.message) {
          setInstallerHint(result.message);
        } else {
          setInstallerHint(
            'After the installer finishes, wait a few seconds and tap “Try again”.',
          );
        }
      } catch (e) {
        setInstallerHint(e?.message || 'Could not start the installer.');
      }
    } else {
      setInstallerHint(
        'Install the bridge: in the Sonohaus project, double-click scripts/install-bridge.command (or clone the repo and run it). Web preview cannot launch the installer automatically.',
      );
    }
  };

  return (
    <div className="bridge-setup">
      <div className="bridge-setup__panel">
        <p className="bridge-setup__eyebrow">Sonohaus</p>
        <h1 className="bridge-setup__title">Connect the Sonos bridge</h1>
        <p className="bridge-setup__lede">
          This app talks to your speakers through a small background service on port{' '}
          <strong>5005</strong>. It isn’t running on this Mac yet, or the URL below is wrong.
        </p>

        {loading ? (
          <div className="bridge-setup__status bridge-setup__status--loading" role="status">
            <span className="bridge-setup__spinner" aria-hidden="true" />
            Looking for the bridge…
          </div>
        ) : (
          <div className="bridge-setup__status bridge-setup__status--error" role="alert">
            {errorMessage || 'Sonos bridge is not reachable.'}
          </div>
        )}

        <div className="bridge-setup__actions">
          <button
            type="button"
            className="bridge-setup__btn bridge-setup__btn--primary"
            onClick={() => onRetry?.()}
            disabled={loading}
          >
            Try again
          </button>
          <button
            type="button"
            className="bridge-setup__btn bridge-setup__btn--secondary"
            onClick={handleOpenInstaller}
            disabled={loading}
          >
            Install / start bridge
          </button>
        </div>
        {installerHint ? (
          <p className="bridge-setup__hint">{installerHint}</p>
        ) : null}

        <div className="bridge-setup__url-block">
          <label className="bridge-setup__label" htmlFor="bridge-url">
            Bridge URL (same Wi‑Fi as Sonos)
          </label>
          <div className="bridge-setup__url-row">
            <input
              id="bridge-url"
              className="bridge-setup__input"
              type="url"
              autoComplete="off"
              spellCheck="false"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://localhost:5005"
              disabled={loading}
            />
            <button
              type="button"
              className="bridge-setup__btn bridge-setup__btn--small"
              onClick={handleApplyUrl}
              disabled={loading}
            >
              Save &amp; retry
            </button>
          </div>
          {urlError ? <p className="bridge-setup__field-error">{urlError}</p> : null}
          <button
            type="button"
            className="bridge-setup__linkish"
            onClick={handleClearOverride}
            disabled={loading}
          >
            Use default from app build (clear saved URL)
          </button>
        </div>

        <details className="bridge-setup__details">
          <summary>Troubleshooting</summary>
          <ul className="bridge-setup__list">
            <li>
              The installer needs <strong>Node.js</strong> from{' '}
              <a href="https://nodejs.org" target="_blank" rel="noreferrer">
                nodejs.org
              </a>
              .
            </li>
            <li>
              Logs:{' '}
              <code>~/Library/Logs/Sonohaus/bridge.err.log</code>
            </li>
            <li>
              If the bridge runs on another computer (e.g. a Mac mini), set Bridge URL to{' '}
              <code>http://&lt;that-machine&gt;:5005</code>.
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}
