export type ActionLog = {
  id: string;
  action: string;
  status: 'success' | 'failure';
  severity: 'low' | 'medium' | 'high';
  errorCode?: string | null;
  message?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type MitigationEventInput = {
  action: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  occurrences: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  sampleLogIds: string[];
  metadata?: Record<string, unknown>;
};

export type AlertPayload = {
  channel?: string;
  text: string;
  blocks?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
};

export type MitigationDependencies = {
  createMitigationEvent: (input: MitigationEventInput) => Promise<void>;
  sendAlert: (payload: AlertPayload) => Promise<void>;
};

export type ProcessorOptions = {
  threshold?: number;
  groupWindowMinutes?: number;
  slackChannel?: string;
};

const severityWeight: Record<ActionLog['severity'], number> = {
  low: 1,
  medium: 5,
  high: 10,
};

function sortByTimestamp(logs: ActionLog[]): ActionLog[] {
  return [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

function getHighestSeverity(logs: ActionLog[]): ActionLog['severity'] {
  return logs.reduce<ActionLog['severity']>(
    (current, candidate) =>
      severityWeight[candidate.severity] > severityWeight[current]
        ? candidate.severity
        : current,
    'low',
  );
}

function isWithinWindow(
  logs: ActionLog[],
  windowMinutes: number | undefined,
): boolean {
  if (!windowMinutes || logs.length === 0) return true;
  const sorted = sortByTimestamp(logs);
  const first = new Date(sorted[0].timestamp).getTime();
  const last = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const diffMinutes = (last - first) / 1000 / 60;
  return diffMinutes <= windowMinutes;
}

export async function processActionLogs(
  logs: ActionLog[],
  deps: MitigationDependencies,
  options: ProcessorOptions = {},
): Promise<MitigationEventInput[]> {
  const threshold = options.threshold ?? 3;
  const windowMinutes = options.groupWindowMinutes ?? 10;
  const slackChannel = options.slackChannel ?? '#alerts-craveverse';

  const failureLogs = logs.filter((log) => log.status === 'failure');
  if (failureLogs.length === 0) {
    return [];
  }

  const groups = new Map<string, ActionLog[]>();

  for (const log of failureLogs) {
    const errorKey = log.errorCode?.toLowerCase() ?? 'unknown';
    const key = `${log.action.toLowerCase()}::${errorKey}`;
    const current = groups.get(key) ?? [];
    current.push(log);
    groups.set(key, current);
  }

  const mitigationEvents: MitigationEventInput[] = [];

  const groupedValues: ActionLog[][] = [];
  groups.forEach((group) => {
    groupedValues.push(group);
  });

  for (let index = 0; index < groupedValues.length; index += 1) {
    const group = groupedValues[index];
    if (group.length < threshold) {
      continue;
    }

    if (!isWithinWindow(group, windowMinutes)) {
      continue;
    }

    const sortedGroup = sortByTimestamp(group);
    const severity = getHighestSeverity(group);
    const firstLog = sortedGroup[0];
    const lastLog = sortedGroup[sortedGroup.length - 1];
    const errorCodes = Array.from(
      new Set(sortedGroup.map((log) => log.errorCode ?? 'unknown')),
    );

    const event: MitigationEventInput = {
      action: firstLog.action,
      issue:
        firstLog.errorCode ??
        firstLog.message ??
        'Unknown failure pattern detected',
      severity,
      occurrences: sortedGroup.length,
      firstOccurredAt: firstLog.timestamp,
      lastOccurredAt: lastLog.timestamp,
      sampleLogIds: sortedGroup.slice(0, 5).map((log) => log.id),
      metadata: {
        errorCodes,
        severity,
        occurrences: sortedGroup.length,
      },
    };

    mitigationEvents.push(event);

    await deps.createMitigationEvent(event);

    const alertText = [
      `🚨 Mitigation triggered for *${event.action}*`,
      `• Severity: *${event.severity.toUpperCase()}*`,
      `• Failures: *${event.occurrences}* in the last ${windowMinutes} min`,
      `• Error codes: ${errorCodes.join(', ')}`,
    ].join('\n');

    await deps.sendAlert({
      channel: slackChannel,
      text: alertText,
      metadata: {
        action: event.action,
        severity: event.severity,
        occurrences: event.occurrences,
        firstOccurredAt: event.firstOccurredAt,
        lastOccurredAt: event.lastOccurredAt,
      },
    });
  }

  return mitigationEvents;
}

