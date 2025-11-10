import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  processActionLogs,
  type ActionLog,
  type MitigationEventInput,
  type AlertPayload,
} from '@/lib/monitoring/action-log-processor';

const baseTimestamp = new Date('2025-01-01T10:00:00Z').getTime();

type LogOverrides = Partial<ActionLog> & { offsetMs?: number };

const randomId = () => `log-${Math.random().toString(36).slice(2, 10)}`;

const createLog = ({
  offsetMs = 0,
  ...overrides
}: LogOverrides): ActionLog => ({
  id: overrides.id ?? randomId(),
  action: overrides.action ?? 'proxy.healthcheck',
  status: overrides.status ?? 'failure',
  severity: overrides.severity ?? 'high',
  errorCode: overrides.errorCode ?? 'PROXY_TIMEOUT',
  message: overrides.message ?? 'Proxy tunnel timed out',
  timestamp:
    overrides.timestamp ??
    new Date(baseTimestamp + offsetMs).toISOString(),
  metadata: overrides.metadata ?? {},
});

test('processActionLogs creates mitigation event and Slack alert for repeated failures', async () => {
  const mitigationEvents: MitigationEventInput[] = [];
  const alerts: AlertPayload[] = [];

  const logs: ActionLog[] = [
    createLog({
      id: 'log-1',
      offsetMs: 0,
    }),
    createLog({
      id: 'log-2',
      offsetMs: 30_000,
    }),
    createLog({
      id: 'log-3',
      offsetMs: 60_000,
    }),
    createLog({
      id: 'log-4',
      status: 'success',
      offsetMs: 90_000,
    }),
  ];

  await processActionLogs(
    logs,
    {
      createMitigationEvent: async (event) => {
        mitigationEvents.push(event);
      },
      sendAlert: async (payload) => {
        alerts.push(payload);
      },
    },
    {
      threshold: 3,
      groupWindowMinutes: 5,
      slackChannel: '#qa-alerts',
    },
  );

  assert.equal(mitigationEvents.length, 1, 'should create one mitigation event');
  const event = mitigationEvents[0];
  assert.equal(event.action, 'proxy.healthcheck');
  assert.equal(event.occurrences, 3);
  assert.equal(event.severity, 'high');
  assert.ok(
    event.sampleLogIds.includes('log-1') &&
      event.sampleLogIds.includes('log-2') &&
      event.sampleLogIds.includes('log-3'),
  );

  assert.equal(alerts.length, 1, 'should send one Slack alert');
  const alert = alerts[0];
  assert.equal(alert.channel, '#qa-alerts');
  assert.ok(
    alert.text.includes('Mitigation triggered') &&
      alert.text.includes('proxy.healthcheck'),
  );
});

test('processActionLogs ignores failures below threshold', async () => {
  const mitigationEvents: MitigationEventInput[] = [];
  const alerts: AlertPayload[] = [];

  const logs: ActionLog[] = [
    createLog({
      id: 'log-1',
      offsetMs: 0,
    }),
    createLog({
      id: 'log-2',
      offsetMs: 30_000,
    }),
  ];

  await processActionLogs(
    logs,
    {
      createMitigationEvent: async (event) => {
        mitigationEvents.push(event);
      },
      sendAlert: async (payload) => {
        alerts.push(payload);
      },
    },
    {
      threshold: 3,
      groupWindowMinutes: 5,
    },
  );

  assert.equal(mitigationEvents.length, 0, 'no mitigation event expected');
  assert.equal(alerts.length, 0, 'no alerts expected');
});

