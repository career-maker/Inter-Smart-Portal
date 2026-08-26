<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommunityPostComment extends Model
{
    protected $table = 'community_post_comments';
    protected $guarded = [];
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function post()
    {
        return $this->belongsTo(CommunityPost::class, 'post_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
