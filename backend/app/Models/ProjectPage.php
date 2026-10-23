<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectPage extends Model
{
    public const STATUSES = [
        'Pending', 'Ongoing', 'Completed', 'Internal revision 1', 'Internal revision 2', 'Internal revision 3',
        'Waiting for feedback', 'Rejected', 'Correction 1', 'Correction 2', 'Correction 3',
    ];
    public const ANIMATION = ['None', 'Low', 'Medium', 'High'];
    public const UPDATE_TYPES = ['suggestion', 'correction', 'repeated 1', 'repeated 2', 'repeated 3'];

    protected $table = 'project_pages';
    protected $guarded = [];
    protected $casts = ['due_date' => 'date:Y-m-d'];

    public function sections()
    {
        return $this->hasMany(PageSection::class, 'page_id')->orderBy('position')->orderBy('id');
    }

    public function events()
    {
        return $this->hasMany(PageEvent::class, 'page_id')->orderByDesc('id');
    }
}
