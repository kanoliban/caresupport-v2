"""Browser automation helper for Browserbase sessions.

Simple API for browser automation that persists across script runs:
    browser = await get_browser("checkout")  # Named session

Sessions are cached in /work/.browsers/ and automatically reconnected.
"""

from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    async_playwright,
)
from playwright.async_api import (
    TimeoutError as PlaywrightTimeoutError,
)

SESSIONS_DIR = Path("/work/.browsers")


def _as_dict(value: object) -> dict:
    if hasattr(value, "model_dump"):
        return value.model_dump()  # type: ignore[no-any-return]
    if isinstance(value, dict):
        return value
    return dict(value)


async def get_browser(name: str = "default", **create_kwargs) -> BrowserSession:
    """Get or create a browser session. Auto-reconnects across script runs.

    Args:
        name: Session name for caching (default: "default")
        **create_kwargs: Passed to browser_create_session if creating new
            - starting_url: str
            - viewport_width: int (default 1024)
            - viewport_height: int (default 768)
            - enable_proxies: bool (default False)
            - timeout_seconds: int (default 300)

    Returns:
        BrowserSession with helper methods and .page for raw Playwright
    """
    session_file = SESSIONS_DIR / f"{name}.json"

    if session_file.exists():
        try:
            data = json.loads(session_file.read_text())
            return await BrowserSession.connect(
                connect_url=data["connect_url"],
                session_id=data["session_id"],
                recording_url=data.get("recording_url"),
                live_view_url=data.get("live_view_url"),
            )
        except Exception:
            session_file.unlink(missing_ok=True)

    from sdk.tools import browser_tools

    session_info = await browser_tools.browser_create_session(**create_kwargs)
    data = _as_dict(session_info)
    if data.get("error"):
        raise RuntimeError(f"Failed to create session: {data['error']}")

    # Connect first, then cache - avoids stale cache if connection fails
    browser = await BrowserSession.connect(
        connect_url=data.get("connect_url"),
        session_id=data.get("session_id"),
        recording_url=data.get("recording_url"),
        live_view_url=data.get("live_view_url"),
    )

    # Only cache after successful connection
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    session_file.write_text(
        json.dumps(
            {
                "session_id": data.get("session_id"),
                "connect_url": data.get("connect_url"),
                "recording_url": data.get("recording_url"),
                "live_view_url": data.get("live_view_url"),
            }
        )
    )

    starting_url = create_kwargs.get("starting_url")
    if starting_url:
        await browser.goto(starting_url)

    return browser


async def close_browser(name: str = "default"):
    """Close a browser session and remove from cache."""
    session_file = SESSIONS_DIR / f"{name}.json"
    if not session_file.exists():
        return

    data = json.loads(session_file.read_text())
    try:
        from sdk.tools import browser_tools

        await browser_tools.browser_close_session(session_id=data["session_id"])
    finally:
        session_file.unlink(missing_ok=True)


def list_browser_sessions() -> list[str]:
    """List all cached browser session names."""
    if not SESSIONS_DIR.exists():
        return []
    return [f.stem for f in SESSIONS_DIR.glob("*.json")]


