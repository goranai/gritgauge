// GritGauge Go SDK
// AI-powered open-source maintainer tools for Go applications.
//
// Installation:
//   go get github.com/your-username/gritgauge-sdk-go
//
// Usage:
//   client := gritgauge.NewClient("http://localhost:3000", "your-api-key")
//   repo, err := client.GetRepo("facebook", "react")
//   triage, err := client.TriageIssue("Bug: App crashes", "Description...")

package gritgauge

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// ─── Types ───

// Priority represents issue priority levels.
type Priority string

const (
	PriorityCritical Priority = "critical"
	PriorityHigh     Priority = "high"
	PriorityMedium   Priority = "medium"
	PriorityLow      Priority = "low"
)

// RiskLevel represents PR risk levels.
type RiskLevel string

const (
	RiskHigh   RiskLevel = "high"
	RiskMedium RiskLevel = "medium"
	RiskLow    RiskLevel = "low"
)

// Recommendation represents PR review recommendations.
type Recommendation string

const (
	RecApprove        Recommendation = "approve"
	RecRequestChanges Recommendation = "request_changes"
	RecComment        Recommendation = "comment"
)

// ReportFormat represents export formats.
type ReportFormat string

const (
	FormatCSV      ReportFormat = "csv"
	FormatJSON     ReportFormat = "json"
	FormatMarkdown ReportFormat = "markdown"
	FormatPDF      ReportFormat = "pdf"
)

// ReportType represents report types.
type ReportType string

const (
	ReportHealth   ReportType = "health"
	ReportActivity ReportType = "activity"
	ReportSecurity ReportType = "security"
)

// RepoData contains repository information.
type RepoData struct {
	FullName    string   `json:"fullName"`
	Stars       int      `json:"stars"`
	Forks       int      `json:"forks"`
	OpenIssues  int      `json:"openIssues"`
	OpenPRs     int      `json:"openPRs"`
	Language    string   `json:"language"`
	HealthScore int      `json:"healthScore"`
	Description string   `json:"description"`
	Topics      []string `json:"topics"`
	License     string   `json:"license"`
}

// TriageResult contains AI triage results.
type TriageResult struct {
	IssueNumber        int      `json:"issueNumber"`
	Priority           string   `json:"priority"`
	SuggestedLabels    []string `json:"suggestedLabels"`
	Summary            string   `json:"summary"`
	Sentiment          string   `json:"sentiment"`
	EstimatedEffort    string   `json:"estimatedEffort"`
	IsDuplicate        bool     `json:"isDuplicate"`
	DuplicateOf        *int     `json:"duplicateOf"`
	SuggestedFirstStep string   `json:"suggestedFirstStep"`
}

// ReviewResult contains AI PR review results.
type ReviewResult struct {
	PRNumber         int      `json:"prNumber"`
	RiskLevel        string   `json:"riskLevel"`
	Recommendation   string   `json:"recommendation"`
	Summary          string   `json:"summary"`
	KeyChanges       []string `json:"keyChanges"`
	PotentialIssues  []string `json:"potentialIssues"`
	CodeQualityScore int      `json:"codeQualityScore"`
}

// HealthMetrics contains project health metrics.
type HealthMetrics struct {
	HealthScore      int     `json:"healthScore"`
	BusFactor        int     `json:"busFactor"`
	ResponseTimeAvg  float64 `json:"responseTimeAvg"`
	StaleIssueRatio  float64 `json:"staleIssueRatio"`
	ContributorCount int     `json:"contributorCount"`
	CommitFrequency  int     `json:"commitFrequency"`
}

// CompareResult contains repo comparison results.
type CompareResult struct {
	Repos  []CompareRepo `json:"repos"`
	Winner string        `json:"winner"`
}

// CompareRepo is a single repo in a comparison.
type CompareRepo struct {
	FullName    string `json:"fullName"`
	Stars       int    `json:"stars"`
	Forks       int    `json:"forks"`
	OpenIssues  int    `json:"openIssues"`
	HealthScore int    `json:"healthScore"`
	BusFactor   int    `json:"busFactor"`
}

// APIResponse is the standard API response wrapper.
type APIResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Error   string          `json:"error"`
	Meta    *APIMeta        `json:"meta"`
}

