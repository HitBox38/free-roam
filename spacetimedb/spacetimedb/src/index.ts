import { Identity } from 'spacetimedb';
import { SenderError, schema, t, table } from 'spacetimedb/server';
import type { Timestamp } from 'spacetimedb';

const users = table(
  { public: true },
  {
    identity: t.identity().primaryKey(),
    authUserId: t.string().unique(),
    displayName: t.string(),
    email: t.string().optional(),
    imageUrl: t.string().optional(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  }
);

const trips = table(
  {
    public: true,
    indexes: [
      {
        accessor: 'trips_owner_identity',
        algorithm: 'btree',
        columns: ['ownerIdentity'],
      },
    ],
  },
  {
    tripId: t.u64().primaryKey().autoInc(),
    title: t.string(),
    description: t.string().optional(),
    ownerIdentity: t.identity(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    deletedAt: t.timestamp().optional(),
  }
);

const tripMembers = table(
  {
    public: true,
    indexes: [
      {
        accessor: 'trip_members_trip_id',
        algorithm: 'btree',
        columns: ['tripId'],
      },
      {
        accessor: 'trip_members_identity',
        algorithm: 'btree',
        columns: ['identity'],
      },
    ],
  },
  {
    membershipId: t.u64().primaryKey().autoInc(),
    tripId: t.u64(),
    identity: t.identity(),
    role: t.string(),
    createdAt: t.timestamp(),
  }
);

const activities = table(
  {
    public: true,
    indexes: [
      {
        accessor: 'activities_trip_id',
        algorithm: 'btree',
        columns: ['tripId'],
      },
    ],
  },
  {
    activityId: t.u64().primaryKey().autoInc(),
    tripId: t.u64(),
    name: t.string(),
    description: t.string().optional(),
    locationName: t.string().optional(),
    address: t.string().optional(),
    lat: t.f64().optional(),
    lng: t.f64().optional(),
    locationProvider: t.string().optional(),
    providerPlaceId: t.string().optional(),
    externalUrl: t.string().optional(),
    date: t.string().optional(),
    timeType: t.string(),
    time: t.string().optional(),
    order: t.i32().optional(),
    createdBy: t.identity(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    deletedAt: t.timestamp().optional(),
  }
);

const labels = table(
  {
    public: true,
    indexes: [
      {
        accessor: 'labels_trip_id',
        algorithm: 'btree',
        columns: ['tripId'],
      },
    ],
  },
  {
    labelId: t.u64().primaryKey().autoInc(),
    tripId: t.u64(),
    name: t.string(),
    color: t.string(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  }
);

const activityLabels = table(
  {
    public: true,
    indexes: [
      {
        accessor: 'activity_labels_activity_id',
        algorithm: 'btree',
        columns: ['activityId'],
      },
      {
        accessor: 'activity_labels_label_id',
        algorithm: 'btree',
        columns: ['labelId'],
      },
    ],
  },
  {
    activityLabelId: t.u64().primaryKey().autoInc(),
    activityId: t.u64(),
    labelId: t.u64(),
    createdAt: t.timestamp(),
  }
);

const spacetimedb = schema({
  users,
  trips,
  tripMembers,
  activities,
  labels,
  activityLabels,
});

export default spacetimedb;

type Role = 'owner' | 'editor' | 'viewer';
type TimeType = 'none' | 'exact' | 'ordered';

type MemberRow = {
  membershipId: bigint;
  tripId: bigint;
  identity: Identity;
  role: string;
  createdAt: Timestamp;
};

export const ensureUserProfile = spacetimedb.reducer(
  {
    authUserId: t.string(),
    displayName: t.string(),
    email: t.string().optional(),
    imageUrl: t.string().optional(),
  },
  (ctx, { authUserId, displayName, email, imageUrl }) => {
    const cleanAuthUserId = requiredText(authUserId, 'Auth user id', 160);
    const cleanDisplayName = requiredText(displayName, 'Display name', 120);
    const existing = ctx.db.users.identity.find(ctx.sender);

    if (existing) {
      existing.authUserId = cleanAuthUserId;
      existing.displayName = cleanDisplayName;
      existing.email = optionalText(email, 240);
      existing.imageUrl = optionalText(imageUrl, 1_000);
      existing.updatedAt = ctx.timestamp;
      ctx.db.users.identity.update(existing);
      return;
    }

    ctx.db.users.insert({
      identity: ctx.sender,
      authUserId: cleanAuthUserId,
      displayName: cleanDisplayName,
      email: optionalText(email, 240),
      imageUrl: optionalText(imageUrl, 1_000),
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
  }
);

export const createTrip = spacetimedb.reducer(
  {
    title: t.string(),
    description: t.string().optional(),
  },
  (ctx, { title, description }) => {
    ensureUserExists(ctx);

    const trip = ctx.db.trips.insert({
      tripId: 0n,
      title: requiredText(title, 'Trip title', 120),
      description: optionalText(description, 2_000),
      ownerIdentity: ctx.sender,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      deletedAt: undefined,
    });

    ctx.db.tripMembers.insert({
      membershipId: 0n,
      tripId: trip.tripId,
      identity: ctx.sender,
      role: 'owner',
      createdAt: ctx.timestamp,
    });
  }
);

export const updateTrip = spacetimedb.reducer(
  {
    tripId: t.u64(),
    title: t.string(),
    description: t.string().optional(),
  },
  (ctx, { tripId, title, description }) => {
    requireTripRole(ctx, tripId, ['owner', 'editor']);
    const trip = getActiveTrip(ctx, tripId);

    trip.title = requiredText(title, 'Trip title', 120);
    trip.description = optionalText(description, 2_000);
    trip.updatedAt = ctx.timestamp;
    ctx.db.trips.tripId.update(trip);
  }
);

export const inviteMember = spacetimedb.reducer(
  {
    tripId: t.u64(),
    memberIdentity: t.string(),
    role: t.string(),
  },
  (ctx, { tripId, memberIdentity, role }) => {
    requireTripRole(ctx, tripId, ['owner']);
    const cleanRole = parseRole(role);
    if (cleanRole === 'owner') {
      throw new SenderError('Use ownership transfer for owner changes');
    }

    const identity = parseIdentity(memberIdentity);
    const existing = findMember(ctx, tripId, identity);
    if (existing) {
      existing.role = cleanRole;
      ctx.db.tripMembers.membershipId.update(existing);
      return;
    }

    ctx.db.tripMembers.insert({
      membershipId: 0n,
      tripId,
      identity,
      role: cleanRole,
      createdAt: ctx.timestamp,
    });
  }
);

export const updateMemberRole = spacetimedb.reducer(
  {
    tripId: t.u64(),
    memberIdentity: t.string(),
    role: t.string(),
  },
  (ctx, { tripId, memberIdentity, role }) => {
    requireTripRole(ctx, tripId, ['owner']);
    const cleanRole = parseRole(role);
    if (cleanRole === 'owner') {
      throw new SenderError('Use ownership transfer for owner changes');
    }

    const member = requireMember(ctx, tripId, parseIdentity(memberIdentity));
    if (member.role === 'owner') {
      throw new SenderError('The owner role cannot be changed here');
    }

    member.role = cleanRole;
    ctx.db.tripMembers.membershipId.update(member);
  }
);

export const revokeMember = spacetimedb.reducer(
  {
    tripId: t.u64(),
    memberIdentity: t.string(),
  },
  (ctx, { tripId, memberIdentity }) => {
    requireTripRole(ctx, tripId, ['owner']);
    const member = requireMember(ctx, tripId, parseIdentity(memberIdentity));
    if (member.role === 'owner') {
      throw new SenderError('The owner cannot be removed from the trip');
    }

    ctx.db.tripMembers.membershipId.delete(member.membershipId);
  }
);

export const createActivity = spacetimedb.reducer(
  {
    tripId: t.u64(),
    name: t.string(),
    description: t.string().optional(),
    date: t.string().optional(),
    timeType: t.string(),
    time: t.string().optional(),
    order: t.i32().optional(),
    locationName: t.string().optional(),
    address: t.string().optional(),
    lat: t.f64().optional(),
    lng: t.f64().optional(),
    locationProvider: t.string().optional(),
    providerPlaceId: t.string().optional(),
    externalUrl: t.string().optional(),
  },
  (ctx, input) => {
    requireTripRole(ctx, input.tripId, ['owner', 'editor']);
    const timeType = parseTimeType(input.timeType);
    validateTime(timeType, input.time, input.order);

    ctx.db.activities.insert({
      activityId: 0n,
      tripId: input.tripId,
      name: requiredText(input.name, 'Activity name', 160),
      description: optionalText(input.description, 5_000),
      locationName: optionalText(input.locationName, 160),
      address: optionalText(input.address, 240),
      lat: input.lat,
      lng: input.lng,
      locationProvider: optionalProvider(input.locationProvider),
      providerPlaceId: optionalText(input.providerPlaceId, 160),
      externalUrl: optionalText(input.externalUrl, 1_000),
      date: optionalDate(input.date),
      timeType,
      time: optionalTime(input.time),
      order: input.order,
      createdBy: ctx.sender,
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
      deletedAt: undefined,
    });
  }
);

export const updateActivity = spacetimedb.reducer(
  {
    activityId: t.u64(),
    name: t.string(),
    description: t.string().optional(),
    date: t.string().optional(),
    timeType: t.string(),
    time: t.string().optional(),
    order: t.i32().optional(),
    locationName: t.string().optional(),
    address: t.string().optional(),
    lat: t.f64().optional(),
    lng: t.f64().optional(),
    locationProvider: t.string().optional(),
    providerPlaceId: t.string().optional(),
    externalUrl: t.string().optional(),
  },
  (ctx, input) => {
    const activity = getActiveActivity(ctx, input.activityId);
    requireTripRole(ctx, activity.tripId, ['owner', 'editor']);
    const timeType = parseTimeType(input.timeType);
    validateTime(timeType, input.time, input.order);

    activity.name = requiredText(input.name, 'Activity name', 160);
    activity.description = optionalText(input.description, 5_000);
    activity.locationName = optionalText(input.locationName, 160);
    activity.address = optionalText(input.address, 240);
    activity.lat = input.lat;
    activity.lng = input.lng;
    activity.locationProvider = optionalProvider(input.locationProvider);
    activity.providerPlaceId = optionalText(input.providerPlaceId, 160);
    activity.externalUrl = optionalText(input.externalUrl, 1_000);
    activity.date = optionalDate(input.date);
    activity.timeType = timeType;
    activity.time = optionalTime(input.time);
    activity.order = input.order;
    activity.updatedAt = ctx.timestamp;
    ctx.db.activities.activityId.update(activity);
  }
);

export const reorderActivityWithinDay = spacetimedb.reducer(
  {
    activityId: t.u64(),
    date: t.string(),
    order: t.i32(),
  },
  (ctx, { activityId, date, order }) => {
    const activity = getActiveActivity(ctx, activityId);
    requireTripRole(ctx, activity.tripId, ['owner', 'editor']);

    activity.date = requiredDate(date);
    activity.timeType = 'ordered';
    activity.time = undefined;
    activity.order = order;
    activity.updatedAt = ctx.timestamp;
    ctx.db.activities.activityId.update(activity);
  }
);

export const softDeleteActivity = spacetimedb.reducer(
  { activityId: t.u64() },
  (ctx, { activityId }) => {
    const activity = getActiveActivity(ctx, activityId);
    requireTripRole(ctx, activity.tripId, ['owner', 'editor']);

    activity.deletedAt = ctx.timestamp;
    activity.updatedAt = ctx.timestamp;
    ctx.db.activities.activityId.update(activity);
  }
);

export const createLabel = spacetimedb.reducer(
  {
    tripId: t.u64(),
    name: t.string(),
    color: t.string(),
  },
  (ctx, { tripId, name, color }) => {
    requireTripRole(ctx, tripId, ['owner', 'editor']);

    ctx.db.labels.insert({
      labelId: 0n,
      tripId,
      name: requiredText(name, 'Label name', 40),
      color: requiredText(color, 'Label color', 32),
      createdAt: ctx.timestamp,
      updatedAt: ctx.timestamp,
    });
  }
);

export const updateLabel = spacetimedb.reducer(
  {
    labelId: t.u64(),
    name: t.string(),
    color: t.string(),
  },
  (ctx, { labelId, name, color }) => {
    const label = getLabel(ctx, labelId);
    requireTripRole(ctx, label.tripId, ['owner', 'editor']);

    label.name = requiredText(name, 'Label name', 40);
    label.color = requiredText(color, 'Label color', 32);
    label.updatedAt = ctx.timestamp;
    ctx.db.labels.labelId.update(label);
  }
);

export const deleteLabel = spacetimedb.reducer(
  { labelId: t.u64() },
  (ctx, { labelId }) => {
    const label = getLabel(ctx, labelId);
    requireTripRole(ctx, label.tripId, ['owner', 'editor']);

    for (const row of ctx.db.activityLabels.activity_labels_label_id.filter(labelId)) {
      ctx.db.activityLabels.activityLabelId.delete(row.activityLabelId);
    }
    ctx.db.labels.labelId.delete(labelId);
  }
);

export const addActivityLabel = spacetimedb.reducer(
  {
    activityId: t.u64(),
    labelId: t.u64(),
  },
  (ctx, { activityId, labelId }) => {
    const activity = getActiveActivity(ctx, activityId);
    const label = getLabel(ctx, labelId);
    if (activity.tripId !== label.tripId) {
      throw new SenderError('Label must belong to the same trip as activity');
    }
    requireTripRole(ctx, activity.tripId, ['owner', 'editor']);

    for (const row of ctx.db.activityLabels.activity_labels_activity_id.filter(activityId)) {
      if (row.labelId === labelId) {
        return;
      }
    }

    ctx.db.activityLabels.insert({
      activityLabelId: 0n,
      activityId,
      labelId,
      createdAt: ctx.timestamp,
    });
  }
);

export const removeActivityLabel = spacetimedb.reducer(
  {
    activityId: t.u64(),
    labelId: t.u64(),
  },
  (ctx, { activityId, labelId }) => {
    const activity = getActiveActivity(ctx, activityId);
    requireTripRole(ctx, activity.tripId, ['owner', 'editor']);

    for (const row of ctx.db.activityLabels.activity_labels_activity_id.filter(activityId)) {
      if (row.labelId === labelId) {
        ctx.db.activityLabels.activityLabelId.delete(row.activityLabelId);
      }
    }
  }
);

export const usersVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT users.* FROM users WHERE users.identity = :sender'
);

export const tripsVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT trips.* FROM trips JOIN trip_members ON trips.trip_id = trip_members.trip_id WHERE trip_members.identity = :sender'
);

export const tripMembersVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT trip_members.* FROM trip_members JOIN trip_members AS sender_members ON trip_members.trip_id = sender_members.trip_id WHERE sender_members.identity = :sender'
);

export const activitiesVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT activities.* FROM activities JOIN trip_members ON activities.trip_id = trip_members.trip_id WHERE trip_members.identity = :sender'
);

export const labelsVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT labels.* FROM labels JOIN trip_members ON labels.trip_id = trip_members.trip_id WHERE trip_members.identity = :sender'
);

export const activityLabelsVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT activity_labels.* FROM activity_labels JOIN activities ON activity_labels.activity_id = activities.activity_id JOIN trip_members ON activities.trip_id = trip_members.trip_id WHERE trip_members.identity = :sender'
);

