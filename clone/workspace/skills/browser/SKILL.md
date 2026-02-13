---
name: browser
description: Browse websites, fill forms, and scrape web data with a real browser. Use when interacting with websites or automating web tasks without api access.
---

## Overview

The browser SDK provides browser automation through Browserbase:
- Sessions are recorded and viewable at the recording URL
- Sessions persist across script runs (auto-reconnect)
- Full Playwright API available via `browser.page`

## API Reference

Session management (top-level):
- `get_browser(name: str = "default", **create_kwargs) -> BrowserSession`
  - `starting_url: str | None`
  - `viewport_width: int = 1024`
  - `viewport_height: int = 768`
  - `enable_proxies: bool = False`
  - `timeout_seconds: int = 300`
- `close_browser(name: str = "default") -> None`
- `list_browser_sessions() -> list[str]`

BrowserSession fields:
- `session_id: str | None`
- `connect_url: str | None`
- `recording_url: str | None`
- `live_view_url: str | None`
- `page: Playwright Page` (direct access)

BrowserSession methods:
- Navigation:
  - `goto(url: str, timeout: int = 30000)`
  - `go_back()`
  - `go_forward()`
  - `reload()`
- Mouse:
  - `click(x: int, y: int)`
  - `double_click(x: int, y: int)`
  - `right_click(x: int, y: int)`
  - `mouse_move(x: int, y: int)`
  - `drag(start_x: int, start_y: int, end_x: int, end_y: int)`
- Keyboard:
  - `type_text(text: str)`
  - `press_key(key: str)` (e.g., `"Enter"`, `"Ctrl+A"`, `"Tab"`)
- Scroll:
  - `scroll(direction: str, amount: int = 3)` where direction is `up|down|left|right`
- Snapshots:
  - `take_screenshot(path: str | None = None, quality: int = 80) -> bytes`
  - `snapshot() -> dict` (screenshot + accessibility tree + page info)
  - `get_accessibility_tree(viewport_only: bool = True) -> str`
  - `get_page_info() -> dict`
- Downloads:
  - `download_files(target_directory: str = "/work/downloads") -> list[str]`
- Cleanup:
  - `disconnect()` (keeps session alive for later reconnect)
  - `close()` (alias for `disconnect`)

Snapshot returns a full object (print it):
```python
snapshot = await browser.snapshot()
print(snapshot)
# {"screenshot_path": "...", "accessibility_tree": "...", "page_info": {...}}
```

## Use Case 1: Exploration (Step-by-Step)

Separate bash runs, always reconnect with the same named session:
```python
from sdk.utils.browser import get_browser, close_browser

# Step 1
browser = await get_browser("login-task")
await browser.goto("https://example.com")
print(await browser.snapshot())

# Step 2
browser = await get_browser("login-task")
await browser.click(x=400, y=250)
await browser.type_text("hello")
print(await browser.snapshot())

# Step 3
browser = await get_browser("login-task")
await browser.press_key("Enter")
print(await browser.snapshot())
await close_browser("login-task")
```

## Use Case 2: Automation (Single Script)

Once you know the flow, automate in one run:
```python
from sdk.utils.browser import get_browser, close_browser

browser = await get_browser("scrape-task")
await browser.goto("https://example.com/products")
await browser.page.wait_for_selector(".product")
titles = await browser.page.locator(".product-title").all_text_contents()
print(titles)
await close_browser("scrape-task")
```

## Direct Playwright Access

```python
await browser.page.wait_for_selector(".result")
await browser.page.fill("input[name='email']", "test@example.com")
await browser.page.locator("button:has-text('Submit')").click()
```

## Downloads

```python
await browser.click(x=200, y=300)
files = await browser.download_files("/work/downloads")
print(files)
```

## Best Practices

1. **Always use named sessions** - `get_browser("task-name")` to avoid collisions
2. **Exploration vs Automation** - step-by-step for discovery, single script for repeatable tasks
3. **Snapshot often** - use `snapshot()` to verify each step
4. **Use Playwright waits** - `page.wait_for_selector()` is more reliable than fixed delays
5. **Close sessions when done** - `await close_browser("task-name")`
<!-- ══════════════════════════════════════════════════════════════════════════
