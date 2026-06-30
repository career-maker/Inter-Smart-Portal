<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IssueAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'issue_id',
        'issue_comment_id',
        'file_path',
        'file_name',
        'file_type',
    ];

    public function issue()
    {
        return $this->belongsTo(Issue::class);
    }

    public function comment()
    {
        return $this->belongsTo(IssueComment::class, 'issue_comment_id');
    }
}
