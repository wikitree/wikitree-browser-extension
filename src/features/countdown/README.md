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

### Event Duration Options

- `endDate=2026-07-05` - When the event ends (creates "happening now" phase)
- `hideAfter=24h` or `hideAfter=7d` - Hide countdown after event ends (hours or days)

### Happening Text

- `happening=Custom text` - Text shown while the event is in progress. You can include the placeholder `{event}` which will be replaced with the event label.

Examples:

```html
<span class="wbe-countdown" style="display:none"
  >Conference 2026 | theme=blue | endDate=2026-03-17 | happening={event} is in progress! @ 2026-03-15</span
>
```

```html
<span class="wbe-countdown" style="display:none"
  >Anniversary | theme=gold | happening=Happy Anniversary! | endDate=2026-06-17 @ 2026-06-15</span
>
```

### Other Options

- `complete=Custom message` - Text shown when countdown reaches zero

## Examples

### Sandy's 1776 Project - Centered Gold Theme

```html
<span class="wbe-countdown" style="display:none"
  >American Revolution • 250th Anniversary | theme=gold | center | endDate=2026-07-05 | hideAfter=7d | happening=Happy
  250th Anniversary to the United States! @ 2026-07-04
</span>
```

### Basic Anniversary Countdown

```html
<span class="wbe-countdown" style="display:none">American Revolution 250th Anniversary @ 2026-07-04</span>
```

### Centered with Time

```html
<span class="wbe-countdown" style="display:none"
  >Independence Day Ceremony | theme=gold | center @ 2026-07-04T14:00:00 EST</span
>
```

### Christmas Countdown

```html
<span class="wbe-countdown" style="display:none">Christmas 2025 | theme=red @ 2025-12-25</span>
```

### Centered with Custom Colors

```html
<span class="wbe-countdown" style="display:none">Special Event | color=white | bgcolor=#333 | centre @ 2026-01-01</span>
```

### Multi-Day Event with Duration

```html
<span class="wbe-countdown" style="display:none"
  >WikiTree Conference 2026 | theme=blue | endDate=2026-03-17 | hideAfter=24h @ 2026-03-15</span
>
```

### Wedding Anniversary (3-Day Celebration)

```html
<span class="wbe-countdown" style="display:none"
  >Our 50th Anniversary | theme=gold | center | endDate=2026-06-17 | hideAfter=7d @ 2026-06-15</span
>
```

### Single-Day Event (No End Date)

```html
<span class="wbe-countdown" style="display:none">Independence Day | theme=red | hideAfter=12h @ 2026-07-04</span>
```
