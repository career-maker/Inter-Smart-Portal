<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommunityPostLike extends Model
{
    protected $table = 'community_post_likes';
    protected $guarded = [];

    public function post()
    {
        return $this->belongsTo(CommunityPost::class, 'post_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
