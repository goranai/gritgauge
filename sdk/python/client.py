"""
GritGauge Python SDK
====================
AI-powered open-source maintainer tools for Python applications.

Installation:
    pip install gritgauge-sdk

Usage:
    from gritgauge import GritGaugeClient

    client = GritGaugeClient(api_url="http://localhost:3000", api_key="your-key")
    repo = client.get_repo("facebook", "react")
    triage = client.triage_issue("Bug: App crashes", "Description here...")
"""

from __future__ import annotations
import json
import time
import logging
from typing import Any, Optional, Dict, List, Union
from dataclasses import dataclass, field, asdict
from enum import Enum
import urllib.request
import urllib.error
import urllib.parse

logger = logging.getLogger("gritgauge")

# ─── Data Classes ───

class Priority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Effort(str, Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"

class RiskLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Recommendation(str, Enum):
    APPROVE = "approve"
    REQUEST_CHANGES = "request_changes"
    COMMENT = "comment"

class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"

class ReportFormat(str, Enum):
    PDF = "pdf"
    CSV = "csv"
    JSON = "json"
    MARKDOWN = "markdown"

class ReportType(str, Enum):
    HEALTH = "health"
    ACTIVITY = "activity"
    SECURITY = "security"
    CUSTOM = "custom"

@dataclass
class RepoData:
    full_name: str = ""
    stars: int = 0
    forks: int = 0
    open_issues: int = 0
    open_prs: int = 0
    language: Optional[str] = None
    health_score: int = 0
    description: Optional[str] = None
    topics: List[str] = field(default_factory=list)

@dataclass
class TriageResult:
    issue_number: int = 0
    priority: str = "medium"
    suggested_labels: List[str] = field(default_factory=list)
    summary: str = ""
    sentiment: str = "neutral"
    effort: str = "medium"
    is_duplicate: bool = False
    duplicate_of: Optional[int] = None
    suggested_first_step: str = ""

@dataclass
class ReviewResult:
    pr_number: int = 0
    risk_level: str = "medium"
    recommendation: str = "comment"
    summary: str = ""
    key_changes: List[str] = field(default_factory=list)
    potential_issues: List[str] = field(default_factory=list)
    code_quality_score: int = 0

@dataclass
class HealthMetrics:
    health_score: int = 0
    bus_factor: int = 0
    response_time_avg: float = 0.0
    stale_issue_ratio: float = 0.0
    contributor_count: int = 0
    commit_frequency: int = 0

@dataclass
class CompareResult:
    repos: List[Dict[str, Any]] = field(default_factory=list)
    winner: str = ""

# ─── Client ───

class GritGaugeClient:
    """Python client for the GritGauge API."""

    def __init__(
        self,
        api_url: str,
        api_key: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        self._session_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "GritGauge-Python-SDK/2.0",
        }
        if api_key:
            self._session_headers["Authorization"] = f"Bearer {api_key}"

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make an HTTP request with retry logic."""
        url = f"{self.api_url}{endpoint}"
        if params:
            query_string = urllib.parse.urlencode(
                {k: v for k, v in params.items() if v is not None}
            )
            url = f"{url}?{query_string}"

        body = json.dumps(data).encode("utf-8") if data else None

        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                req = urllib.request.Request(
                    url,
                    data=body,
                    headers=self._session_headers,
                    method=method,
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    return json.loads(response.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                error_body = e.read().decode("utf-8") if e.fp else ""
                last_error = f"HTTP {e.code}: {error_body}"
                if e.code in (429, 503) and attempt < self.max_retries:
                    time.sleep(2 ** attempt)
                    continue
                raise GritGaugeAPIError(last_error, e.code) from e
            except urllib.error.URLError as e:
                last_error = str(e.reason)
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt)
                    continue
                raise GritGaugeConnectionError(last_error) from e
            except Exception as e:
                last_error = str(e)
                if attempt < self.max_retries:
                    time.sleep(2 ** attempt)
                    continue
                raise GritGaugeError(last_error) from e

        raise GritGaugeError(last_error or "Request failed")

    # ─── Repository Methods ───

    def get_repo(self, owner: str, name: str) -> RepoData:
        """Fetch repository information from GitHub."""
        response = self._request("GET", "/api/github", params={"repo": f"{owner}/{name}"})
        data = response.get("data", {})
        repo = data.get("repo", {})
        return RepoData(
            full_name=repo.get("fullName", f"{owner}/{name}"),
            stars=repo.get("stars", 0),
            forks=repo.get("forks", 0),
            open_issues=repo.get("openIssues", 0),
            open_prs=repo.get("openPRs", 0),
            language=repo.get("language"),
            health_score=repo.get("healthScore", 0),
            description=repo.get("description"),
            topics=repo.get("topics", []),
        )

    def save_repo(self, owner: str, name: str, monitor: bool = True) -> None:
        """Save a repository for monitoring."""
        self._request("POST", "/api/repos", data={
            "owner": owner,
            "name": name,
            "fullName": f"{owner}/{name}",
            "isMonitored": monitor,
        })

    def list_repos(self) -> List[RepoData]:
        """List all saved repositories."""
        response = self._request("GET", "/api/repos")
        repos = response.get("data", [])
        return [RepoData(
            full_name=r.get("fullName", ""),
            stars=r.get("stars", 0),
            forks=r.get("forks", 0),
            open_issues=r.get("openIssues", 0),
            open_prs=r.get("openPRs", 0),
            language=r.get("language"),
            health_score=r.get("healthScore", 0),
        ) for r in repos]

    def remove_repo(self, repo_id: str) -> None:
        """Remove a saved repository."""
        self._request("DELETE", "/api/repos", params={"id": repo_id})

    # ─── AI Methods ───

    def triage_issue(
        self,
        title: str,
        body: Optional[str] = None,
        labels: Optional[List[str]] = None,
    ) -> TriageResult:
        """Run AI-powered issue triage."""
        response = self._request("POST", "/api/triage", data={
            "title": title,
            "issueBody": body,
            "existingLabels": labels or [],
        })
        data = response.get("data", response)
        return TriageResult(
            issue_number=data.get("issueNumber", 0),
            priority=data.get("priority", "medium"),
            suggested_labels=data.get("suggestedLabels", []),
            summary=data.get("summary", ""),
            sentiment=data.get("sentiment", "neutral"),
            effort=data.get("estimatedEffort", "medium"),
            is_duplicate=data.get("isDuplicate", False),
            duplicate_of=data.get("duplicateOf"),
            suggested_first_step=data.get("suggestedFirstStep", ""),
        )

    def review_pr(
        self,
        title: str,
        body: Optional[str] = None,
        files_changed: int = 0,
        additions: int = 0,
        deletions: int = 0,
    ) -> ReviewResult:
        """Run AI-powered PR review."""
        response = self._request("POST", "/api/review", data={
            "title": title,
            "prBody": body,
            "filesChanged": files_changed,
            "additions": additions,
            "deletions": deletions,
        })
        data = response.get("data", response)
        return ReviewResult(
            pr_number=data.get("prNumber", 0),
            risk_level=data.get("riskLevel", "medium"),
            recommendation=data.get("recommendation", "comment"),
            summary=data.get("summary", ""),
            key_changes=data.get("keyChanges", []),
            potential_issues=data.get("potentialIssues", []),
            code_quality_score=data.get("codeQualityScore", 0),
        )

    # ─── Analytics Methods ───

    def get_health(self, repo_id: str) -> HealthMetrics:
        """Get project health metrics."""
        response = self._request("GET", "/api/analytics", params={"repoId": repo_id})
        data = response.get("data", {})
        return HealthMetrics(
            health_score=data.get("healthScore", 0),
            bus_factor=data.get("busFactor", 0),
            response_time_avg=data.get("responseTimeAvg", 0.0),
            stale_issue_ratio=data.get("staleIssueRatio", 0.0),
            contributor_count=data.get("contributorCount", 0),
            commit_frequency=data.get("commitFrequency", 0),
        )

    def compare_repos(self, *repo_ids: str) -> CompareResult:
        """Compare multiple repositories."""
        params = [("repoId", rid) for rid in repo_ids]
        response = self._request("GET", "/api/compare", params=dict(params))
        data = response.get("data", {})
        return CompareResult(
            repos=data.get("repos", []),
            winner=data.get("comparison", {}).get("healthiest", ""),
        )

    # ─── Export Methods ───

    def export_report(
        self,
        repo_full_name: str,
        format: ReportFormat = ReportFormat.MARKDOWN,
        type: ReportType = ReportType.HEALTH,
    ) -> str:
        """Generate and download a report."""
        response = self._request("POST", "/api/export", data={
            "repoFullName": repo_full_name,
            "format": format.value,
            "type": type.value,
            "title": f"GritGauge {type.value} Report",
        })
        return json.dumps(response, indent=2)

    # ─── Health Check ───

    def ping(self) -> Dict[str, Any]:
        """Check API health."""
        return self._request("GET", "/api/health")

    # ─── Settings ───

    def get_settings(self) -> Dict[str, Any]:
        """Get user settings."""
        response = self._request("GET", "/api/settings")
        return response.get("data", {})

    def update_settings(self, settings: Dict[str, Any]) -> None:
        """Update user settings."""
        self._request("PUT", "/api/settings", data=settings)

    # ─── Webhooks ───

    def create_webhook(self, url: str, events: List[str], secret: Optional[str] = None) -> Dict[str, Any]:
        """Create a new webhook."""
        import secrets as sec
        response = self._request("POST", "/api/webhooks", data={
            "url": url,
            "events": events,
            "secret": secret or sec.token_hex(32),
        })
        return response.get("data", {})

    def list_webhooks(self) -> List[Dict[str, Any]]:
        """List all webhooks."""
        response = self._request("GET", "/api/webhooks")
        return response.get("data", [])

    def delete_webhook(self, webhook_id: str) -> None:
        """Delete a webhook."""
        self._request("DELETE", "/api/webhooks", params={"id": webhook_id})

    # ─── Notifications ───

    def get_notifications(self) -> List[Dict[str, Any]]:
        """Get user notifications."""
        response = self._request("GET", "/api/notifications")
        return response.get("data", [])

    def mark_all_read(self) -> None:
        """Mark all notifications as read."""
        self._request("PUT", "/api/notifications", data={"markAllRead": True})


# ─── Exceptions ───

class GritGaugeError(Exception):
    """Base exception for GritGauge SDK."""
    pass

class GritGaugeAPIError(GritGaugeError):
    """API returned an error response."""
    def __init__(self, message: str, status_code: int = 0):
        self.status_code = status_code
        super().__init__(f"[{status_code}] {message}")

class GritGaugeConnectionError(GritGaugeError):
    """Failed to connect to the API."""
    pass


# ─── Convenience Functions ───

def quick_triage(api_url: str, repo: str, title: str, api_key: Optional[str] = None) -> TriageResult:
    """One-shot triage without creating a client."""
    client = GritGaugeClient(api_url, api_key)
    return client.triage_issue(title)

def quick_review(api_url: str, title: str, body: str, api_key: Optional[str] = None) -> ReviewResult:
    """One-shot PR review without creating a client."""
    client = GritGaugeClient(api_url, api_key)
    return client.review_pr(title, body)


# ─── CLI Entry Point ───

def main():
    """Command-line interface for the Python SDK."""
    import argparse

    parser = argparse.ArgumentParser(description="GritGauge Python SDK CLI")
    parser.add_argument("--api-url", default="http://localhost:3000", help="GritGauge API URL")
    parser.add_argument("--api-key", help="API key for authentication")
    subparsers = parser.add_subparsers(dest="command")

    # triage
    triage_parser = subparsers.add_parser("triage", help="Triage an issue")
    triage_parser.add_argument("--title", required=True)
    triage_parser.add_argument("--body")
    triage_parser.add_argument("--labels", nargs="*", default=[])

    # review
    review_parser = subparsers.add_parser("review", help="Review a PR")
    review_parser.add_argument("--title", required=True)
    review_parser.add_argument("--body")
    review_parser.add_argument("--files", type=int, default=0)

    # health
    health_parser = subparsers.add_parser("health", help="Check repo health")
    health_parser.add_argument("--repo-id", required=True)

    args = parser.parse_args()
    client = GritGaugeClient(args.api_url, args.api_key)

    if args.command == "triage":
        result = client.triage_issue(args.title, args.body, args.labels)
        print(f"Priority: {result.priority}")
        print(f"Labels: {', '.join(result.suggested_labels)}")
        print(f"Summary: {result.summary}")
    elif args.command == "review":
        result = client.review_pr(args.title, args.body, args.files)
        print(f"Risk: {result.risk_level}")
        print(f"Recommendation: {result.recommendation}")
        print(f"Summary: {result.summary}")
    elif args.command == "health":
        result = client.get_health(args.repo_id)
        print(f"Health Score: {result.health_score}/100")
        print(f"Bus Factor: {result.bus_factor}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
