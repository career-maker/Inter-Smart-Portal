<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * pm_hubstaff_tokens — singleton OAuth2 token store (id is a fixed,
 * non-auto-increment primary key constrained to 1 at the DB layer).
 *
 * access_token/refresh_token are hidden from array/JSON serialization
 * by default — this table's values must never be returned by a normal
 * API response (see the "Response Format" security requirement).
 * Nothing in this stage exposes this model through a controller yet.
 */
class ProjectHubstaffToken extends Model
{
    public $incrementing = false; // id is fixed at 1, not auto-increment (see migration)
    protected $keyType = 'int';

    protected $table = 'pm_hubstaff_tokens';

    public $timestamps = false; // only updated_at exists — no created_at, see migration

    protected $fillable = [
        'id',
        'access_token',
        'refresh_token',
        'expires_at',
        'updated_at',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    protected $casts = [
        'expires_at' => 'integer',
        'updated_at' => 'datetime',
    ];
}