class BrowserSession:
    """Wrapper around Playwright for Browserbase sessions.

    Provides both:
    1. Helper methods for common actions (click, type, scroll, snapshot, etc.)
    2. Direct access to .page for advanced Playwright usage
    """

    def __init__(self):
        self._playwright = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None
        self.client = None
        self.session_id: str | None = None
        self.connect_url: str | None = None
        self.recording_url: str | None = None
        self.live_view_url: str | None = None
        self.cursor_x: int = 0
        self.cursor_y: int = 0

    @classmethod
    async def connect(
        cls,
        connect_url: str | None,
        session_id: str | None,
        recording_url: str | None = None,
        live_view_url: str | None = None,
    ) -> BrowserSession:
        """Connect to an existing Browserbase session."""
        if not connect_url or not session_id:
            raise RuntimeError("connect_url and session_id are required")

        self = cls()
        self.connect_url = connect_url
        self.session_id = session_id
        self.recording_url = recording_url or f"https://www.browserbase.com/sessions/{session_id}"
        self.live_view_url = live_view_url

        self._playwright = await async_playwright().start()
        try:
            self.browser = await self._playwright.chromium.connect_over_cdp(connect_url)
            self.context = self.browser.contexts[0] if self.browser.contexts else None
            if self.context is None:
                self.context = await self.browser.new_context()

            self.page = (
                self.context.pages[0] if self.context.pages else await self.context.new_page()
            )
            self.client = await self.page.context.new_cdp_session(self.page)

            await self.client.send(
                "Browser.setDownloadBehavior",
                {
                    "behavior": "allow",
                    "downloadPath": "downloads",
                    "eventsEnabled": True,
                },
            )
            return self
        except Exception:
            # Cleanup playwright on connection failure to prevent resource leaks
            await self._playwright.stop()
            raise

    # === Navigation ===
    async def goto(self, url: str, timeout: int = 30000):
        """Navigate to URL."""
        await self.page.goto(url, timeout=timeout)

    async def go_back(self):
        try:
            await self.page.go_back(timeout=5000)
            await asyncio.sleep(0.5)
        except PlaywrightTimeoutError:
            await asyncio.sleep(1.0)

    async def go_forward(self):
        try:
            await self.page.go_forward(timeout=5000)
            await asyncio.sleep(0.5)
        except PlaywrightTimeoutError:
            await asyncio.sleep(1.0)

    async def reload(self):
        await self.page.reload(timeout=30000)

    # === Mouse actions (with sleep for page to settle) ===
    async def click(self, x: int, y: int):
        """Click at coordinates."""
        self.cursor_x, self.cursor_y = x, y
        await self.page.mouse.click(x, y)
        await asyncio.sleep(0.5)

    async def double_click(self, x: int, y: int):
        """Double-click at coordinates."""
        self.cursor_x, self.cursor_y = x, y
        await self.page.mouse.dblclick(x, y)
        await asyncio.sleep(0.5)

    async def right_click(self, x: int, y: int):
        """Right-click at coordinates."""
        self.cursor_x, self.cursor_y = x, y
        await self.page.mouse.click(x, y, button="right")
        await asyncio.sleep(0.3)

    async def mouse_move(self, x: int, y: int):
        """Move mouse to coordinates."""
        self.cursor_x, self.cursor_y = x, y
        await self.page.mouse.move(x, y)

    async def drag(self, start_x: int, start_y: int, end_x: int, end_y: int):
        """Drag from start to end coordinates."""
        await self.page.mouse.move(start_x, start_y)
        await self.page.mouse.down()
        await self.page.mouse.move(end_x, end_y)
        await self.page.mouse.up()
        self.cursor_x, self.cursor_y = end_x, end_y
        await asyncio.sleep(0.3)

    # === Keyboard (with sleep for page to settle) ===
    async def type_text(self, text: str):
        """Type text at current focus."""
        await self.page.keyboard.type(text)
        await asyncio.sleep(0.2)

    async def press_key(self, key: str):
        """Press key (Enter, Tab, Escape, Ctrl+A, etc.)."""
        key_mapping = {
            "ctrl": "Control",
            "alt": "Alt",
            "shift": "Shift",
            "meta": "Meta",
            "cmd": "Meta",
            "super": "Meta",
            "win": "Meta",
            "return": "Enter",
            "esc": "Escape",
            "backspace": "Backspace",
            "delete": "Delete",
            "tab": "Tab",
            "space": " ",
            "pageup": "PageUp",
            "pagedown": "PageDown",
            "home": "Home",
            "end": "End",
            "up": "ArrowUp",
            "down": "ArrowDown",
            "left": "ArrowLeft",
            "right": "ArrowRight",
        }

        keys = key.replace(" ", "").split("+")
        mapped_keys = [key_mapping.get(k.lower(), k) for k in keys]

        if len(mapped_keys) == 1:
            await self.page.keyboard.press(mapped_keys[0])
        else:
            for k in mapped_keys[:-1]:
                await self.page.keyboard.down(k)
            await self.page.keyboard.press(mapped_keys[-1])
            for k in reversed(mapped_keys[:-1]):
                await self.page.keyboard.up(k)
        await asyncio.sleep(0.2)

    # === Scrolling ===
    async def scroll(self, direction: str, amount: int = 3):
        """Scroll in direction (up/down/left/right)."""
        pixels = amount * 100
        if direction == "up":
            await self.page.mouse.wheel(0, -pixels)
        elif direction == "down":
            await self.page.mouse.wheel(0, pixels)
        elif direction == "left":
            await self.page.mouse.wheel(-pixels, 0)
        elif direction == "right":
            await self.page.mouse.wheel(pixels, 0)
        await asyncio.sleep(0.3)

    # === Screenshots & Snapshots ===
    async def take_screenshot(self, path: str | None = None, quality: int = 80) -> bytes:
        """Take screenshot, optionally save to path."""
        screenshot = await self.page.screenshot(type="jpeg", quality=quality)
        if path:
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            Path(path).write_bytes(screenshot)
        return screenshot

    async def snapshot(self) -> dict:
        """Take screenshot + get accessibility tree.

        Returns:
            {
                "screenshot_path": str,
                "accessibility_tree": str,
                "page_info": dict,
            }
        """
        timestamp = int(time.time() * 1000)
        screenshot_path = f"/work/temp/snapshot_{self.session_id[:8]}_{timestamp}.jpg"
        await self.take_screenshot(screenshot_path)

        tree = await self.get_accessibility_tree()
        info = await self.get_page_info()

        return {
            "screenshot_path": screenshot_path,
            "accessibility_tree": tree,
            "page_info": info,
        }

    async def get_accessibility_tree(self, viewport_only: bool = True) -> str:
        """Get DOM accessibility tree for understanding page structure."""
        if viewport_only:
            js_script = """
            () => {
                const vp = window.visualViewport || { width: window.innerWidth, height: window.innerHeight };
                const results = [];

                function isInViewport(el) {
                    const rect = el.getBoundingClientRect();
                    return (
                        rect.top < vp.height && rect.bottom > 0 &&
                        rect.left < vp.width && rect.right > 0 &&
                        rect.width > 0 && rect.height > 0
                    );
                }

                function getInfo(el) {
                    const tag = el.tagName.toLowerCase();
                    const role = el.getAttribute("role") ||
                                 (tag === "a" ? "link" : tag === "img" ? "image" :
                                  tag === "input" ? (el.type || "text") : tag === "button" ? "button" : tag);
                    const name = el.getAttribute("aria-label") ||
                                 el.getAttribute("alt") || el.getAttribute("title") ||
                                 el.getAttribute("placeholder") ||
                                 (["A", "BUTTON", "LABEL", "H1", "H2", "H3", "H4", "H5", "H6", "P", "SPAN", "LI", "TD", "TH"].includes(el.tagName)
                                  ? el.innerText.trim().slice(0, 100) : null);
                    const value = el.value || null;
                    return { role, name, value };
                }

                const selectors = "a, button, input, select, textarea, img, [role], h1, h2, h3, h4, h5, h6, p, li, td, th, label, span";
                document.querySelectorAll(selectors).forEach(el => {
                    if (isInViewport(el) && el.offsetParent !== null) {
                        const info = getInfo(el);
                        if (info.name && info.name.length > 0) {
                            results.push(info);
                        }
                    }
                });

                return results;
            }
            """

            try:
                elements = await self.page.evaluate(js_script)
                lines = []
                for el in elements[:100]:
                    parts = [f"[{el['role']}]"]
                    if el.get("name"):
                        parts.append(f'"{el["name"]}"')
                    if el.get("value"):
                        parts.append(f"value={el['value']}")
                    lines.append(" ".join(parts))
                return "\n".join(lines) if lines else "No interactive elements visible in viewport"
            except Exception:
                pass

        accessibility_tree = await self.page.accessibility.snapshot()

        def format_node(node, indent=0):
            lines = []
            name = node.get("name", "")
            role = node.get("role", "")
            value = node.get("value", "")

            if role in ["none", "generic", "group"] and not name:
                pass
            elif name or role not in ["none", "generic"]:
                parts = []
                if role:
                    parts.append(f"[{role}]")
                if name:
                    parts.append(f'"{name}"')
                if value:
                    parts.append(f"value={value}")
                if parts:
                    lines.append("  " * indent + " ".join(parts))

            for child in node.get("children", []):
                lines.extend(format_node(child, indent + 1))

            return lines

        if accessibility_tree:
            lines = format_node(accessibility_tree)
            return "\n".join(lines[:500])
        return "Unable to get accessibility tree"

    async def get_page_info(self) -> dict:
        """Get current page info."""
        viewport = self.page.viewport_size or {"width": 0, "height": 0}
        scroll_y = await self.page.evaluate("window.scrollY")
        scroll_x = await self.page.evaluate("window.scrollX")
        page_height = await self.page.evaluate("document.documentElement.scrollHeight")
        page_width = await self.page.evaluate("document.documentElement.scrollWidth")

        return {
            "url": self.page.url,
            "title": await self.page.title(),
            "viewport_width": viewport["width"],
            "viewport_height": viewport["height"],
            "scroll_x": scroll_x,
            "scroll_y": scroll_y,
            "page_width": page_width,
            "page_height": page_height,
            "cursor_x": self.cursor_x,
            "cursor_y": self.cursor_y,
        }

    # === File Downloads ===
    async def download_files(self, target_directory: str = "/work/downloads") -> list[str]:
        """Download files from browser session to sandbox."""
        from sdk.tools import browser_tools

        result = await browser_tools.browser_download_files(
            session_id=self.session_id, target_directory=target_directory
        )
        data = _as_dict(result)
        if data.get("error"):
            raise RuntimeError(data["error"])
        return data.get("files", [])

    # === Cleanup ===
    async def disconnect(self):
        """Disconnect from browser (session stays alive for reconnection)."""
        if self.browser:
            await self.browser.close()
            self.browser = None
            self.page = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

    async def close(self):
        """Alias for disconnect."""
        await self.disconnect()
