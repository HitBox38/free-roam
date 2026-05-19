import { SenderError } from 'spacetimedb/server';

export type ActivityHistoryAction =
  | 'created'
  | 'updated_name'
  | 'updated_description'
  | 'updated_location'
  | 'updated_date'
  | 'updated_time'
  | 'updated_order'
  | 'added_label'
  | 'removed_label'
  | 'commented'
  | 'deleted'
  | 'restored';

export type TypingTargetType = 'activity' | 'comment' | 'trip';

export type ActivityFieldSnapshot = {
  name: string;
  description: string | undefined;
  locationName: string | undefined;
  address: string | undefined;
  lat: number | undefined;
  lng: number | undefined;
  locationProvider: string | undefined;
  providerPlaceId: string | undefined;
  externalUrl: string | undefined;
  date: string | undefined;
  timeType: 'none' | 'exact' | 'ordered';
  time: string | undefined;
  order: number | undefined;
};

export type ActivityFieldDiff = {
  action: ActivityHistoryAction;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export function parseActivityHistoryAction(value: string): ActivityHistoryAction {
  switch (value) {
    case 'created':
    case 'updated_name':
    case 'updated_description':
    case 'updated_location':
    case 'updated_date':
    case 'updated_time':
    case 'updated_order':
    case 'added_label':
    case 'removed_label':
    case 'commented':
    case 'deleted':
    case 'restored':
      return value;
    default:
      throw new SenderError('Invalid activity history action');
  }
}

export function parseHistoryAction(value: string): ActivityHistoryAction {
  return parseActivityHistoryAction(value);
}

export function parseTargetType(value: string): TypingTargetType {
  switch (value) {
    case 'activity':
    case 'comment':
    case 'trip':
      return value;
    default:
      throw new SenderError('Invalid typing target type');
  }
}

export function validateLatLng(lat: number, lng: number) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new SenderError('Latitude must be between -90 and 90');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new SenderError('Longitude must be between -180 and 180');
  }
}

export function validateColor(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new SenderError('Color is required');
  }
  if (trimmed.length > 16) {
    throw new SenderError('Color is too long');
  }
  return trimmed;
}

export function stringifySafe(value: unknown): string {
  return JSON.stringify(value, (_key, currentValue) => {
    if (typeof currentValue === 'bigint') {
      return currentValue.toString();
    }
    return currentValue;
  });
}

export function diffActivityFields(
  before: ActivityFieldSnapshot,
  after: ActivityFieldSnapshot
): Array<ActivityFieldDiff> {
  const diffs: Array<ActivityFieldDiff> = [];

  appendFieldDiff(diffs, before, after, 'updated_name', ['name']);
  appendFieldDiff(diffs, before, after, 'updated_description', ['description']);
  appendFieldDiff(diffs, before, after, 'updated_location', [
    'locationName',
    'address',
    'lat',
    'lng',
    'locationProvider',
    'providerPlaceId',
    'externalUrl',
  ]);
  appendFieldDiff(diffs, before, after, 'updated_date', ['date']);
  appendFieldDiff(diffs, before, after, 'updated_time', ['timeType', 'time']);
  appendFieldDiff(diffs, before, after, 'updated_order', ['order']);

  return diffs;
}

function appendFieldDiff<TField extends keyof ActivityFieldSnapshot>(
  diffs: Array<ActivityFieldDiff>,
  before: ActivityFieldSnapshot,
  after: ActivityFieldSnapshot,
  action: ActivityHistoryAction,
  fields: ReadonlyArray<TField>
) {
  const beforeData: Record<string, unknown> = {};
  const afterData: Record<string, unknown> = {};
  let changed = false;

  for (const field of fields) {
    if (before[field] !== after[field]) {
      changed = true;
      beforeData[field as string] = before[field];
      afterData[field as string] = after[field];
    }
  }

  if (!changed) {
    return;
  }

  diffs.push({
    action,
    before: beforeData,
    after: afterData,
  });
}
