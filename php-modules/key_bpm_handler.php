<?php
// Database credentials
$host = 'localhost';
$db = 'database-name';
$user = 'user-name';
$password = 'password';

// Connect to the database
$conn = new mysqli($host, $user, $password, $db);
if ($conn->connect_error) {
    die(json_encode(['status' => 'error', 'message' => 'Database connection failed']));
}

// Function to check for duplicate fingerprints
function checkDuplicateFingerprints($conn, $fingerprint, $fingerprint_hash, $current_track_id = '') {
    $results = [];
    
    // Check for exact hash matches (faster)
    if (!empty($fingerprint_hash)) {
        $stmt = $conn->prepare("SELECT track_id, track_name, Playback FROM track_key_bpm WHERE fingerprint_hash = ? AND track_id != ? ORDER BY track_id ASC LIMIT 5");
        $stmt->bind_param("ss", $fingerprint_hash, $current_track_id);
        $stmt->execute();
        $exact_matches = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        if (!empty($exact_matches)) {
            $results['exact_matches'] = $exact_matches;
            $results['authentic_track'] = $exact_matches[0]; // First result has lowest track_id
        }
    }
    
    // Check for similar matches using FULLTEXT if no exact match found
    if (empty($results) && !empty($fingerprint)) {
        $fingerprint_sample = substr($fingerprint, 0, 500); // Use part of the fingerprint for FULLTEXT search
        
        // Using MATCH AGAINST for similarity search
        $stmt = $conn->prepare("SELECT track_id, track_name, Playback, 
                               MATCH(fingerprint) AGAINST(? IN BOOLEAN MODE) AS score 
                               FROM track_key_bpm 
                               WHERE MATCH(fingerprint) AGAINST(? IN BOOLEAN MODE) 
                               AND track_id != ? 
                               ORDER BY score DESC LIMIT 5");
        $stmt->bind_param("sss", $fingerprint_sample, $fingerprint_sample, $current_track_id);
        $stmt->execute();
        $similar_matches = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        if (!empty($similar_matches)) {
            $results['similar_matches'] = $similar_matches;
            
            // Find match with lowest track_id
            $min_track_id = PHP_INT_MAX;
            $authentic_track = null;
            
            foreach ($similar_matches as $match) {
                $match_id = intval($match['track_id']);
                if ($match_id < $min_track_id) {
                    $min_track_id = $match_id;
                    $authentic_track = $match;
                }
            }
            
            if ($authentic_track) {
                $results['authentic_track'] = $authentic_track;
            }
        }
    }
    
    return $results;
}

// Handle POST request (Insert or Update)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $track_id = $_POST['track_id'] ?? '';
    $track_name = $_POST['track_name'] ?? '';
    $key_name = $_POST['key_name'] ?? '';
    $scale = $_POST['scale'] ?? '';
    $bpm = isset($_POST['bpm']) ? $_POST['bpm'] : null; // Don't cast yet
    $duration_ms = isset($_POST['duration_ms']) ? $_POST['duration_ms'] : null; // Duration field
    $playback_url = $_POST['playback_url'] ?? '';
    $fingerprint = $_POST['fingerprint'] ?? '';
    $producers = $_POST['producers'] ?? ''; // NEW: Producers field
    $tags = $_POST['tags'] ?? ''; // NEW: Tags field
    $fingerprint_hash = !empty($fingerprint) ? md5(substr($fingerprint, 0, 1000)) : ''; // Generate hash from first 1000 chars

    // NEW: Exclusive licensing fields
    $exclusive_price = isset($_POST['exclusive_price']) ? $_POST['exclusive_price'] : null;
    $exclusive_currency = $_POST['exclusive_currency'] ?? 'USD';
    $exclusive_status = $_POST['exclusive_status'] ?? 'not_available';
    $licensing_type = $_POST['licensing_type'] ?? 'non_exclusive_only';
    $exclusive_buyer_info = $_POST['exclusive_buyer_info'] ?? '';

    // Debug: Log all POST values for troubleshooting
    file_put_contents(__DIR__ . '/playback_debug.log', date('c') . ' ' . json_encode($_POST) . PHP_EOL, FILE_APPEND);

    // Treat bpm as empty if it is null, '', 0, '0', 'null', 'undefined', or only whitespace
    $emptyBpm = (
        is_null($bpm) ||
        $bpm === '' ||
        $bpm === 0 ||
        $bpm === '0' ||
        strtolower($bpm) === 'null' ||
        strtolower($bpm) === 'undefined' ||
        (is_string($bpm) && trim($bpm) === '')
    );

    // Treat duration_ms as empty if it is null, '', 0, '0', 'null', 'undefined', or only whitespace
    $emptyDuration = (
        is_null($duration_ms) ||
        $duration_ms === '' ||
        $duration_ms === 0 ||
        $duration_ms === '0' ||
        strtolower($duration_ms) === 'null' ||
        strtolower($duration_ms) === 'undefined' ||
        (is_string($duration_ms) && trim($duration_ms) === '')
    );

    // Treat exclusive_price as empty if it is null, '', 0, '0', 'null', 'undefined', or only whitespace
    $emptyExclusivePrice = (
        is_null($exclusive_price) ||
        $exclusive_price === '' ||
        $exclusive_price === 0 ||
        $exclusive_price === '0' ||
        strtolower($exclusive_price) === 'null' ||
        strtolower($exclusive_price) === 'undefined' ||
        (is_string($exclusive_price) && trim($exclusive_price) === '')
    );

    // If only updating playback_url
    if (
        !empty($playback_url) &&
        (!empty($track_id) || !empty($track_name)) &&
        empty($key_name) &&
        empty($scale) &&
        $emptyBpm &&
        $emptyDuration &&
        empty($producers) &&
        empty($tags)
    ) {
        if (!empty($track_id)) {
            $stmt = $conn->prepare("UPDATE track_key_bpm SET Playback = ? WHERE track_id = ?");
            $stmt->bind_param("ss", $playback_url, $track_id);
        } else {
            $stmt = $conn->prepare("UPDATE track_key_bpm SET Playback = ? WHERE track_name = ?");
            $stmt->bind_param("ss", $playback_url, $track_name);
        }
        $stmt->execute();
        if ($stmt->affected_rows > 0) {
            echo json_encode(['status' => 'success', 'message' => 'Playback URL updated']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No changes made or error occurred']);
        }
        exit;
    }

    // If only updating duration_ms
    if (
        !empty($duration_ms) &&
        (!empty($track_id) || !empty($track_name)) &&
        empty($key_name) &&
        empty($scale) &&
        $emptyBpm &&
        empty($playback_url) &&
        empty($fingerprint) &&
        empty($producers) &&
        empty($tags)
    ) {
        if (!empty($track_id)) {
            $stmt = $conn->prepare("UPDATE track_key_bpm SET duration_ms = ? WHERE track_id = ?");
            $stmt->bind_param("is", $duration_ms, $track_id);
        } else {
            $stmt = $conn->prepare("UPDATE track_key_bpm SET duration_ms = ? WHERE track_name = ?");
            $stmt->bind_param("is", $duration_ms, $track_name);
        }
        $stmt->execute();
        if ($stmt->affected_rows > 0) {
            echo json_encode(['status' => 'success', 'message' => 'Duration updated']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No changes made or error occurred']);
        }
        exit;
    }

    // NEW: If only updating producers
    if (
        !empty($producers) &&
        (!empty($track_id) || !empty($track_name)) &&
        empty($key_name) &&
        empty($scale) &&
        $emptyBpm &&
        $emptyDuration &&
        empty($playback_url) &&
        empty($fingerprint) &&
        empty($tags)
    ) {
        if (!empty($track_id)) {
            $stmt = $conn->prepare("UPDATE track_key_bpm SET producers = ? WHERE track_id = ?");
            $stmt->bind_param("ss", $producers, $track_id);
        } else {
            $stmt = $conn->prepare("UPDATE track_key_bpm SET producers = ? WHERE track_name = ?");
            $stmt->bind_param("ss", $producers, $track_name);
        }
        $stmt->execute();
        if ($stmt->affected_rows > 0) {
            echo json_encode(['status' => 'success', 'message' => 'Producers updated']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No changes made or error occurred']);
        }
        exit;
    }

    // NEW: If only updating tags
    if (
        !empty($tags) &&
        (!empty($track_id) || !empty($track_name)) &&
        empty($key_name) &&
        empty($scale) &&
        $emptyBpm &&
        $emptyDuration &&
        empty($playback_url) &&
        empty($fingerprint) &&
        empty($producers)
    ) {
        if (!empty($track_id)) {
            $stmt = $conn->prepare("UPDATE track_key_bpm SET tags = ? WHERE track_id = ?");
            $stmt->bind_param("ss", $tags, $track_id);
        } else {
            $stmt = $conn->prepare("UPDATE track_key_bpm SET tags = ? WHERE track_name = ?");
            $stmt->bind_param("ss", $tags, $track_name);
        }
        $stmt->execute();
        if ($stmt->affected_rows > 0) {
            echo json_encode(['status' => 'success', 'message' => 'Tags updated']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No changes made or error occurred']);
        }
        exit;
    }

    // NEW: If only updating exclusive licensing data
    if (
        (!$emptyExclusivePrice || !empty($exclusive_currency) || !empty($exclusive_status) || !empty($licensing_type)) &&
        (!empty($track_id) || !empty($track_name)) &&
        empty($key_name) &&
        empty($scale) &&
        $emptyBpm &&
        $emptyDuration &&
        empty($playback_url) &&
        empty($fingerprint) &&
        empty($producers) &&
        empty($tags)
    ) {
        $update_fields = [];
        $params = [];
        $types = '';
        
        if (!$emptyExclusivePrice) {
            $update_fields[] = "exclusive_price = ?";
            $params[] = floatval($exclusive_price);
            $types .= 'd';
        }
        
        if (!empty($exclusive_currency)) {
            $update_fields[] = "exclusive_currency = ?";
            $params[] = $exclusive_currency;
            $types .= 's';
        }
        
        if (!empty($exclusive_status)) {
            $update_fields[] = "exclusive_status = ?";
            $params[] = $exclusive_status;
            $types .= 's';
        }
        
        if (!empty($licensing_type)) {
            $update_fields[] = "licensing_type = ?";
            $params[] = $licensing_type;
            $types .= 's';
        }
        
        if (!empty($exclusive_buyer_info)) {
            $update_fields[] = "exclusive_buyer_info = ?";
            $params[] = $exclusive_buyer_info;
            $types .= 's';
        }
        
        // Auto-set sold date if status is changed to 'sold'
        if ($exclusive_status === 'sold') {
            $update_fields[] = "exclusive_sold_date = NOW()";
        }
        
        if (!empty($update_fields)) {
            $sql = "UPDATE track_key_bpm SET " . implode(", ", $update_fields);
            
            if (!empty($track_id)) {
                $sql .= " WHERE track_id = ?";
                $params[] = $track_id;
                $types .= 's';
            } else {
                $sql .= " WHERE track_name = ?";
                $params[] = $track_name;
                $types .= 's';
            }
            
            $stmt = $conn->prepare($sql);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                echo json_encode(['status' => 'success', 'message' => 'Exclusive licensing data updated']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'No changes made or error occurred']);
            }
            exit;
        }
    }

    // If only updating fingerprint
    if (
        !empty($fingerprint) &&
        (!empty($track_id) || !empty($track_name)) &&
        empty($key_name) &&
        empty($scale) &&
        $emptyBpm &&
        $emptyDuration &&
        empty($playback_url) &&
        empty($producers) &&
        empty($tags)
    ) {
        // Check if this is the authentic track
        $is_authentic = false;
        if (!empty($track_id)) {
            $stmt = $conn->prepare("SELECT MIN(track_id) as min_id FROM track_key_bpm WHERE fingerprint_hash = ? OR MATCH(fingerprint) AGAINST(? IN BOOLEAN MODE)");
            $fingerprint_sample = substr($fingerprint, 0, 500);
            $stmt->bind_param("ss", $fingerprint_hash, $fingerprint_sample);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            
            if ($result && $result['min_id'] == $track_id) {
                $is_authentic = true;
            }
        }
        
        // Check for duplicates
        $duplicate_results = checkDuplicateFingerprints($conn, $fingerprint, $fingerprint_hash, $track_id);
        
        // Update fingerprint and hash
        if (!empty($track_id)) {
            $stmt = $conn->prepare("UPDATE track_key_bpm SET fingerprint = ?, fingerprint_hash = ? WHERE track_id = ?");
            $stmt->bind_param("sss", $fingerprint, $fingerprint_hash, $track_id);
        } else {
            $stmt = $conn->prepare("UPDATE track_key_bpm SET fingerprint = ?, fingerprint_hash = ? WHERE track_name = ?");
            $stmt->bind_param("sss", $fingerprint, $fingerprint_hash, $track_name);
        }
        
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $response = ['status' => 'success', 'message' => 'Fingerprint updated'];
            
            // Add duplicate information if any found
            if (!empty($duplicate_results)) {
                $response['duplicate_info'] = $duplicate_results;
                $response['is_authentic'] = $is_authentic;
                
                if (!empty($duplicate_results['authentic_track'])) {
                    $response['is_duplicate'] = true;
                    
                    if ($is_authentic) {
                        // This is the original track
                        $response['message'] = 'Fingerprint updated. You own the authentic version of this track.';
                        $response['duplicate_count'] = count($duplicate_results['exact_matches'] ?? []) + count($duplicate_results['similar_matches'] ?? []);
                    } else {
                        // This is a duplicate
                        $response['message'] = 'Fingerprint updated, but this appears to be a duplicate track';
                        $response['authentic_track_id'] = $duplicate_results['authentic_track']['track_id'];
                    }
                }
            }
            
            echo json_encode($response);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'No changes made or error occurred']);
        }
        exit;
    }

    // Validation - only require key, scale, and bpm for full metadata updates
    if (empty($key_name) || empty($scale) || $bpm === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Key, Scale, and BPM are required']);
        exit;
    }

    // Insert or Update Logic
    // Check for duplicates if we have a fingerprint
    $duplicate_results = null;
    $is_authentic = false;
    
    if (!empty($fingerprint)) {
        // First check if this track is the authentic one (lowest track_id)
        if (!empty($track_id)) {
            $stmt = $conn->prepare("SELECT MIN(track_id) as min_id FROM track_key_bpm WHERE fingerprint_hash = ? OR MATCH(fingerprint) AGAINST(? IN BOOLEAN MODE)");
            $fingerprint_sample = substr($fingerprint, 0, 500);
            $stmt->bind_param("ss", $fingerprint_hash, $fingerprint_sample);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            
            if ($result && $result['min_id'] == $track_id) {
                $is_authentic = true;
            }
        }
        
        // Only check for duplicates if needed
        $duplicate_results = checkDuplicateFingerprints($conn, $fingerprint, $fingerprint_hash, $track_id);
    }
    
    // Build the query dynamically for insert/update
    // Only include fingerprint fields if they're actually provided
    $columns = [
        "track_name", "key_name", "scale", "bpm", "duration_ms", "Playback",
        "producers", "tags", "exclusive_price", "exclusive_currency", "exclusive_status", "licensing_type", "exclusive_buyer_info"
    ];

    $params = [
        $track_name, $key_name, $scale, $bpm, $duration_ms, $playback_url,
        $producers, $tags, $exclusive_price, $exclusive_currency,
        $exclusive_status, $licensing_type, $exclusive_buyer_info
    ];
    $types = "sssissssdssss";

    // Only include fingerprint fields if they have actual data
    if (!empty($fingerprint)) {
        $columns[] = "fingerprint";
        $columns[] = "fingerprint_hash";
        $params[] = $fingerprint;
        $params[] = $fingerprint_hash;
        $types .= "ss";
    }

    // Build the ON DUPLICATE KEY UPDATE clause
    $update_parts = [];
    foreach ($columns as $col) {
        // Skip fingerprint fields in updates if they weren't provided
        if (($col === 'fingerprint' || $col === 'fingerprint_hash') && empty($fingerprint)) {
            continue;
        }
        $update_parts[] = "$col = VALUES($col)";
    }

    if ($exclusive_status === 'sold') {
        // For updates, only set date if the status is changing to 'sold'
        $update_parts[] = "exclusive_sold_date = IF(exclusive_status <> 'sold', NOW(), exclusive_sold_date)";
    }
    
    // For new inserts, if status is 'sold', add NOW() to the query
    $insert_placeholders = array_map(fn($p) => '?', $params);
    if ($exclusive_status === 'sold') {
        $columns[] = 'exclusive_sold_date';
        $insert_placeholders[] = 'NOW()';
    }

    if (!empty($track_id)) {
        array_unshift($columns, 'track_id');
        array_unshift($insert_placeholders, '?');
        array_unshift($params, $track_id);
        $types = 's' . $types;
    }

    $columns_sql = implode(', ', $columns);
    $placeholders_sql = implode(', ', $insert_placeholders);
    $update_sql = implode(', ', $update_parts);
    
    $sql = "INSERT INTO track_key_bpm ($columns_sql) VALUES ($placeholders_sql) ON DUPLICATE KEY UPDATE $update_sql";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        // Handle error in statement preparation
        echo json_encode(['status' => 'error', 'message' => 'Failed to prepare statement: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param($types, ...$params);

    $stmt->execute();

    // Consider it a success even if no rows were affected (data was already up to date)
    if ($stmt->affected_rows >= 0) {
        $response = ['status' => 'success', 'message' => 'Data saved successfully'];
        
        // Add duplicate information if any found
        if (!empty($duplicate_results)) {
            $response['duplicate_info'] = $duplicate_results;
            $response['is_authentic'] = $is_authentic;
            
            if (!empty($duplicate_results['authentic_track'])) {
                $response['is_duplicate'] = true;
                
                if ($is_authentic) {
                    // This is the original track - inform about duplicates
                    $response['message'] = 'Data saved. You own the authentic version of this track.';
                    $response['duplicate_count'] = count($duplicate_results['exact_matches'] ?? []) + count($duplicate_results['similar_matches'] ?? []);
                } else {
                    // This is a duplicate - warn the user
                    $response['message'] = 'Data saved, but this appears to be a duplicate track';
                    $response['authentic_track_id'] = $duplicate_results['authentic_track']['track_id'];
                }
            }
        }
        
        echo json_encode($response);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Error occurred while saving data: ' . $stmt->error]);
    }
    exit;
}

// Handle GET request (Fetch Data)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $track_id = $_GET['track_id'] ?? '';
    $track_name = $_GET['track_name'] ?? '';
    $check_fingerprint = $_GET['check_fingerprint'] ?? '';
    
    // Special endpoint for checking if a fingerprint is a duplicate
    if (!empty($check_fingerprint)) {
        $fingerprint_hash = md5(substr($check_fingerprint, 0, 1000));
        $current_track_id = $_GET['track_id'] ?? '';
        $duplicate_results = checkDuplicateFingerprints($conn, $check_fingerprint, $fingerprint_hash, $current_track_id);
        
        // Check if this is the authentic track
        $is_authentic = false;
        if (!empty($current_track_id)) {
            $stmt = $conn->prepare("SELECT MIN(track_id) as min_id FROM track_key_bpm WHERE fingerprint_hash = ? OR MATCH(fingerprint) AGAINST(? IN BOOLEAN MODE)");
            $fingerprint_sample = substr($check_fingerprint, 0, 500);
            $stmt->bind_param("ss", $fingerprint_hash, $fingerprint_sample);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            
            if ($result && $result['min_id'] == $current_track_id) {
                $is_authentic = true;
            }
        }
        
        $response = [
            'status' => 'success', 
            'is_duplicate' => !empty($duplicate_results),
            'is_authentic' => $is_authentic
        ];
        
        if (!empty($duplicate_results)) {
            $response['duplicate_info'] = $duplicate_results;
        }
        
        echo json_encode($response);
        exit;
    }

    if (!empty($track_id)) {
        // UPDATED: Include exclusive licensing fields in the SELECT query
        $stmt = $conn->prepare("SELECT key_name, scale, bpm, duration_ms, Playback, fingerprint, fingerprint_hash, producers, tags, exclusive_price, exclusive_currency, exclusive_status, licensing_type, exclusive_buyer_info, exclusive_sold_date FROM track_key_bpm WHERE track_id = ?");
        $stmt->bind_param("s", $track_id);
    } elseif (!empty($track_name)) {
        // UPDATED: Include exclusive licensing fields in the SELECT query
        $stmt = $conn->prepare("SELECT key_name, scale, bpm, duration_ms, Playback, fingerprint, fingerprint_hash, producers, tags, exclusive_price, exclusive_currency, exclusive_status, licensing_type, exclusive_buyer_info, exclusive_sold_date FROM track_key_bpm WHERE track_name = ?");
        $stmt->bind_param("s", $track_name);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Track ID or Track Name required']);
        exit;
    }

    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();

    if ($result) {
        echo json_encode(['status' => 'success', 'data' => $result]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Track not found']);
    }
    exit;
}

// If no valid request method
echo json_encode(['status' => 'error', 'message' => 'Invalid request']);
$conn->close();
?>
