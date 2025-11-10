type JourneyEventPayload = {
  event: string;
  phase?: string;
  durationMs?: number;
  success?: boolean;
  metadata?: Record<string, unknown>;
};

function postEvent(body: JourneyEventPayload) {
  try {
    const json = JSON.stringify(body);
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([json], { type: 'application/json' });
      navigator.sendBeacon('/api/telemetry/event', blob);
      return;
    }

    void fetch('/api/telemetry/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
    });
  } catch {
    // Never throw from telemetry helper
  }
}

export function trackJourneyEvent(
  event: string,
  options: {
    phase?: string;
    durationMs?: number;
    success?: boolean;
    metadata?: Record<string, unknown>;
  } = {},
) {
  postEvent({
    event,
    phase: options.phase,
    durationMs: options.durationMs,
    success: options.success,
    metadata: options.metadata,
  });
}

export function trackLatency(
  event: string,
  durationMs: number,
  success: boolean,
  metadata?: Record<string, unknown>,
) {
  trackJourneyEvent(event, {
    durationMs,
    success,
    metadata,
  });
}

