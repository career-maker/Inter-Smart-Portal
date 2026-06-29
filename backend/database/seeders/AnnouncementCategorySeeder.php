<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AnnouncementCategory;

class AnnouncementCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ["name" => "Company Announcement", "badge_style" => "bg-blue-100 text-blue-700 border-blue-200",      "card_style" => "border-l-blue-400"],
            ["name" => "Birthday",             "badge_style" => "bg-pink-100 text-pink-700 border-pink-200",      "card_style" => "border-l-pink-400"],
            ["name" => "Work Anniversary",     "badge_style" => "bg-purple-100 text-purple-700 border-purple-200", "card_style" => "border-l-purple-400"],
            ["name" => "Holiday Notice",       "badge_style" => "bg-green-100 text-green-700 border-green-200",   "card_style" => "border-l-green-400"],
            ["name" => "Emergency Notice",     "badge_style" => "bg-red-100 text-red-700 border-red-200",         "card_style" => "border-l-red-500"],
            ["name" => "Event Invitation",     "badge_style" => "bg-amber-100 text-amber-700 border-amber-200",   "card_style" => "border-l-amber-400"],
            ["name" => "Training Program",     "badge_style" => "bg-teal-100 text-teal-700 border-teal-200",      "card_style" => "border-l-teal-400"],
            ["name" => "Policy Update",        "badge_style" => "bg-slate-100 text-slate-700 border-slate-200",   "card_style" => "border-l-slate-400"],
        ];

        foreach ($categories as $cat) {
            AnnouncementCategory::updateOrCreate(['name' => $cat['name']], $cat);
        }
    }
}
