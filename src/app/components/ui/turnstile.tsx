import { useEffect, useRef } from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  siteKey?: string;
}

export function Turnstile({ onVerify, onExpire, siteKey }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Store callbacks in refs so the widget never needs to be re-mounted when
  // the parent re-renders and passes new inline function references.
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onVerifyRef.current = onVerify; }, [onVerify]);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  // Default sitekey for WUEM Sim Intel (Cloudflare managed)
  const defaultSiteKey = '0x4AAAAAAC1gQskkjSorxR2e';

  // Only re-mount the widget when the siteKey changes — NOT when callbacks change.
  useEffect(() => {
    const scriptId = 'cloudflare-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const renderWidget = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey || defaultSiteKey,
          callback: (token: string) => {
            onVerifyRef.current(token);
          },
          'expired-callback': () => {
            onExpireRef.current?.();
          },
          'error-callback': () => {
            onExpireRef.current?.();
          },
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.body.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  return <div ref={containerRef} className="my-4" />;
}

declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, options: any) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}
