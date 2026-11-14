<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;

/**
 * Side-menu arrangement per role, set by the Super Admin. Display only: it hides/reorders menu
 * entries, it never grants or removes access (pages and API keep their own checks).
 */
class MenuLayoutController extends Controller
{
    private const KEY = 'menu_layout';
    private const ROLES = ['Team Lead', 'Employee'];

    private function all(): array
    {
        $raw = SystemSetting::where('key', self::KEY)->value('value');
        $data = $raw ? json_decode($raw, true) : [];
        return is_array($data) ? $data : [];
    }

    public function show()
    {
        return response()->json(['layouts' => (object) $this->all()]);
    }

    public function update(Request $request)
    {
        abort_unless($request->user()->hasRole('Super Admin'), 403, 'Only the Super Admin can arrange the menu.');

        $data = $request->validate([
            'role' => 'required|in:' . implode(',', self::ROLES),
            'layout' => 'nullable|array',
            'layout.groups' => 'array|max:60',
            'layout.groups.*' => 'string|max:80',
            'layout.items' => 'array|max:60',
            'layout.items.*' => 'array|max:80',
            'layout.items.*.*' => 'string|max:200',
            'layout.hiddenGroups' => 'array|max:60',
            'layout.hiddenGroups.*' => 'string|max:80',
            'layout.hiddenItems' => 'array|max:400',
            'layout.hiddenItems.*' => 'string|max:200',
        ]);

        $all = $this->all();
        if (empty($data['layout'])) {
            unset($all[$data['role']]); // reset to the default menu
        } else {
            $l = $data['layout'];
            $all[$data['role']] = [
                'groups' => array_values($l['groups'] ?? []),
                'items' => (object) ($l['items'] ?? []),
                'hiddenGroups' => array_values($l['hiddenGroups'] ?? []),
                'hiddenItems' => array_values($l['hiddenItems'] ?? []),
            ];
        }
        SystemSetting::updateOrCreate(['key' => self::KEY], ['value' => json_encode($all)]);

        return response()->json(['layouts' => (object) $all]);
    }
}
