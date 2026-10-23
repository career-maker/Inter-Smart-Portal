<?php

namespace App\Support;

use App\Models\ProjectFinance;

/** Payment state of a project, derived from its finance record and its approved payments. */
class ProjectPaymentState
{
    public const NO_RECORD = 'No finance record';
    public const ADVANCE_AWAITING = 'Advance awaiting';
    public const PENDING = 'Pending payment';
    public const PAID = 'Paid in full';

    public static function for(?ProjectFinance $finance, $payments): array
    {
        $approved = $payments->where('status', 'Approved');
        $received = (float) $approved->sum('amount');
        $value = (float) ($finance->contract_value ?? 0);

        if (! $finance) {
            $state = self::NO_RECORD;
        } elseif ($approved->where('kind', 'advance')->isEmpty()) {
            $state = self::ADVANCE_AWAITING;
        } elseif ($received < $value) {
            $state = self::PENDING;
        } else {
            $state = self::PAID;
        }

        return [
            'state' => $state,
            'contract_value' => $value,
            'received' => $received,
            'balance' => max(0, $value - $received),
        ];
    }
}
