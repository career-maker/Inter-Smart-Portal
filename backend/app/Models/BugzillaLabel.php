<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class BugzillaLabel extends Model
{
    use HasFactory;

    protected $table = 'bugzilla_labels';

    protected $fillable = [
        'name',
    ];

    public function bugs(): BelongsToMany
    {
        return $this->belongsToMany(BugzillaBug::class, 'bugzilla_bug_label', 'label_id', 'bug_id');
    }
}
