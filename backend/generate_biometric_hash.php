<?php
// Generate bcrypt hash for biometric secret
$secret = 'biometric-secret-key';
$hash = password_hash($secret, PASSWORD_BCRYPT, ['cost' => 12]);
echo "Plaintext Secret: $secret\n";
echo "Bcrypt Hash: $hash\n";
echo "\nAdd this to .env:\n";
echo "BIOMETRIC_AGENT_SECRET_HASH=$hash\n";
