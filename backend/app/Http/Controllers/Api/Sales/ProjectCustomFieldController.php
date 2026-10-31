<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Support\Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Extra fields on the Sales new-project form. Everyone who can open the form reads them; only the Project manager / Super Admin change them. */
class ProjectCustomFieldController extends Controller
{
    public function index(Request $request)
    {
        $rows = DB::table('project_custom_fields')->where('active', true)->orderBy('position')->orderBy('id')->get()
            ->map(fn ($f) => (array) $f + ['choices' => json_decode((string) $f->options, true) ?: []]);

        return response()->json(['data' => $rows, 'can_manage' => Access::pmoManager($request->user())]);
    }

    public function store(Request $request)
    {
        abort_unless(Access::pmoManager($request->user()), 403, 'Only the project manager or Super Admin can add fields.');
        $d = $request->validate([
            'label' => 'required|string|max:120', 'type' => ['required', Rule::in(['text', 'number', 'date', 'select'])],
            'options' => 'nullable|array', 'options.*' => 'string|max:120', 'required' => 'boolean',
        ]);
        if ($d['type'] === 'select' && empty($d['options'])) {
            return response()->json(['message' => 'Add at least one choice for a dropdown.', 'errors' => ['options' => ['Add at least one choice for a dropdown.']]], 422);
        }
        $id = DB::table('project_custom_fields')->insertGetId([
            'label' => $d['label'], 'type' => $d['type'], 'options' => $d['type'] === 'select' ? json_encode(array_values($d['options'])) : null,
            'required' => $d['required'] ?? false, 'position' => (int) DB::table('project_custom_fields')->max('position') + 1,
            'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return response()->json(['data' => DB::table('project_custom_fields')->find($id)], 201);
    }

    /** Removing hides the field from new projects; answers already saved on projects stay. */
    public function destroy(Request $request, int $id)
    {
        abort_unless(Access::pmoManager($request->user()), 403, 'Only the project manager or Super Admin can remove fields.');
        DB::table('project_custom_fields')->where('id', $id)->update(['active' => false, 'updated_at' => now()]);

        return response()->json(['message' => 'Removed.']);
    }
}
