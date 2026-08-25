<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectTaskCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Stored via parameter binding / Eloquent, never concatenated
            // into raw SQL — max length only guards against oversized
            // payloads, HTML/script content is stored as inert text and
            // must be escaped by the frontend renderer on output, exactly
            // like every existing comment field in this app (issue_comments,
            // leave rejection reasons, etc.).
            'comment' => ['required', 'string', 'max:5000'],
        ];
    }
}
