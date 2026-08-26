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
    /**
     * Import all active projects from Hubstaff into PM Projects without duplicating.
     */
    public function importAllProjects(\App\Models\User $actor): array
    {
        $result = $this->getProjects();
        $hubstaffProjects = $result['projects'] ?? [];

        if (empty($hubstaffProjects)) {
            return [
                'success' => false,
                'imported_count' => 0,
                'skipped_count' => 0,
                'message' => $result['error'] ?? $result['message'] ?? 'No projects found in Hubstaff to import.',
            ];
        }

        $importedCount = 0;
        $skippedCount = 0;

        foreach ($hubstaffProjects as $hsProject) {
            $hsId = (string) $hsProject['id'];
            $hsName = trim($hsProject['name']);

            if (empty($hsName)) {
                continue;
            }

            // Check if already exists by hubstaff_project_id OR exact name (case-insensitive)
            $existing = Project::where('hubstaff_project_id', $hsId)
                ->orWhere(function ($q) use ($hsName) {
                    $q->whereRaw('LOWER(TRIM(name)) = ?', [strtolower($hsName)]);
                })
                ->first();

            if ($existing) {
                // If existing project didn't have hubstaff_project_id linked, link it now
                if (empty($existing->hubstaff_project_id)) {
                    $existing->update(['hubstaff_project_id' => $hsId]);
                }
                $skippedCount++;
            } else {
                Project::create([
                    'name' => $hsName,
                    'hubstaff_project_id' => $hsId,
                    'status' => 'Active',
                    'project_type' => 'Client',
                    'start_date' => now()->toDateString(),
                    'created_by' => $actor->id,
                ]);
                $importedCount++;
            }
        }

        return [
            'success' => true,
            'total_hubstaff_projects' => count($hubstaffProjects),
            'imported_count' => $importedCount,
            'skipped_count' => $skippedCount,
            'message' => "Successfully imported {$importedCount} new projects from Hubstaff ({$skippedCount} already existed).",
        ];
    }
    /**
     * Fetch all Hubstaff members/users across all projects and merge with existing HR portal links.
     */
    public function getMembersWithUsers(): array
    {
        $token = $this->getValidAccessToken();
        if (empty($token)) {
            return [
                'configured' => false,
                'users' => [],
                'message' => 'Hubstaff integration not configured or token expired.',
            ];
        }

        $baseUrl = rtrim(config('services.hubstaff.base_url', 'https://api.hubstaff.com/v2'), '/');
        $orgId = config('services.hubstaff.org_id', 546910);

        try {
            $cacheKey = 'hubstaff_all_discovered_users_' . $orgId;
            $allUserProfiles = Cache::remember($cacheKey, 600, function () use ($baseUrl, $token, $orgId) {
                $discoveredUserIds = [];

                // 1. Get org-level members
                $orgMembersRes = Http::withToken($token)
                    ->timeout(10)
                    ->acceptJson()
                    ->get("{$baseUrl}/organizations/{$orgId}/members", ['page_limit' => 500]);

                if ($orgMembersRes->successful()) {
                    foreach ($orgMembersRes->json()['members'] ?? [] as $m) {
                        if (!empty($m['user_id'])) {
                            $discoveredUserIds[(int)$m['user_id']] = true;
                        }
                    }
                }

                // 2. Get all projects in the organization
                $projectsRes = Http::withToken($token)
                    ->timeout(10)
                    ->acceptJson()
                    ->get("{$baseUrl}/organizations/{$orgId}/projects", ['page_limit' => 500]);

                if ($projectsRes->successful()) {
                    $projects = $projectsRes->json()['projects'] ?? [];
                    // Inspect project members for active user IDs
                    foreach ($projects as $proj) {
                        $pId = $proj['id'] ?? null;
                        if (!$pId) continue;

                        $pmRes = Http::withToken($token)
                            ->timeout(5)
                            ->acceptJson()
                            ->get("{$baseUrl}/projects/{$pId}/members");

                        if ($pmRes->successful()) {
                            foreach ($pmRes->json()['members'] ?? [] as $pm) {
                                if (!empty($pm['user_id'])) {
                                    $discoveredUserIds[(int)$pm['user_id']] = true;
                                }
                            }
                        }
                    }
                }

                // 3. Retrieve user profile details for all unique user IDs
                $profiles = [];
                foreach (array_keys($discoveredUserIds) as $uid) {
                    $uRes = Http::withToken($token)
                        ->timeout(5)
                        ->acceptJson()
                        ->get("{$baseUrl}/users/{$uid}");

                    if ($uRes->successful()) {
                        $uData = $uRes->json()['user'] ?? [];
                        $profiles[] = [
                            'hubstaff_user_id' => (string) $uid,
                            'name' => $uData['name'] ?? "User #{$uid}",
                            'first_name' => $uData['first_name'] ?? null,
                            'last_name' => $uData['last_name'] ?? null,
                            'email' => $uData['email'] ?? null,
                            'status' => $uData['status'] ?? 'active',
                        ];
                    } else {
                        $profiles[] = [
                            'hubstaff_user_id' => (string) $uid,
                            'name' => "Hubstaff User #{$uid}",
                            'first_name' => null,
                            'last_name' => null,
                            'email' => null,
                            'status' => 'active',
                        ];
                    }
                }

                return $profiles;
            });

            // Load all current DB links
            $existingLinks = \App\Models\ProjectUserHubstaffLink::with([
                'user:id,first_name,last_name,email,employee_code,designation'
            ])->get()->keyBy('hubstaff_user_id');

            $hubstaffUsers = [];
            foreach ($allUserProfiles as $uData) {
                $uid = (string) $uData['hubstaff_user_id'];
                $linkedRecord = $existingLinks->get($uid);

                $hubstaffUsers[] = [
                    'hubstaff_user_id' => $uid,
                    'name' => $uData['name'],
                    'first_name' => $uData['first_name'],
                    'last_name' => $uData['last_name'],
                    'email' => $uData['email'],
                    'status' => $uData['status'] ?? 'active',
                    'linked_user' => $linkedRecord && $linkedRecord->user ? [
                        'id' => $linkedRecord->user->id,
                        'first_name' => $linkedRecord->user->first_name,
                        'last_name' => $linkedRecord->user->last_name,
                        'email' => $linkedRecord->user->email,
                        'employee_code' => $linkedRecord->user->employee_code,
                        'designation' => $linkedRecord->user->designation,
                    ] : null,
                ];
            }

            // Sort alphabetically by Hubstaff name
            usort($hubstaffUsers, fn($a, $b) => strcasecmp($a['name'], $b['name']));

            return [
                'configured' => true,
                'users' => $hubstaffUsers,
                'total_count' => count($hubstaffUsers),
            ];
        } catch (\Throwable $e) {
            Log::warning('Hubstaff getMembersWithUsers exception', [
                'error' => $e->getMessage(),
            ]);

            return [
                'configured' => true,
                'users' => [],
                'error' => 'Failed to connect to Hubstaff API: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Link or unlink a single Hubstaff user to an HR Portal employee.
     */
    public function linkUser(string $hubstaffUserId, ?int $userId, \App\Models\User $actor): array
    {
        if (empty($userId)) {
            \App\Models\ProjectUserHubstaffLink::where('hubstaff_user_id', $hubstaffUserId)->delete();
            return [
                'success' => true,
                'message' => 'Hubstaff user unlinked successfully.',
            ];
        }

        // If another record already has this hubstaff_user_id or user_id, clean it up
        \App\Models\ProjectUserHubstaffLink::where('hubstaff_user_id', $hubstaffUserId)
            ->where('user_id', '!=', $userId)
            ->delete();

        $link = \App\Models\ProjectUserHubstaffLink::updateOrCreate(
            ['user_id' => $userId],
            [
                'hubstaff_user_id' => $hubstaffUserId,
                'linked_by' => $actor->id,
                'updated_at' => now(),
            ]
        );

        return [
            'success' => true,
            'link' => $link,
            'message' => 'Employee linked with Hubstaff user successfully.',
        ];
    }

    /**
     * Batch sync multiple user mappings.
     */
    public function syncUsers(array $mappings, \App\Models\User $actor): array
    {
        $syncedCount = 0;
        foreach ($mappings as $mapping) {
            $hsId = (string) ($mapping['hubstaff_user_id'] ?? '');
            $userId = isset($mapping['user_id']) && $mapping['user_id'] ? (int) $mapping['user_id'] : null;

            if (!empty($hsId)) {
                $this->linkUser($hsId, $userId, $actor);
                $syncedCount++;
            }
        }

        return [
            'success' => true,
            'synced_count' => $syncedCount,
            'message' => "Successfully synced {$syncedCount} Hubstaff user mappings.",
        ];
    }
}
