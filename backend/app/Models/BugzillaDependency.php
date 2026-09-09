<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BugzillaDependency extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'bugzilla_dependencies';

    protected $fillable = [
        'bug_id',
        'depends_on_bug_id',
        'relationship_type',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function bug(): BelongsTo
    {
        return $this->belongsTo(BugzillaBug::class, 'bug_id');
    }

    public function dependsOnBug(): BelongsTo
    {
        return $this->belongsTo(BugzillaBug::class, 'depends_on_bug_id');
    }
}
