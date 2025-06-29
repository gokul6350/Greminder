import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleCalendarCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function createGoogleCalendarEvent(
  credentials: GoogleCalendarCredentials,
  summary: string,
  description: string,
  startTime: string,
  endTime: string
) {
  const oAuth2Client = new google.auth.OAuth2(
    credentials.clientId,
    credentials.clientSecret
  );

  oAuth2Client.setCredentials({ refresh_token: credentials.refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const event = {
    summary,
    description,
    start: {
      dateTime: startTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: endTime,
      timeZone: 'UTC',
    },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 10 }],
    },
  };

  try {
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    return res.data.htmlLink;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
}
