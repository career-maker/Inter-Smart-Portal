<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QaReview extends Model
{
    protected $table = 'qa_reviews';
    protected $guarded = [];
    protected $casts = ['completed_at' => 'datetime'];

    public function bugs()
    {
        return $this->hasMany(QaBug::class, 'review_id')->orderBy('id');
    }

    public function item()
    {
        return $this->belongsTo(SprintItem::class, 'sprint_item_id');
    }
}
