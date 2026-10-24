<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QaBug extends Model
{
    public const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

    protected $table = 'qa_bugs';
    protected $guarded = [];
}
