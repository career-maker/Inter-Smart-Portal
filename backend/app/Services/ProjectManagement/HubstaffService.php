<?php

namespace App\Services\ProjectManagement;

use App\Models\Project;
use App\Models\ProjectHubstaffToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HubstaffService
{
    /**
     * Retrieve the active authentication token.
     * Checks database singleton (pm_hubstaff_tokens id=1) first,
     * then falls back to environment configuration.
     */
    protected function getToken(): ?string
    {
        $dbToken = ProjectHubstaffToken::find(1);
        if ($dbToken && !empty($dbToken->access_token)) {
            // Check expiry if expires_at timestamp is set (expires_at is unix epoch seconds)
            if (empty($dbToken->expires_at) || $dbToken->expires_at > now()->timestamp) {
                return $dbToken->access_token;
            }
        }

        $envPersonal = config('services.hubstaff.personal_token');
        if (!empty($envPersonal)) {
            return $envPersonal;
        }

        $envAccess = config('services.hubstaff.access_token');
        if (!empty($envAccess)) {
            return $envAccess;
        }

        return null;
    }

    /**
     * Fetch available projects from Hubstaff API v2.
     * Flags existing links to prevent duplicates.
     * Fails safely without throwing unhandled exceptions.
     */
    public function getProjects(): array
    {
        $token = $this->getToken();
        if (empty($token)) {
            return [
                'configured' => false,
                'projects' => [],
                'message' => 'Hubstaff integration is not configured. Manual project creation is active.',
            ];
        }

        $baseUrl = rtrim(config('services.hubstaff.base_url', 'https://api.hubstaff.com/v2'), '/');
        $orgId = config('services.hubstaff.org_id');

        try {
            $url = !empty($orgId)
                ? "{$baseUrl}/organizations/{$orgId}/projects"
                : "{$baseUrl}/projects";

            $response = Http::withToken($token)
                ->timeout(8)
                ->acceptJson()
                ->get($url);

            if (!$response->successful()) {
                Log::warning('Hubstaff API project fetch failed', [
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);

                return [
                    'configured' => true,
                    'projects' => [],
                    'error' => "Hubstaff API returned status {$response->status()}.",
                ];
            }

            $data = $response->json();
            $rawProjects = $data['projects'] ?? [];

            // Get existing active linked PM projects to prevent duplicate linkages
            $existingLinks = Project::whereNotNull('hubstaff_project_id')
                ->pluck('id', 'hubstaff_project_id')
                ->toArray();

            $formatted = [];
            foreach ($rawProjects as $p) {
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
            Log::warning('Hubstaff connection exception', [
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
