<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommunityPost extends Model
{
    protected $table = 'community_posts';
    protected $guarded = [];
    protected $casts = [
        'pinned' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function likes()
    {
        return $this->hasMany(CommunityPostLike::class, 'post_id');
    }

    public function comments()
    {
        return $this->hasMany(CommunityPostComment::class, 'post_id')->with('user')->latest();
    }

    public function isLikedBy($userId)
    {
        return $this->likes()->where('user_id', $userId)->exists();
    }
}