function ensureUserExists(ctx: Parameters<typeof createTrip>[0]) {
  if (!ctx.db.users.identity.find(ctx.sender)) {
    throw new SenderError('Sign in before using trips');
  }
}

function getActiveTrip(ctx: Parameters<typeof createTrip>[0], tripId: bigint) {
  const trip = ctx.db.trips.tripId.find(tripId);
  if (!trip || trip.deletedAt) {
    throw new SenderError('Trip not found');
  }
  return trip;
}

function getActiveActivity(
  ctx: Parameters<typeof createTrip>[0],
  activityId: bigint
) {
  const activity = ctx.db.activities.activityId.find(activityId);
  if (!activity || activity.deletedAt) {
    throw new SenderError('Activity not found');
  }
  return activity;
}

function getLabel(ctx: Parameters<typeof createTrip>[0], labelId: bigint) {
  const label = ctx.db.labels.labelId.find(labelId);
  if (!label) {
    throw new SenderError('Label not found');
  }
  return label;
}

function requireTripRole(
  ctx: Parameters<typeof createTrip>[0],
  tripId: bigint,
  allowedRoles: ReadonlyArray<Role>
): MemberRow {
  getActiveTrip(ctx, tripId);
  const member = findMember(ctx, tripId, ctx.sender);

  if (!member || !allowedRoles.includes(parseRole(member.role))) {
    throw new SenderError('You do not have permission for this trip');
  }

  return member;
}

