<?php

namespace App\Services\ProjectManagement;

use App\Models\Project;
use App\Models\ProjectHubstaffToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HubstaffService
{
    /**
     * Buffer time in seconds before token expiration to trigger an early refresh.
     */
    protected const EXPIRY_BUFFER_SECONDS = 300;

    /**
     * Retrieve a valid access token.
     *
     * 1. Checks pm_hubstaff_tokens (id=1) for a valid unexpired access token.
     * 2. If expired or missing, performs an OAuth2 refresh exchange with Hubstaff
     *    using the stored refresh token or the bootstrap HUBSTAFF_REFRESH_TOKEN env.
     * 3. Persists rotated refresh token & fresh access token to pm_hubstaff_tokens.
     * 4. Backward compatibility: falls back to static personal/access tokens if configured.
     */
    protected function getValidAccessToken(): ?string
    {
        $dbRecord = ProjectHubstaffToken::find(1);

        // 1. Check if existing DB access token is still valid (with a 5-minute safety buffer)
        if (
            $dbRecord &&
            !empty($dbRecord->access_token) &&
            !empty($dbRecord->expires_at) &&
            $dbRecord->expires_at > (now()->timestamp + self::EXPIRY_BUFFER_SECONDS)
        ) {
            return $dbRecord->access_token;
        }

        // 2. Identify refresh token (DB stored has highest precedence, fallback to env)
        $refreshToken = null;
        if ($dbRecord && !empty($dbRecord->refresh_token)) {
            $refreshToken = $dbRecord->refresh_token;
        } else {
            $refreshToken = config('services.hubstaff.refresh_token');
        }

        // 3. If a refresh token is present, perform OAuth2 token exchange
        if (!empty($refreshToken)) {
            $freshToken = $this->refreshAccessToken($refreshToken);
            if (!empty($freshToken)) {
                return $freshToken;
            }
        }

        // 4. Backward compatibility fallback: static personal / access tokens
        $staticToken = config('services.hubstaff.personal_token') ?: config('services.hubstaff.access_token');
        if (!empty($staticToken)) {
            return $staticToken;
        }

        return null;
    }

    /**
     * Perform OAuth2 token refresh against Hubstaff authentication endpoint.
     * Persists new access_token, rotated refresh_token, and expires_at to pm_hubstaff_tokens.
     * NEVER logs credentials or raw token strings.
     */
    protected function refreshAccessToken(string $refreshToken): ?string
    {
        $authUrl = config('services.hubstaff.auth_url', 'https://account.hubstaff.com/access_tokens');

        try {
            $response = Http::asForm()
                ->timeout(10)
                ->acceptJson()
                ->post($authUrl, [
                    'grant_type' => 'refresh_token',
                    'refresh_token' => $refreshToken,
                ]);

            if (!$response->successful()) {
                Log::warning('Hubstaff OAuth token refresh failed', [
                    'status' => $response->status(),
                ]);
                return null;
            }

            $data = $response->json();
            $newAccessToken = $data['access_token'] ?? null;
            // Hubstaff rotates refresh tokens on each refresh
            $newRefreshToken = $data['refresh_token'] ?? $refreshToken;
            $expiresIn = (int) ($data['expires_in'] ?? 86400);
            $expiresAt = now()->timestamp + $expiresIn;

            if (empty($newAccessToken)) {
                Log::warning('Hubstaff OAuth response missing access_token');
                return null;
            }

            // Persist to singleton table pm_hubstaff_tokens (id=1)
            ProjectHubstaffToken::updateOrCreate(
                ['id' => 1],
                [
                    'access_token' => $newAccessToken,
                    'refresh_token' => $newRefreshToken,
                    'expires_at' => $expiresAt,
                    'updated_at' => now(),
                ]
            );

            return $newAccessToken;
        } catch (\Throwable $e) {
            Log::warning('Hubstaff token refresh exception', [
                'error_type' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Fetch available projects from Hubstaff API v2.
     * Supports organizations endpoint, handles pagination, and flags duplicate links.
     * Fails safely without throwing unhandled exceptions.
     */
    public function getProjects(): array
    {
        $hasConfiguredCreds = !empty(config('services.hubstaff.refresh_token')) ||
            !empty(config('services.hubstaff.personal_token')) ||
            !empty(config('services.hubstaff.access_token')) ||
            (ProjectHubstaffToken::find(1) !== null);

        $token = $this->getValidAccessToken();

        if (empty($token)) {
            if (!$hasConfiguredCreds) {
                return [
                    'configured' => false,
                    'projects' => [],
                    'message' => 'Hubstaff integration is not configured. Manual project creation is active.',
                ];
            }

            return [
                'configured' => true,
                'projects' => [],
                'error' => 'Hubstaff authentication failed or refresh token expired. Manual project creation is active.',
            ];
        }

        $baseUrl = rtrim(config('services.hubstaff.base_url', 'https://api.hubstaff.com/v2'), '/');
        $orgId = config('services.hubstaff.org_id');

        try {
            $endpoint = !empty($orgId)
                ? "{$baseUrl}/organizations/{$orgId}/projects"
                : "{$baseUrl}/projects";

            $allRawProjects = [];
            $nextStartId = null;
            $maxPages = 10; // Safety guard against runaway pagination
            $currentPage = 0;

            do {
                $currentPage++;
                $queryParams = [
                    'page_limit' => 500,
                    'status' => 'active',
                ];

                if (!empty($nextStartId)) {
                    $queryParams['page_start_id'] = $nextStartId;
                }

                $response = Http::withToken($token)
                    ->timeout(10)
                    ->acceptJson()
                    ->get($endpoint, $queryParams);

                if (!$response->successful()) {
                    Log::warning('Hubstaff projects API request failed', [
                        'status' => $response->status(),
                    ]);

                    return [
                        'configured' => true,
                        'projects' => [],
                        'error' => "Hubstaff API returned status {$response->status()}.",
                    ];
                }

                $data = $response->json();
                $pageProjects = $data['projects'] ?? [];
                $allRawProjects = array_merge($allRawProjects, $pageProjects);

                // Check pagination
                $pagination = $data['pagination'] ?? [];
                $nextStartId = $pagination['next_page_start_id'] ?? null;
            } while (!empty($nextStartId) && $currentPage < $maxPages);

            // Get existing active linked PM projects to prevent duplicate linkages
            $existingLinks = Project::whereNotNull('hubstaff_project_id')
                ->pluck('id', 'hubstaff_project_id')
                ->toArray();

            $formatted = [];
            foreach ($allRawProjects as $p) {
                $hsId = (string) ($p['id'] ?? '');
                if (empty($hsId)) continue;

                $isLinked = isset($existingLinks[$hsId]);

                $formatted[] = [
                    'id' => $hsId,
                    'name' => $p['name'] ?? 'Unnamed Project',
                    'status' => $p['status'] ?? 'active',
                    'is_already_linked' => $isLinked,
                    'linked_project_id' => $isLinked ? $existingLinks[$hsId] : null,
                ];
            }

            // Sort alphabetically by project name
            usort($formatted, fn($a, $b) => strcasecmp($a['name'], $b['name']));

            return [
                'configured' => true,
                'projects' => $formatted,
            ];
        } catch (\Throwable $e) {
            Log::warning('Hubstaff projects fetch exception', [
                'error_type' => get_class($e),
                'message' => $e->getMessage(),
            ]);

            return [
                'configured' => true,
                'projects' => [],
                'error' => 'Unable to connect to Hubstaff API. Manual project creation is active.',
            ];
        }
    }
}
