import os
import socket
import sys
import threading
import time
import traceback as tb
from datetime import datetime, timedelta, timezone
from typing import Callable

from .middleware import get_inflight_requests
from .models import HostStatus


def get_host_id() -> str:
    """Return a stable identifier for the current host/process."""
    return os.environ.get("HOST_NAME", os.environ.get("HOSTNAME", socket.gethostname()))


def _collect_threads() -> list:
    current_frames = sys._current_frames()
    result = []
    for t in threading.enumerate():
        frame = current_frames.get(t.ident) if t.ident else None
        stack = tb.format_stack(frame) if frame else []
        result.append(
            {
                "id": t.ident,
                "name": t.name,
                "daemon": t.daemon,
                "alive": t.is_alive(),
                "stack_trace": stack,
            }
        )
    return result


def _do_sync(get_session: Callable, host_id: str) -> None:
    now = datetime.now(timezone.utc)

    raw_inflight = get_inflight_requests()
    inflight = []
    for r in sorted(raw_inflight.values(), key=lambda x: x.get("started_at", "")):
        inflight.append(
            {
                "request_id": r["request_id"],
                "method": r["method"],
                "path": r["path"],
                "url": r["url"],
                "client_ip": r["client_ip"],
                "started_at": r["started_at"],
            }
        )

    threads = _collect_threads()
    daemon_ct = sum(1 for t in threads if t["daemon"])
    non_daemon_ct = sum(1 for t in threads if not t["daemon"])

    with get_session() as session:
        dupes = session.query(HostStatus).filter(HostStatus.host_id == host_id).all()
        if len(dupes) > 1:
            for row in dupes[1:]:
                session.delete(row)
            session.commit()

        session.merge(
            HostStatus(
                host_id=host_id,
                inflight_requests=inflight,
                threads=threads,
                inflight_total=len(inflight),
                thread_total=len(threads),
                daemon_count=daemon_ct,
                non_daemon_count=non_daemon_ct,
                last_seen=now,
            )
        )
        session.commit()

        cutoff = now - timedelta(hours=1)
        session.query(HostStatus).filter(HostStatus.last_seen < cutoff).delete()
        session.commit()


def start_host_sync(get_session: Callable, host_id: str) -> threading.Thread:
    """Start a daemon thread that syncs host state to the DB in the background."""
    interval = float(os.environ.get("RADAR_HOST_SYNC_INTERVAL", "2"))

    def _loop() -> None:
        # Small initial delay so the DB tables are ready before first write.
        time.sleep(1)
        while True:
            try:
                _do_sync(get_session, host_id)
            except Exception:
                pass  # never crash the background thread
            time.sleep(interval)

    t = threading.Thread(target=_loop, name="radar-host-sync", daemon=True)
    t.start()
    return t