function requireMember(
  ctx: Parameters<typeof createTrip>[0],
  tripId: bigint,
  identity: Identity
): MemberRow {
  const member = findMember(ctx, tripId, identity);
  if (!member) {
    throw new SenderError('Trip member not found');
  }
  return member;
}

function findMember(
  ctx: Parameters<typeof createTrip>[0],
  tripId: bigint,
  identity: Identity
): MemberRow | undefined {
  for (const member of ctx.db.tripMembers.trip_members_trip_id.filter(tripId)) {
    if (member.identity.equals(identity)) {
      return member;
    }
  }
  return undefined;
}

function parseIdentity(value: string): Identity {
  try {
    return Identity.fromString(value.trim());
  } catch {
    throw new SenderError('Invalid SpacetimeDB identity');
  }
}

function parseRole(value: string): Role {
  switch (value) {
    case 'owner':
    case 'editor':
    case 'viewer':
      return value;
    default:
      throw new SenderError('Invalid trip role');
  }
}

function parseTimeType(value: string): TimeType {
  switch (value) {
    case 'none':
    case 'exact':
    case 'ordered':
      return value;
    default:
      throw new SenderError('Invalid activity time type');
  }
}

function optionalProvider(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  switch (value) {
    case 'manual':
    case 'osm':
    case 'google':
    case 'apple':
    case 'waze':
    case 'other':
      return value;
    default:
      throw new SenderError('Invalid location provider');
  }
}

function requiredText(value: string, label: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new SenderError(`${label} is required`);
  }
  if (trimmed.length > maxLength) {
    throw new SenderError(`${label} is too long`);
  }
  return trimmed;
}

function optionalText(
  value: string | undefined,
  maxLength: number
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > maxLength) {
    throw new SenderError('Value is too long');
  }
  return trimmed;
}

function requiredDate(value: string): string {
  const date = requiredText(value, 'Date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new SenderError('Date must use YYYY-MM-DD');
  }
  return date;
}

function optionalDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return requiredDate(value);
}

function optionalTime(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new SenderError('Time must use HH:mm');
  }
  return value;
}

function validateTime(
  timeType: TimeType,
  time: string | undefined,
  order: number | undefined
) {
  switch (timeType) {
    case 'none':
      return;
    case 'exact':
      if (!optionalTime(time)) {
        throw new SenderError('Exact time is required');
      }
      return;
    case 'ordered':
      if (order === undefined) {
        throw new SenderError('Manual order is required');
      }
      return;
    default: {
      const exhaustive: never = timeType;
      return exhaustive;
    }
  }
}
