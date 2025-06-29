import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { createGoogleCalendarEvent } from './google';

interface GreminderPluginSettings {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

const DEFAULT_SETTINGS: GreminderPluginSettings = {
  clientId: '',
  clientSecret: '',
  refreshToken: '',
};

export default class GreminderPlugin extends Plugin {
  settings: GreminderPluginSettings;

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new GreminderSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on('editor-change', this.onEditorChange.bind(this))
    );
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async onEditorChange(editor: Editor, view: MarkdownView) {
    console.log("Greminder: onEditorChange triggered.");
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    console.log("Greminder: Current line:", line);

    const regex = /@\s?(\d{2}) (\d{2}) (\d{2}) (\d{2}):(\d{2}) (.*)/;
    const match = line.match(regex);
    console.log("Greminder: Regex match result:", match);
    console.log("Greminder: Settings loaded:", this.settings);

    if (match) {
      const [, day, month, year, hours, minutes, summary] = match;
      const fullYear = 2000 + parseInt(year, 10);
      const date = new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hours, 10), parseInt(minutes, 10));
      
      const startTime = date.toISOString();
      date.setHours(date.getHours() + 1); // Default to a 1-hour event
      const endTime = date.toISOString();

      new Notice('Creating Google Calendar event...');

      try {
        const eventLink = await createGoogleCalendarEvent(
          this.settings,
          summary.trim(),
          'Event created from Obsidian',
          startTime,
          endTime
        );

        if (eventLink) {
          if (match.index !== undefined) {
            const eventMarkdownLink = `[Google Calendar Event](${eventLink})`;
            editor.replaceRange(eventMarkdownLink, { line: cursor.line, ch: match.index }, { line: cursor.line, ch: match.index + match[0].length });
            new Notice('Google Calendar event created successfully!');
          }
        } else {
          new Notice('Failed to create Google Calendar event.');
        }
      } catch (error) {
        new Notice('Error creating event. Check your settings and Google Calendar permissions.');
        console.error('Greminder plugin error:', error);
      }
    }
  }
}

class GreminderSettingTab extends PluginSettingTab {
  plugin: GreminderPlugin;

  constructor(app: App, plugin: GreminderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Greminder Settings' });

    new Setting(containerEl)
      .setName('Google Calendar API Credentials')
      .setDesc('You need to provide your own Google Calendar API credentials. See the plugin documentation for instructions on how to get them.')

    new Setting(containerEl)
      .setName('Client ID')
      .addText(text => text
        .setPlaceholder('Enter your client ID')
        .setValue(this.plugin.settings.clientId)
        .onChange(async (value) => {
          this.plugin.settings.clientId = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Client Secret')
      .addText(text => text
        .setPlaceholder('Enter your client secret')
        .setValue(this.plugin.settings.clientSecret)
        .onChange(async (value) => {
          this.plugin.settings.clientSecret = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Refresh Token')
      .addText(text => text
        .setPlaceholder('Enter your refresh token')
        .setValue(this.plugin.settings.refreshToken)
        .onChange(async (value) => {
          this.plugin.settings.refreshToken = value;
          await this.plugin.saveSettings();
        }));
  }
}
