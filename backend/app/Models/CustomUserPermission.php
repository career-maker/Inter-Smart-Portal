<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Grants a custom permission (see CustomTeamPermission::getDefinitions) to one individual user. */
class CustomUserPermission extends Model
{
    protected $guarded = [];
}