// APIMeta contains response metadata.
type APIMeta struct {
	Page             int     `json:"page"`
	Limit            int     `json:"limit"`
	Total            int     `json:"total"`
	TokensUsed       int     `json:"tokensUsed"`
	Cached           bool    `json:"cached"`
	ProcessingTimeMs float64 `json:"processingTimeMs"`
}

// ─── Client ───

// Client is the GritGauge API client.
type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
	MaxRetries int
	UserAgent  string
}

// NewClient creates a new GritGauge client.
func NewClient(apiURL string, apiKey string) *Client {
	return &Client{
		BaseURL: apiURL,
		APIKey:  apiKey,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		MaxRetries: 3,
		UserAgent:  "GritGauge-Go-SDK/2.0",
	}
}

// request performs an HTTP request with retry logic.
func (c *Client) request(method, endpoint string, body interface{}, queryParams map[string]string) (*APIResponse, error) {
	// Build URL
	u, err := url.Parse(c.BaseURL + endpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL: %w", err)
	}

	if len(queryParams) > 0 {
		q := u.Query()
		for k, v := range queryParams {
			q.Add(k, v)
		}
		u.RawQuery = q.Encode()
	}

	// Build body
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	var lastErr error
	for attempt := 0; attempt <= c.MaxRetries; attempt++ {
		req, err := http.NewRequest(method, u.String(), bodyReader)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", c.UserAgent)
		if c.APIKey != "" {
			req.Header.Set("Authorization", "Bearer "+c.APIKey)
		}

		resp, err := c.HTTPClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("request failed: %w", err)
			if attempt < c.MaxRetries {
				time.Sleep(time.Duration(1<<uint(attempt)) * time.Second)
				continue
			}
			return nil, lastErr
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read response: %w", err)
		}

		if resp.StatusCode >= 500 && attempt < c.MaxRetries {
			time.Sleep(time.Duration(1<<uint(attempt)) * time.Second)
			continue
		}

		var apiResp APIResponse
		if err := json.Unmarshal(respBody, &apiResp); err != nil {
			return nil, fmt.Errorf("failed to parse response: %w", err)
		}

		if resp.StatusCode >= 400 {
			return nil, fmt.Errorf("API error [%d]: %s", resp.StatusCode, apiResp.Error)
		}

		return &apiResp, nil
	}

	return nil, lastErr
}

// ─── Repository Methods ───

// GetRepo fetches repository information.
func (c *Client) GetRepo(owner, name string) (*RepoData, error) {
	resp, err := c.request("GET", "/api/github", nil, map[string]string{
		"repo": fmt.Sprintf("%s/%s", owner, name),
	})
	if err != nil {
		return nil, err
	}

	var wrapper struct {
		Repo RepoData `json:"repo"`
	}
	if err := json.Unmarshal(resp.Data, &wrapper); err != nil {
		return nil, fmt.Errorf("failed to parse repo data: %w", err)
	}

	return &wrapper.Repo, nil
}

// SaveRepo saves a repository for monitoring.
func (c *Client) SaveRepo(owner, name string, monitor bool) error {
	_, err := c.request("POST", "/api/repos", map[string]interface{}{
		"owner":       owner,
		"name":        name,
		"fullName":    fmt.Sprintf("%s/%s", owner, name),
		"isMonitored": monitor,
	}, nil)
	return err
}

// ListRepos lists all saved repositories.
func (c *Client) ListRepos() ([]RepoData, error) {
	resp, err := c.request("GET", "/api/repos", nil, nil)
	if err != nil {
		return nil, err
	}

	var repos []RepoData
	if err := json.Unmarshal(resp.Data, &repos); err != nil {
		return nil, fmt.Errorf("failed to parse repos: %w", err)
	}

	return repos, nil
}

// RemoveRepo removes a saved repository.
func (c *Client) RemoveRepo(repoID string) error {
	_, err := c.request("DELETE", "/api/repos", nil, map[string]string{
		"id": repoID,
	})
	return err
}

// ─── AI Methods ───

// TriageIssue runs AI-powered issue triage.
func (c *Client) TriageIssue(title, body string, labels []string) (*TriageResult, error) {
	resp, err := c.request("POST", "/api/triage", map[string]interface{}{
		"title":          title,
		"issueBody":      body,
		"existingLabels": labels,
	}, nil)
	if err != nil {
		return nil, err
	}

	var result TriageResult
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse triage result: %w", err)
	}

	return &result, nil
}

