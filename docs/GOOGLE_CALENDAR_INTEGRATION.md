# Google Calendar Integration Guide

This guide explains how to use the Google Calendar integration in DueSync.

## Overview

DueSync integrates with Google Calendar to automatically sync your tasks as calendar events. This allows you to:
- View your tasks in Google Calendar
- Get calendar notifications for your tasks
- Manage tasks from either DueSync or Google Calendar
- Automatically sync changes between both platforms

## Setup

### 1. Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Calendar API"
5. Click **Enable**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in the required information:
   - App name: DueSync
   - User support email: Your email
   - Developer contact: Your email
4. Add the following scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add test users if needed

### 3. Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**

### 4. Update Environment Variables

Add your credentials to `.env`:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

## Database Schema

The integration uses the following database fields:

### Account Model
- `access_token`: Google OAuth access token
- `refresh_token`: Google OAuth refresh token (for token refresh)
- `expires_at`: Token expiration timestamp
- `scope`: OAuth scopes granted

### Task Model
- `googleEventId`: Links task to Google Calendar event

## API Usage

### Sync Task with Google Calendar

**Endpoint:** `POST /api/tasks/[id]/calendar`

Syncs a task with Google Calendar. Creates a new event if the task isn't synced, or updates the existing event.

```typescript
// Example fetch
const response = await fetch(`/api/tasks/${taskId}/calendar`, {
  method: 'POST',
});

const data = await response.json();
console.log(data.message); // "Task synced with Google Calendar"
```

**Response:**
```json
{
  "message": "Task synced with Google Calendar",
  "task": {
    "id": "...",
    "title": "...",
    "googleEventId": "..."
  },
  "event": {
    "id": "...",
    "summary": "...",
    "start": { "dateTime": "..." },
    "end": { "dateTime": "..." }
  }
}
```

### Unsync Task from Google Calendar

**Endpoint:** `DELETE /api/tasks/[id]/calendar`

Removes the task sync from Google Calendar and deletes the event.

```typescript
const response = await fetch(`/api/tasks/${taskId}/calendar`, {
  method: 'DELETE',
});

const data = await response.json();
console.log(data.message); // "Task unsynced from Google Calendar"
```

## Utility Functions

### `getCalendarClient(userId: string)`
Returns an authenticated Google Calendar API client for the user.

```typescript
import { getCalendarClient } from '@/lib/google-calendar';

const { calendar } = await getCalendarClient(userId);
```

### `createCalendarEvent(userId, task)`
Creates a new Google Calendar event for a task.

```typescript
import { createCalendarEvent } from '@/lib/google-calendar';

const event = await createCalendarEvent(userId, {
  id: task.id,
  title: task.title,
  description: task.description,
  dueDate: task.dueDate,
  dueTime: task.dueTime,
  estimatedTime: task.estimatedTime,
});
```

### `updateCalendarEvent(userId, eventId, task)`
Updates an existing Google Calendar event.

```typescript
import { updateCalendarEvent } from '@/lib/google-calendar';

const event = await updateCalendarEvent(userId, eventId, {
  title: task.title,
  description: task.description,
  dueDate: task.dueDate,
  dueTime: task.dueTime,
  estimatedTime: task.estimatedTime,
});
```

### `deleteCalendarEvent(userId, eventId)`
Deletes a Google Calendar event.

```typescript
import { deleteCalendarEvent } from '@/lib/google-calendar';

await deleteCalendarEvent(userId, eventId);
```

### `syncTaskWithCalendar(userId, task)`
Syncs a task with Google Calendar (creates or updates).

```typescript
import { syncTaskWithCalendar } from '@/lib/google-calendar';

const event = await syncTaskWithCalendar(userId, task);
```

### `unsyncTaskFromCalendar(userId, googleEventId, taskId)`
Removes task sync and deletes the calendar event.

```typescript
import { unsyncTaskFromCalendar } from '@/lib/google-calendar';

await unsyncTaskFromCalendar(userId, googleEventId, taskId);
```

## Token Refresh

The integration automatically handles token refresh:

1. **Automatic Refresh**: When the OAuth2 client detects an expired token, it automatically refreshes it using the refresh token
2. **Proactive Refresh**: The `ensureValidToken()` function checks if a token will expire in the next 5 minutes and refreshes it proactively
3. **Database Update**: Refreshed tokens are automatically saved to the database

### Token Refresh Flow

```typescript
// Manual token refresh check
import { ensureValidToken } from '@/lib/google-calendar';

const isValid = await ensureValidToken(userId);
if (!isValid) {
  console.error('Failed to refresh token');
}
```

## Event Details

When syncing a task to Google Calendar, the following event properties are set:

- **Summary**: Task title
- **Description**: Task description
- **Start Time**: Task due date + due time (or 9:00 AM if no time specified)
- **End Time**: Start time + estimated time (or 30 minutes if not specified)
- **Reminders**:
  - Email: 24 hours before
  - Popup: 30 minutes before

## Error Handling

### Common Errors

1. **"No Google account connected"**
   - User needs to sign in with Google first
   - Check if Account record exists with `provider: 'google'`

2. **"Failed to refresh token"**
   - Refresh token might be invalid or revoked
   - User needs to re-authenticate

3. **404 on Calendar API**
   - Event might have been deleted from Google Calendar
   - Handled gracefully by the integration

### Error Handling Example

```typescript
try {
  await syncTaskWithCalendar(userId, task);
} catch (error) {
  if (error.message === 'No Google account connected') {
    // Redirect to login
  } else {
    // Handle other errors
    console.error('Sync failed:', error);
  }
}
```

## Testing

### Test the Integration

1. **Sign in with Google**
   ```typescript
   // User must sign in with Google to grant calendar access
   ```

2. **Create a test task**
   ```typescript
   const task = await prisma.task.create({
     data: {
       userId: 'user-id',
       title: 'Test Task',
       description: 'This is a test',
       dueDate: new Date('2025-11-01'),
       dueTime: '14:00',
       estimatedTime: 60,
     },
   });
   ```

3. **Sync with Calendar**
   ```typescript
   await syncTaskWithCalendar(userId, task);
   ```

4. **Check Google Calendar**
   - Open Google Calendar
   - Look for the task event on November 1, 2025 at 2:00 PM

## Best Practices

1. **Always check token validity** before making API calls
2. **Handle errors gracefully** - calendar sync should never block task operations
3. **Update calendar events** when tasks are modified
4. **Delete calendar events** when tasks are deleted or completed
5. **Respect rate limits** - Google Calendar API has usage quotas

## Security Considerations

1. **Never expose tokens** in client-side code
2. **Store tokens securely** in the database (encrypted if possible)
3. **Use environment variables** for OAuth credentials
4. **Validate user ownership** before syncing tasks
5. **Handle token expiration** properly

## Troubleshooting

### Token not refreshing
- Check that `access_type: 'offline'` is set in OAuth config
- Verify `prompt: 'consent'` is included
- Ensure refresh_token is stored in database

### Calendar events not appearing
- Verify Calendar API is enabled
- Check if user granted calendar scope
- Confirm event creation was successful (check response)

### "Invalid credentials" error
- Verify environment variables are correct
- Check OAuth redirect URI matches configuration
- Ensure OAuth consent screen is published

## Future Enhancements

Potential improvements for the integration:

1. **Bidirectional Sync**: Sync changes from Google Calendar back to DueSync
2. **Multiple Calendars**: Support syncing to different calendars
3. **Batch Operations**: Sync multiple tasks at once
4. **Webhook Support**: Real-time updates using Google Calendar webhooks
5. **Conflict Resolution**: Handle conflicts when tasks are modified in both places
