# AnonChat Widget

A fully self-hosted WordPress plugin for anonymous, disposable chat rooms. No registration, no database, no cookies, no logs - 100% privacy-focused.

## Features

- **Anonymous Chat Rooms** - Create or join temporary chat rooms with 20-character codes
- **Zero Database Storage** - All data stored in WordPress transients (memory/cache)
- **No Tracking** - No cookies, no logs, no IP storage beyond rate limiting
- **Auto-Expiration** - Rooms automatically delete after 6 hours of inactivity or 24 hours maximum
- **Real-Time Messaging** - Lightweight AJAX polling (2.2s intervals) for instant message delivery
- **Mobile Ready** - Fully responsive design that works on all devices
- **Dark/Light Mode** - Automatically follows system preferences
- **Multiple Integration Methods** - Shortcode, Widget, or Gutenberg Block

## Installation

1. Upload the `WPChat` folder to `/wp-content/plugins/`
2. Activate the "AnonChat Widget" plugin through the 'Plugins' menu in WordPress
3. Start using it via shortcode, widget, or Gutenberg block

## Usage

### Shortcode

Add the chat widget to any post or page:

```
[anonchat]
```

With custom button color:

```
[anonchat button_color="#ff5733"]
```

### WordPress Widget

1. Go to **Appearance → Widgets**
2. Add the "AnonChat Widget" to your sidebar or widget area
3. Configure the title and button color if desired

### Gutenberg Block

1. Edit any post or page with the Gutenberg editor
2. Click the "+" button to add a block
3. Search for "AnonChat" and add the block
4. Customize the button color in the block settings

## How It Works

### Creating a Room

1. Click "Start Chat" button
2. Enter a nickname (max 30 characters) and optional room name
3. System generates a 20-character random code (e.g., `7bX9pL2mK8vQ4rT6yU1z`)
4. Code is automatically copied to clipboard
5. Share the code with others to let them join

### Joining a Room

1. Click "Join Chat" button
2. Paste the 20-character room code
3. Enter your nickname
4. Start chatting instantly

### Room Lifecycle

- Rooms expire after **6 hours of inactivity** OR **24 hours maximum** (whichever comes first)
- All messages and user data are permanently deleted when a room expires
- No data is ever written to the WordPress database
- Everything is stored in temporary cache/transients

## Security Features

- **Rate Limiting**: Max 5 messages per 10 seconds per user
- **Room Creation Limit**: Max 1 room per 30 seconds per IP
- **IP Protection**: Max 10 simultaneous rooms per IP address
- **Input Sanitization**: All user input is sanitized and stripped of HTML
- **Secure Codes**: 20-character base62 codes provide ~120 bits of entropy (practically unguessable)

## Settings

Configure the plugin via **Settings → AnonChat**:

- **Max Room Lifetime**: Maximum time a room can exist (default: 24 hours)
- **Max Inactivity Timeout**: Time before inactive room expires (default: 6 hours)
- **Button Text**: Customize "Start Chat" and "Join Chat" button text
- **Button Color**: Set custom button color
- **Custom CSS**: Add your own styling

## Technical Details

- **Storage**: WordPress transients (object cache or file-based with TTL)
- **Polling**: AJAX requests every 2.2 seconds with cache-busting timestamps
- **No External Dependencies**: 100% self-hosted, no third-party services
- **Cache Compatible**: Works with all WordPress caching plugins
- **File Size**: < 18 KB gzipped (CSS + JS combined)

## Privacy & Data

- **No Database Tables**: Zero database impact
- **No Cookies**: No tracking cookies set
- **No Logs**: No message or user logging
- **No IP Storage**: IP addresses only used for rate limiting (stored in transients, auto-expire)
- **Temporary Only**: All data automatically deleted when rooms expire

## Requirements

- WordPress 5.0 or higher
- PHP 7.2 or higher
- No additional plugins or services required

## License

**Free for any use** - This plugin is provided as-is, free for personal, commercial, or any other use. No restrictions, no attribution required (though appreciated).

## Author

**Marc Kranat**

## Support

This is a self-hosted, privacy-focused plugin. For issues or feature requests, please check the code or modify as needed for your requirements.

## Changelog

### 1.0.0
- Initial release
- Anonymous chat rooms with 20-character codes
- Real-time messaging via AJAX polling
- WordPress Widget, Shortcode, and Gutenberg Block support
- Auto-expiring rooms (6h inactivity / 24h max)
- Rate limiting and security features
- Mobile-responsive design with dark/light mode

