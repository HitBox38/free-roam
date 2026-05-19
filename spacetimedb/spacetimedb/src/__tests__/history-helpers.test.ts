import { describe, expect, it } from 'vitest';

import {
  diffActivityFields,
  parseHistoryAction,
  parseTargetType,
  stringifySafe,
  validateColor,
  validateLatLng,
} from '../index';

const baseActivity = {
  name: 'Louvre Museum',
  description: 'Morning visit',
  locationName: 'Louvre',
  address: 'Rue de Rivoli',
  lat: 48.8606,
  lng: 2.3376,
  locationProvider: 'manual',
  providerPlaceId: undefined,
  externalUrl: undefined,
  date: '2026-05-20',
  timeType: 'exact' as const,
  time: '09:00',
  order: 1,
};

describe('parseHistoryAction', () => {
  it('accepts every supported action', () => {
    const actions = [
      'created',
      'updated_name',
      'updated_description',
      'updated_location',
      'updated_date',
      'updated_time',
      'updated_order',
      'added_label',
      'removed_label',
      'commented',
      'deleted',
      'restored',
    ] as const;

    for (const action of actions) {
      expect(parseHistoryAction(action)).toBe(action);
    }
  });

  it('rejects unknown actions', () => {
    expect(() => parseHistoryAction('updated_everything')).toThrow(
      'Invalid activity history action'
    );
  });
});

describe('parseTargetType', () => {
  it('accepts valid target types', () => {
    expect(parseTargetType('activity')).toBe('activity');
    expect(parseTargetType('comment')).toBe('comment');
    expect(parseTargetType('trip')).toBe('trip');
  });

  it('rejects unknown target types', () => {
    expect(() => parseTargetType('thread')).toThrow('Invalid typing target type');
  });
});

describe('validateLatLng', () => {
  it('accepts valid coordinates', () => {
    expect(() => validateLatLng(0, 0)).not.toThrow();
    expect(() => validateLatLng(-90, -180)).not.toThrow();
    expect(() => validateLatLng(90, 180)).not.toThrow();
  });

  it('rejects out-of-range coordinates', () => {
    expect(() => validateLatLng(-91, 0)).toThrow('Latitude must be between -90 and 90');
    expect(() => validateLatLng(0, 181)).toThrow(
      'Longitude must be between -180 and 180'
    );
  });
});

describe('validateColor', () => {
  it('accepts non-empty values up to 16 chars', () => {
    expect(validateColor('#7c3aed')).toBe('#7c3aed');
    expect(validateColor('1234567890abcdef')).toBe('1234567890abcdef');
  });

  it('rejects empty or too-long values', () => {
    expect(() => validateColor('')).toThrow('Color is required');
    expect(() => validateColor('1234567890abcdefX')).toThrow('Color is too long');
  });
});

describe('stringifySafe', () => {
  it('serializes bigint values as strings', () => {
    const json = stringifySafe({
      commentId: 42n,
      nested: { parentCommentId: 7n },
    });

    expect(JSON.parse(json)).toEqual({
      commentId: '42',
      nested: { parentCommentId: '7' },
    });
  });
});

describe('diffActivityFields', () => {
  it('returns grouped field actions for changed fields', () => {
    const after = {
      ...baseActivity,
      name: "Musee d'Orsay",
      description: 'Afternoon visit',
      locationName: 'Orsay',
      lat: 48.860,
      date: '2026-05-21',
      timeType: 'ordered' as const,
      time: undefined,
      order: 3,
    };

    const diffs = diffActivityFields(baseActivity, after);

    expect(diffs.map((diff) => diff.action)).toEqual([
      'updated_name',
      'updated_description',
      'updated_location',
      'updated_date',
      'updated_time',
      'updated_order',
    ]);
  });

  it('returns no entries when fields are unchanged', () => {
    expect(diffActivityFields(baseActivity, { ...baseActivity })).toEqual([]);
  });
});
