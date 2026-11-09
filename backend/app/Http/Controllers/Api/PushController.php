<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;

class PushController extends Controller
{
    /** The browser needs this key to create a push subscription. Empty means push is not set up on the server yet. */
    public function publicKey()
    {
        return response()->json(['public_key' => config('webpush.public_key')]);
    }

    /** Stores (or refreshes) this browser's subscription for the signed-in user. Body is PushSubscription.toJSON(). */
    public function subscribe(Request $request)
    {
        $data = $request->validate([
            'endpoint' => 'required|string|max:2000',
            'keys.p256dh' => 'required|string|max:255',
            'keys.auth' => 'required|string|max:255',
            'contentEncoding' => 'nullable|string|max:20',
        ]);

        PushSubscription::updateOrCreate(
            ['endpoint_hash' => hash('sha256', $data['endpoint'])],
            [
                'user_id' => $request->user()->id,
                'endpoint' => $data['endpoint'],
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
                'content_encoding' => $data['contentEncoding'] ?? 'aes128gcm',
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ]
        );

        return response()->json(['status' => 'success']);
    }

    public function unsubscribe(Request $request)
    {
        $data = $request->validate(['endpoint' => 'required|string|max:2000']);
        PushSubscription::where('endpoint_hash', hash('sha256', $data['endpoint']))
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['status' => 'success']);
    }
}
