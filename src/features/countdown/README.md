# Countdown Feature

Add live countdown timers to any space page using simple HTML markup. Perfect for project anniversaries, special events, and important dates.

## Basic Usage

Add this HTML:

```html
<span class="wbe-countdown" style="display:none">Event Name @ 2026-07-04</span>
```

**For WBE users**: Shows a beautiful countdown timer
**For non-WBE users**: Hidden (no visual clutter)

## HTML Format

### Simple Format

```html
<span class="wbe-countdown" style="display:none">Label @ Date</span>
```

### With Time and Timezone

```html
<span class="wbe-countdown" style="display:none">Event @ 2026-07-04T15:00:00 EST</span>
```

### With Theme and Centering

```html
<span class="wbe-countdown" style="display:none">Event | theme=gold | center @ 2026-07-04</span>
```

### Advanced Format

```html
<span class="wbe-countdown" style="display:none"
  >target=2026-07-04T15:00:00 EST;label=Event Name;theme=red;complete=It's time!</span
>
```

## Parameters

### Date Formats

- `2026-07-04` - Date only (midnight local time)
- `2026-07-04T15:00:00` - Date with time (local time)
- `2026-07-04T15:00:00 EST` - Date with timezone

### Themes

- `red`, `blue`, `green`, `purple`, `gold`, `silver`, `rainbow`, `dark`, `minimal`

### Custom Colors

- `color=white` - Text color
- `bgcolor=#FF0000` - Background color

### Layout Options

- `center` or `centre` - Centers the countdown on the page

### Other Options

- `complete=Custom message` - Text shown when countdown reaches zero

## Examples

### Sandy's 1776 Project - Centered Gold Theme

```html
<span class="wbe-countdown" style="display:none">American Revolution • 250th Anniversary | theme=gold | center @ 2026-07-04</span>
```

### Basic Anniversary Countdown

```html
<span class="wbe-countdown" style="display:none">American Revolution 250th Anniversary @ 2026-07-04</span>
```

### Centered with Time

```html
<span class="wbe-countdown" style="display:none">Independence Day Ceremony | theme=gold | center @ 2026-07-04T14:00:00 EST</span>
```

### Christmas Countdown

```html
<span class="wbe-countdown" style="display:none">Christmas 2025 | theme=red @ 2025-12-25</span>
```

### Centered with Custom Colors

```html
<span class="wbe-countdown" style="display:none">Special Event | color=white | bgcolor=#333 | centre @ 2026-01-01</span>
```
