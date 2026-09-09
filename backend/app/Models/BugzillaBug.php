<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BugzillaBug extends Model
{
    use HasFactory;

    protected $table = 'bugzilla_bugs';

    public const SEVERITIES = ['BLOCKER', 'CRITICAL', 'MAJOR', 'NORMAL', 'MINOR', 'TRIVIAL'];
    public const PRIORITIES = ['P1', 'P2', 'P3', 'P4', 'P5'];
    public const STATUSES = ['UNCONFIRMED', 'NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED', 'REOPENED'];
    public const RESOLUTIONS = ['FIXED', 'INVALID', 'WONTFIX', 'DUPLICATE', 'WORKSFORME', 'INCOMPLETE'];

    protected $fillable = [
        'bug_number',
        'bugzilla_project_id',
        'portal_project_id',
        'task_id',
        'component_id',
        'reporter_id',
        'assignee_id',
        'summary',
        'description',
        'steps_to_reproduce',
        'expected_result',
        'actual_result',
        'environment',
        'browser',
        'device',
        'severity',
        'priority',
        'status',
        'resolution',
        'duplicate_of_bug_id',
        'linked_pm_bug_id',
        'resolved_at',
        'closed_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function bugzillaProject(): BelongsTo
    {
        return $this->belongsTo(BugzillaProject::class, 'bugzilla_project_id');
    }

    public function portalProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'portal_project_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'portal_project_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(BugzillaComponent::class, 'component_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function duplicateOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'duplicate_of_bug_id');
    }

    public function duplicates(): HasMany
    {
        return $this->hasMany(self::class, 'duplicate_of_bug_id');
    }

    public function linkedPmBug(): BelongsTo
    {
        return $this->belongsTo(ProjectTaskBug::class, 'linked_pm_bug_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(BugzillaComment::class, 'bug_id')->orderBy('created_at', 'asc');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(BugzillaAttachment::class, 'bug_id')->orderBy('created_at', 'desc');
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(BugzillaLabel::class, 'bugzilla_bug_label', 'bug_id', 'label_id');
    }

    public function history(): HasMany
    {
        return $this->hasMany(BugzillaHistory::class, 'bug_id')->orderBy('created_at', 'desc');
    }

    public function dependencies(): HasMany
    {
        return $this->hasMany(BugzillaDependency::class, 'bug_id');
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(BugzillaDependency::class, 'depends_on_bug_id');
    }

    public function watchers(): HasMany
    {
        return $this->hasMany(BugzillaWatcher::class, 'bug_id');
    }

    public function watchingUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'bugzilla_watchers', 'bug_id', 'user_id');
    }

    /**
     * Generate a unique sequential bug number atomically: BZ-000001
     */
    public static function generateNextBugNumber(): string
    {
        return \Illuminate\Support\Facades\DB::transaction(function () {
            // Check highest current ID to derive sequence
            $maxId = (int) (static::max('id') ?? 0);
            $candidateNum = $maxId + 1;
            $formatted = sprintf('BZ-%06d', $candidateNum);

            while (static::where('bug_number', $formatted)->exists()) {
                $candidateNum++;
                $formatted = sprintf('BZ-%06d', $candidateNum);
            }

            return $formatted;
        });
    }
}
