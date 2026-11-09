<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Sample Unsplash images for the standard Kerala holidays. Only fills holidays that have no image yet,
 * so anything an admin uploaded is kept. Admins can replace or remove them from the Holiday form.
 */
return new class extends Migration
{
    private function u(string $id): string
    {
        return "https://images.unsplash.com/photo-{$id}?auto=format&fit=crop&w=1000&q=70";
    }

    public function up(): void
    {
        $flag    = $this->u('1532375810709-75b1da00537c');
        $flag2   = $this->u('1709545900940-f86b833d5704');
        $mosque  = $this->u('1584551246679-0daf3d275d0f');
        $mosque2 = $this->u('1763965367087-589990c8f1a3');
        $diya    = $this->u('1605292356183-a77d0a9c9d1d');
        $diya2   = $this->u('1606285461069-80ba562575dd');
        $lamp    = $this->u('1757693350857-61d31a1b77bf');
        $xmas    = $this->u('1482517967863-00e15c9b44be');
        $onam    = $this->u('1602216056096-3b40cc0c9944');
        $onam2   = $this->u('1609828913552-f9138ed9e42d');
        $church  = $this->u('1765497108822-cfbac993e446');
        $church2 = $this->u('1450558415837-1f5e21a17709');
        $labour  = $this->u('1577199001468-44c049e7603f');

        $rules = [
            'Republic Day'        => $flag,
            'Independence Day'    => $flag2,
            'Gandhi Jayanthi'     => $flag,
            'Maha Shivratri'      => $lamp,
            'Id-ul-Fitr%'         => $mosque,
            'Bakrid%'             => $mosque2,
            'Muharram'            => $mosque,
            'Milad-i-Sherif%'     => $mosque2,
            'Maundy Thursday'     => $church2,
            'Good Friday'         => $church,
            'Vishu%'              => $onam2,
            'May Day'             => $labour,
            'First Onam%'         => $onam2,
            'Thiruvonam'          => $onam,
            'Third Onam%'         => $onam2,
            'Sree Narayana Guru%' => $lamp,
            'Mahanavami%'         => $diya2,
            'Vijayadashami'       => $diya2,
            'Deepavali%'          => $diya,
            'Christmas%'          => $xmas,
        ];

        foreach ($rules as $pattern => $url) {
            DB::table('holidays')
                ->where('name', 'like', $pattern)
                ->where(function ($q) {
                    $q->whereNull('image_url')->orWhere('image_url', '');
                })
                ->update(['image_url' => $url]);
        }
    }

    public function down(): void
    {
        // Intentionally empty: sample images are plain data and may have been replaced by admins.
    }
};