// ReviewPR runs AI-powered PR review.
func (c *Client) ReviewPR(title, body string, filesChanged, additions, deletions int) (*ReviewResult, error) {
	resp, err := c.request("POST", "/api/review", map[string]interface{}{
		"title":        title,
		"prBody":       body,
		"filesChanged": filesChanged,
		"additions":    additions,
		"deletions":    deletions,
	}, nil)
	if err != nil {
		return nil, err
	}

	var result ReviewResult
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse review result: %w", err)
	}

	return &result, nil
}

// ─── Analytics Methods ───

// GetHealth fetches project health metrics.
func (c *Client) GetHealth(repoID string) (*HealthMetrics, error) {
	resp, err := c.request("GET", "/api/analytics", nil, map[string]string{
		"repoId": repoID,
	})
	if err != nil {
		return nil, err
	}

	var metrics HealthMetrics
	if err := json.Unmarshal(resp.Data, &metrics); err != nil {
		return nil, fmt.Errorf("failed to parse health metrics: %w", err)
	}

	return &metrics, nil
}

// CompareRepos compares multiple repositories.
func (c *Client) CompareRepos(repoIDs ...string) (*CompareResult, error) {
	params := make(map[string]string)
	for i, id := range repoIDs {
		params[fmt.Sprintf("repoId[%d]", i)] = id
	}

	resp, err := c.request("GET", "/api/compare", nil, params)
	if err != nil {
		return nil, err
	}

	var comparison struct {
		Repos      []CompareRepo `json:"repos"`
		Comparison struct {
			Healthiest string `json:"healthiest"`
		} `json:"comparison"`
	}
	if err := json.Unmarshal(resp.Data, &comparison); err != nil {
		return nil, fmt.Errorf("failed to parse comparison: %w", err)
	}

	return &CompareResult{
		Repos:  comparison.Repos,
		Winner: comparison.Comparison.Healthiest,
	}, nil
}

// ─── Export Methods ───

// ExportReport generates a report.
func (c *Client) ExportReport(repoFullName string, format ReportFormat, reportType ReportType) (string, error) {
	resp, err := c.request("POST", "/api/export", map[string]interface{}{
		"repoFullName": repoFullName,
		"format":       string(format),
		"type":         string(reportType),
		"title":        fmt.Sprintf("GritGauge %s Report", reportType),
	}, nil)
	if err != nil {
		return "", err
	}

	return string(resp.Data), nil
}

// ─── Health Check ───

// Ping checks API health.
func (c *Client) Ping() (*APIResponse, error) {
	return c.request("GET", "/api/health", nil, nil)
}

// ─── Settings ───

// GetSettings retrieves user settings.
func (c *Client) GetSettings() (map[string]interface{}, error) {
	resp, err := c.request("GET", "/api/settings", nil, nil)
	if err != nil {
		return nil, err
	}

	var settings map[string]interface{}
	if err := json.Unmarshal(resp.Data, &settings); err != nil {
		return nil, fmt.Errorf("failed to parse settings: %w", err)
	}

	return settings, nil
}

// UpdateSettings updates user settings.
func (c *Client) UpdateSettings(settings map[string]interface{}) error {
	_, err := c.request("PUT", "/api/settings", settings, nil)
	return err
}

// ─── Notifications ───

// Notification represents a user notification.
type Notification struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Read      bool      `json:"read"`
	ActionURL string    `json:"actionUrl"`
	CreatedAt time.Time `json:"createdAt"`
}

// GetNotifications retrieves user notifications.
func (c *Client) GetNotifications() ([]Notification, error) {
	resp, err := c.request("GET", "/api/notifications", nil, nil)
	if err != nil {
		return nil, err
	}

	var notifications []Notification
	if err := json.Unmarshal(resp.Data, &notifications); err != nil {
		return nil, fmt.Errorf("failed to parse notifications: %w", err)
	}

	return notifications, nil
}

// MarkAllRead marks all notifications as read.
func (c *Client) MarkAllRead() error {
	_, err := c.request("PUT", "/api/notifications", map[string]interface{}{
		"markAllRead": true,
	}, nil)
	return err
}
