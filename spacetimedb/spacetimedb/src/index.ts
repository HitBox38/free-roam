import { Identity } from 'spacetimedb';
import { SenderError, schema, t, table } from 'spacetimedb/server';
import {
  diffActivityFields,
  parseActivityHistoryAction,
  parseTargetType,
  stringifySafe,
  validateColor,
  validateLatLng,
} from './collab-helpers';
import type { Timestamp } from 'spacetimedb';
import type {
  ActivityFieldSnapshot,
  ActivityHistoryAction,
  TypingTargetType,
} from './collab-helpers';

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

const activityComments = table(
  {
    public: true,
    indexes: [
      {
        accessor: 'activity_comments_activity_id',
        algorithm: 'btree',
        columns: ['activityId'],
      },
      {
        accessor: 'activity_comments_parent_comment_id',
        algorithm: 'btree',
        columns: ['parentCommentId'],
      },
    ],
  },
  {
    commentId: t.u64().primaryKey().autoInc(),
    activityId: t.u64(),
    parentCommentId: t.u64().optional(),
    userIdentity: t.identity(),
    body: t.string(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp().optional(),
    deletedAt: t.timestamp().optional(),
  }
);

const activityHistory = table(
  {
    public: true,
    indexes: [
      {
        accessor: 'activity_history_activity_id',
        algorithm: 'btree',
        columns: ['activityId'],
      },
    ],
  },
  {
    historyId: t.u64().primaryKey().autoInc(),
    activityId: t.u64(),
    userIdentity: t.identity(),
    action: t.string(),
    beforeJson: t.string().optional(),
    afterJson: t.string().optional(),
    createdAt: t.timestamp(),
  }
);

const mapPresence = table(
  {
    public: true,
    indexes: [
      {
        accessor: 'map_presence_connection_id',
        algorithm: 'btree',
        columns: ['connectionId'],
      },
      {
        accessor: 'map_presence_trip_id',
        algorithm: 'btree',
        columns: ['tripId'],
      },
      {
        accessor: 'map_presence_user_identity',
        algorithm: 'btree',
        columns: ['userIdentity'],
      },
    ],
  },
  {
    presenceId: t.u64().primaryKey().autoInc(),
    connectionId: t.connectionId(),
    tripId: t.u64(),
    userIdentity: t.identity(),
    lat: t.f64(),
    lng: t.f64(),
    color: t.string(),
    updatedAt: t.timestamp(),
  }
);

const typingIndicators = table(
  {
    public: true,
    indexes: [
      {
        accessor: 'typing_indicators_trip_id',
        algorithm: 'btree',
        columns: ['tripId'],
      },
      {
        accessor: 'typing_indicators_user_identity',
        algorithm: 'btree',
        columns: ['userIdentity'],
      },
    ],
  },
  {
    indicatorId: t.u64().primaryKey().autoInc(),
    connectionId: t.connectionId(),
    tripId: t.u64(),
    userIdentity: t.identity(),
    targetType: t.string(),
    targetId: t.string(),
    updatedAt: t.timestamp(),
  }
);

const spacetimedb = schema({
  users,
  trips,
  tripMembers,
  activities,
  labels,
  activityLabels,
  activityComments,
  activityHistory,
  mapPresence,
  typingIndicators,
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

    const activity = ctx.db.activities.insert({
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

    recordHistory(ctx, activity.activityId, 'created', undefined, {
      name: activity.name,
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
    const before = toActivityFieldSnapshot(activity);

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

    const after = toActivityFieldSnapshot(activity);
    for (const change of diffActivityFields(before, after)) {
      recordHistory(
        ctx,
        activity.activityId,
        change.action,
        change.before,
        change.after
      );
    }
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
    const before = toActivityFieldSnapshot(activity);

    activity.date = requiredDate(date);
    activity.timeType = 'ordered';
    activity.time = undefined;
    activity.order = order;
    activity.updatedAt = ctx.timestamp;
    ctx.db.activities.activityId.update(activity);

    const after = toActivityFieldSnapshot(activity);
    for (const change of diffActivityFields(before, after)) {
      recordHistory(
        ctx,
        activity.activityId,
        change.action,
        change.before,
        change.after
      );
    }
  }
);

export const softDeleteActivity = spacetimedb.reducer(
  { activityId: t.u64() },
  (ctx, { activityId }) => {
    const activity = getActiveActivity(ctx, activityId);
    requireTripRole(ctx, activity.tripId, ['owner', 'editor']);
    const beforeDeletedAt = activity.deletedAt;

    activity.deletedAt = ctx.timestamp;
    activity.updatedAt = ctx.timestamp;
    ctx.db.activities.activityId.update(activity);
    if (!beforeDeletedAt) {
      recordHistory(
        ctx,
        activity.activityId,
        'deleted',
        { deletedAt: beforeDeletedAt },
        { deletedAt: activity.deletedAt }
      );
    }
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

    recordHistory(ctx, activityId, 'added_label', undefined, { labelId });
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
        recordHistory(ctx, activityId, 'removed_label', { labelId }, undefined);
      }
    }
  }
);

export const addComment = spacetimedb.reducer(
  {
    activityId: t.u64(),
    parentCommentId: t.u64().optional(),
    body: t.string(),
  },
  (ctx, { activityId, parentCommentId, body }) => {
    const activity = getActiveActivity(ctx, activityId);
    requireTripRole(ctx, activity.tripId, ['owner', 'editor', 'viewer']);

    if (parentCommentId !== undefined) {
      const parent = requireComment(ctx, parentCommentId);
      if (parent.activityId !== activityId) {
        throw new SenderError('Reply parent must belong to the same activity');
      }
    }

    const comment = ctx.db.activityComments.insert({
      commentId: 0n,
      activityId,
      parentCommentId,
      userIdentity: ctx.sender,
      body: requiredText(body, 'Comment', 4_000),
      createdAt: ctx.timestamp,
      updatedAt: undefined,
      deletedAt: undefined,
    });

    recordHistory(ctx, activityId, 'commented', undefined, {
      commentId: comment.commentId,
      parentCommentId: comment.parentCommentId,
    });
  }
);

export const editComment = spacetimedb.reducer(
  {
    commentId: t.u64(),
    body: t.string(),
  },
  (ctx, { commentId, body }) => {
    const comment = requireComment(ctx, commentId);
    const activity = getActiveActivity(ctx, comment.activityId);
    requireTripRole(ctx, activity.tripId, ['owner', 'editor', 'viewer']);

    if (!comment.userIdentity.equals(ctx.sender)) {
      throw new SenderError('Only the comment author can edit this comment');
    }
    if (comment.deletedAt) {
      throw new SenderError('Deleted comments cannot be edited');
    }

    comment.body = requiredText(body, 'Comment', 4_000);
    comment.updatedAt = ctx.timestamp;
    ctx.db.activityComments.commentId.update(comment);
  }
);

export const softDeleteComment = spacetimedb.reducer(
  { commentId: t.u64() },
  (ctx, { commentId }) => {
    const comment = requireComment(ctx, commentId);
    const activity = getActiveActivity(ctx, comment.activityId);
    const isAuthor = comment.userIdentity.equals(ctx.sender);
    if (!isAuthor) {
      requireTripRole(ctx, activity.tripId, ['owner']);
    }

    comment.deletedAt = ctx.timestamp;
    ctx.db.activityComments.commentId.update(comment);
  }
);

export const upsertMapPresence = spacetimedb.reducer(
  {
    tripId: t.u64(),
    lat: t.f64(),
    lng: t.f64(),
    color: t.string(),
  },
  (ctx, { tripId, lat, lng, color }) => {
    requireTripRole(ctx, tripId, ['owner', 'editor', 'viewer']);
    validateLatLng(lat, lng);
    const cleanColor = validateColor(color);
    const connectionId = requireConnectionId(ctx);

    for (const presence of ctx.db.mapPresence.map_presence_connection_id.filter(connectionId)) {
      if (presence.tripId === tripId) {
        presence.lat = lat;
        presence.lng = lng;
        presence.color = cleanColor;
        presence.updatedAt = ctx.timestamp;
        ctx.db.mapPresence.presenceId.update(presence);
        return;
      }
    }

    ctx.db.mapPresence.insert({
      presenceId: 0n,
      connectionId,
      tripId,
      userIdentity: ctx.sender,
      lat,
      lng,
      color: cleanColor,
      updatedAt: ctx.timestamp,
    });
  }
);

export const clearMapPresence = spacetimedb.reducer(
  { tripId: t.u64() },
  (ctx, { tripId }) => {
    requireTripRole(ctx, tripId, ['owner', 'editor', 'viewer']);
    const connectionId = requireConnectionId(ctx);

    for (const presence of ctx.db.mapPresence.map_presence_connection_id.filter(connectionId)) {
      if (presence.tripId === tripId) {
        ctx.db.mapPresence.presenceId.delete(presence.presenceId);
      }
    }
  }
);

export const upsertTypingIndicator = spacetimedb.reducer(
  {
    tripId: t.u64(),
    targetType: t.string(),
    targetId: t.string(),
  },
  (ctx, { tripId, targetType, targetId }) => {
    requireTripRole(ctx, tripId, ['owner', 'editor', 'viewer']);
    const parsedTargetType = parseTargetType(targetType);
    const parsedTargetId = normalizeTargetId(targetId, parsedTargetType);
    const connectionId = requireConnectionId(ctx);

    for (const indicator of ctx.db.typingIndicators.typing_indicators_user_identity.filter(
      ctx.sender
    )) {
      if (
        indicator.connectionId.equals(connectionId) &&
        indicator.tripId === tripId &&
        indicator.targetType === parsedTargetType &&
        indicator.targetId === parsedTargetId
      ) {
        indicator.updatedAt = ctx.timestamp;
        ctx.db.typingIndicators.indicatorId.update(indicator);
        return;
      }
    }

    ctx.db.typingIndicators.insert({
      indicatorId: 0n,
      connectionId,
      tripId,
      userIdentity: ctx.sender,
      targetType: parsedTargetType,
      targetId: parsedTargetId,
      updatedAt: ctx.timestamp,
    });
  }
);

export const clearTypingIndicator = spacetimedb.reducer(
  {
    tripId: t.u64(),
    targetType: t.string(),
    targetId: t.string(),
  },
  (ctx, { tripId, targetType, targetId }) => {
    requireTripRole(ctx, tripId, ['owner', 'editor', 'viewer']);
    const parsedTargetType = parseTargetType(targetType);
    const parsedTargetId = normalizeTargetId(targetId, parsedTargetType);
    const connectionId = requireConnectionId(ctx);

    for (const indicator of ctx.db.typingIndicators.typing_indicators_user_identity.filter(
      ctx.sender
    )) {
      if (
        indicator.connectionId.equals(connectionId) &&
        indicator.tripId === tripId &&
        indicator.targetType === parsedTargetType &&
        indicator.targetId === parsedTargetId
      ) {
        ctx.db.typingIndicators.indicatorId.delete(indicator.indicatorId);
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

export const activityCommentsVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT activity_comments.* FROM activity_comments JOIN activities ON activity_comments.activity_id = activities.activity_id JOIN trip_members ON activities.trip_id = trip_members.trip_id WHERE trip_members.identity = :sender'
);

export const activityHistoryVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT activity_history.* FROM activity_history JOIN activities ON activity_history.activity_id = activities.activity_id JOIN trip_members ON activities.trip_id = trip_members.trip_id WHERE trip_members.identity = :sender'
);

export const mapPresenceVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT map_presence.* FROM map_presence JOIN trip_members ON map_presence.trip_id = trip_members.trip_id WHERE trip_members.identity = :sender'
);

export const typingIndicatorsVisibility = spacetimedb.clientVisibilityFilter.sql(
  'SELECT typing_indicators.* FROM typing_indicators JOIN trip_members ON typing_indicators.trip_id = trip_members.trip_id WHERE trip_members.identity = :sender'
);

export const clearEphemeralPresenceOnDisconnect = spacetimedb.clientDisconnected(
  (ctx) => {
    const connectionId = ctx.connectionId;
    if (!connectionId) {
      return;
    }

    for (const presence of ctx.db.mapPresence.map_presence_connection_id.filter(
      connectionId
    )) {
      ctx.db.mapPresence.presenceId.delete(presence.presenceId);
    }

    for (const indicator of ctx.db.typingIndicators.typing_indicators_user_identity.filter(
      ctx.sender
    )) {
      if (indicator.connectionId.equals(connectionId)) {
        ctx.db.typingIndicators.indicatorId.delete(indicator.indicatorId);
      }
    }
  }
);

function recordHistory(
  ctx: Parameters<typeof createTrip>[0],
  activityId: bigint,
  action: ActivityHistoryAction,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
) {
  ctx.db.activityHistory.insert({
    historyId: 0n,
    activityId,
    userIdentity: ctx.sender,
    action: parseActivityHistoryAction(action),
    beforeJson: before ? stringifySafe(before) : undefined,
    afterJson: after ? stringifySafe(after) : undefined,
    createdAt: ctx.timestamp,
  });
}

function toActivityFieldSnapshot(activity: ReturnType<typeof getActiveActivity>): ActivityFieldSnapshot {
  return {
    name: activity.name,
    description: activity.description,
    locationName: activity.locationName,
    address: activity.address,
    lat: activity.lat,
    lng: activity.lng,
    locationProvider: activity.locationProvider,
    providerPlaceId: activity.providerPlaceId,
    externalUrl: activity.externalUrl,
    date: activity.date,
    timeType: activity.timeType as TimeType,
    time: activity.time,
    order: activity.order,
  };
}

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

function requireComment(ctx: Parameters<typeof createTrip>[0], commentId: bigint) {
  const comment = ctx.db.activityComments.commentId.find(commentId);
  if (!comment) {
    throw new SenderError('Comment not found');
  }
  return comment;
}

function requireConnectionId(ctx: Parameters<typeof createTrip>[0]) {
  if (!ctx.connectionId) {
    throw new SenderError('Connection id is required');
  }
  return ctx.connectionId;
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

function normalizeTargetId(value: string, targetType: TypingTargetType): string {
  if (targetType === 'trip') {
    return value.trim();
  }
  return requiredText(value, 'Target id', 128);
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
