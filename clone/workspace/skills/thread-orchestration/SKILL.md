---
name: thread-orchestration
description: Monitor and coordinate parallel agent threads. Use when checking thread progress, listing running threads, or debugging stuck workflows.
---

These monitoring tools are available via Python scripts (`from sdk.tools import ...`).

Note: `create_thread`, `send_message_to_thread`, and `wait_for_paths` are native tools — call them directly. This skill covers the SDK-only *monitoring* tools.

## 1. List Running Paths — `list_running_paths`

List all currently running agent threads.

```python
from sdk.tools import thread_orchestration_tools

result = await thread_orchestration_tools.list_running_paths()
for path in result.running_paths:
    print(f"Running: {path}")
```

- **Input**: None
- **Output**: `running_paths` (list[str]) — paths of currently active threads
- **When to use**: Before creating new threads (check load), monitoring progress of spawned work, debugging stuck workflows

## 2. Get Path Info — `get_path_info`

Get detailed information about any path — works for both cron jobs and threads.

```python
from sdk.tools import thread_orchestration_tools

result = await thread_orchestration_tools.get_path_info(path="/reports/weekly")
if result.info:
    if result.info.path_type == "cron":
        print(f"Cron: {result.info.cron.title} ({result.info.cron.cron})")
    elif result.info.path_type == "thread":
        print(f"Thread: {result.info.thread.title} - {result.info.thread.status}")
    else:
        print("Path not found")
```

- **Input**: `path` (str) — the path to look up
- **Output**: `info.path_type` (`"cron"`, `"thread"`, or `"not_found"`), plus `info.cron` or `info.thread` details
- **Cron info**: `id`, `path`, `title`, `description`, `cron`, `dependent_paths`, `deleted`, `created_at`, `updated_at`, `threads`
- **Thread info**: `id`, `title`, `status`, `timestamp`, `updated`, `path`, `thread_type`
- **When to use**: Checking if a path exists before creating it, inspecting cron schedules, debugging thread status

## Common Workflows

### Fan-out / fan-in pattern

1. Create threads with `create_thread` (native tool)
2. Call `wait_for_paths` directly (native tool) with the paths and a timeout
3. Once complete, compile results

### Monitor and report on running work

```python
from sdk.tools import thread_orchestration_tools

running = await thread_orchestration_tools.list_running_paths()
for path in running.running_paths:
    info = await thread_orchestration_tools.get_path_info(path=path)
    if info.info and info.info.path_type == "thread":
        t = info.info.thread
        print(f"{t.title}: {t.status} (updated: {t.updated})")
```

## Quick Reference

| Need                 | Tool                    |
| -------------------- | ----------------------- |
| List active threads  | `list_running_paths()`  |
| Inspect a path       | `get_path_info(path)`   |

These are async SDK tools — run scripts with `uv run python script.py`.
<!-- ══════════════════════════════════════════════════════════════════════════
