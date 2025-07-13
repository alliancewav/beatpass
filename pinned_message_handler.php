<?php
header('Content-Type: application/json');

define('PINNED_MESSAGES_FILE', 'pinned_messages.json');
define('NOTE_EXPIRY_MS', 24 * 60 * 60 * 1000); // 24 hours in ms
define('MAX_NOTES_PER_ARTIST', 50); // Limit to prevent abuse

function load_data() {
    if (!file_exists(PINNED_MESSAGES_FILE)) return [];
    $json = file_get_contents(PINNED_MESSAGES_FILE);
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

function save_data($data) {
    file_put_contents(PINNED_MESSAGES_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function get_viewer() {
    // If you have a session, use it here. Otherwise, use ?viewer=username or default to 'anonymous'
    if (isset($_GET['viewer'])) return $_GET['viewer'];
    if (isset($_POST['viewer'])) return $_POST['viewer'];
    // You can add session logic here if needed
    return 'anonymous';
}

function now_ms() {
    return round(microtime(true) * 1000);
}

function cleanup_expired_notes($notes) {
    $now = now_ms();
    return array_filter($notes, function($note) use ($now) {
        return isset($note['created_at']) && ($now - $note['created_at']) <= NOTE_EXPIRY_MS;
    });
}

function get_latest_note($notes) {
    if (empty($notes)) return null;
    // Sort by created_at descending and return the latest
    usort($notes, function($a, $b) {
        return ($b['created_at'] ?? 0) - ($a['created_at'] ?? 0);
    });
    return $notes[0];
}

$data = load_data();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // GET: /?artist_id=123[&viewer=username]
    $artist_id = isset($_GET['artist_id']) ? $_GET['artist_id'] : null;
    if (!$artist_id) {
        echo json_encode(['status' => 'error', 'message' => 'Missing artist_id']);
        exit;
    }

    // Initialize artist data if doesn't exist
    if (!isset($data[$artist_id])) {
        $data[$artist_id] = ['notes' => []];
    }

    // Clean up expired notes
    $data[$artist_id]['notes'] = cleanup_expired_notes($data[$artist_id]['notes'] ?? []);
    save_data($data);

    $notes = $data[$artist_id]['notes'];
    $viewer = get_viewer();

    // Sort notes by creation time (newest first)
    usort($notes, function($a, $b) {
        return ($b['created_at'] ?? 0) - ($a['created_at'] ?? 0);
    });

    // Mark as viewed for viewer counting
    if ($viewer && $viewer !== 'anonymous') {
        foreach ($notes as &$note) {
            if (!in_array($viewer, $note['viewers'] ?? [])) {
                $note['viewers'][] = $viewer;
            }
        }
        $data[$artist_id]['notes'] = $notes;
        save_data($data);
    }

    // Get the latest note for the ring display
    $latest_note = get_latest_note($notes);

    echo json_encode([
        'status' => 'ok',
        'exists' => !empty($notes),
        'notes' => $notes,
        'total_notes' => count($notes),
        'latest_note' => $latest_note,
        // Legacy support for single note display
        'message' => $latest_note ? $latest_note['message'] : '',
        'created_at' => $latest_note ? $latest_note['created_at'] : null,
        'gradient' => $latest_note ? $latest_note['gradient'] : null,
        'actions' => $latest_note ? $latest_note['actions'] : [],
        'reactions' => $latest_note ? $latest_note['reactions'] : [],
        'viewer_count' => $latest_note ? count($latest_note['viewers'] ?? []) : 0
    ]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST; // fallback for form-encoded
    $artist_id = isset($input['artist_id']) ? $input['artist_id'] : null;
    $message = isset($input['message']) ? trim($input['message']) : null;
    $gradient = isset($input['gradient']) ? $input['gradient'] : null;
    $viewer = isset($input['viewer']) ? $input['viewer'] : null;
    $actions = isset($input['actions']) ? $input['actions'] : [];
    $reactions = isset($input['reactions']) ? $input['reactions'] : [];

    if (!$artist_id) {
        echo json_encode(['status' => 'error', 'message' => 'Missing artist_id']);
        exit;
    }

    // Initialize artist data if doesn't exist
    if (!isset($data[$artist_id])) {
        $data[$artist_id] = ['notes' => []];
    }

    // Clean up expired notes first
    $data[$artist_id]['notes'] = cleanup_expired_notes($data[$artist_id]['notes'] ?? []);

    // Handle individual note editing
    if (isset($input['edit_note']) && isset($input['note_id'])) {
        $note_id = $input['note_id'];
        
        $notes = &$data[$artist_id]['notes'];
        foreach ($notes as &$note) {
            if ($note['id'] === $note_id) {
                $note['message'] = $message;
                $note['gradient'] = $gradient;
                $note['actions'] = $actions;
                $note['reactions'] = $reactions;
                
                save_data($data);
                echo json_encode(['status' => 'ok', 'note' => $note]);
                exit;
            }
        }
        echo json_encode(['status' => 'error', 'message' => 'Note not found']);
        exit;
    }

    // Handle individual note deletion
    if (isset($input['delete_note']) && isset($input['note_id'])) {
        $note_id = $input['note_id'];
        
        $notes = &$data[$artist_id]['notes'];
        $original_count = count($notes);
        $notes = array_filter($notes, function($note) use ($note_id) {
            return $note['id'] !== $note_id;
        });
        
        if (count($notes) !== $original_count) {
            $data[$artist_id]['notes'] = array_values($notes); // Re-index array
            save_data($data);
            echo json_encode(['status' => 'ok', 'message' => 'Note deleted', 'remaining_notes' => count($notes)]);
            exit;
        }
        
        echo json_encode(['status' => 'error', 'message' => 'Note not found']);
        exit;
    }

    // Handle reactions
    if (isset($input['reaction']) && isset($input['user']) && isset($input['note_id'])) {
        $reaction = $input['reaction'];
        $user = $input['user'];
        $note_id = $input['note_id'];
        
        $notes = &$data[$artist_id]['notes'];
        foreach ($notes as &$note) {
            if ($note['id'] === $note_id) {
                if (!isset($note['reactions'])) $note['reactions'] = [];
                if (!isset($note['reactions'][$reaction])) $note['reactions'][$reaction] = [];
                
                if (in_array($user, $note['reactions'][$reaction])) {
                    $note['reactions'][$reaction] = array_values(array_diff($note['reactions'][$reaction], [$user]));
                } else {
                    $note['reactions'][$reaction][] = $user;
                }
                
                save_data($data);
                echo json_encode(['status' => 'ok', 'reactions' => $note['reactions']]);
                exit;
            }
        }
        echo json_encode(['status' => 'error', 'message' => 'Note not found']);
        exit;
    }

    // Add new note
    if ($message !== null && $message !== '') {
        // Limit number of notes per artist
        if (count($data[$artist_id]['notes']) >= MAX_NOTES_PER_ARTIST) {
            // Remove oldest notes to make room
            usort($data[$artist_id]['notes'], function($a, $b) {
                return ($a['created_at'] ?? 0) - ($b['created_at'] ?? 0);
            });
            $data[$artist_id]['notes'] = array_slice($data[$artist_id]['notes'], -MAX_NOTES_PER_ARTIST + 1);
        }

        $note_id = uniqid();
        $new_note = [
            'id' => $note_id,
            'message' => $message,
            'created_at' => now_ms(),
            'viewers' => [],
            'gradient' => $gradient,
            'actions' => $actions,
            'reactions' => $reactions
        ];

        $data[$artist_id]['notes'][] = $new_note;
        save_data($data);

        echo json_encode([
            'status' => 'ok', 
            'note' => $new_note,
            'total_notes' => count($data[$artist_id]['notes'])
        ]);
        exit;
    }

    // Delete all notes (clear timeline)
    if ($message === '' && isset($input['clear_timeline'])) {
        $data[$artist_id]['notes'] = [];
        save_data($data);
        echo json_encode(['status' => 'ok', 'message' => 'Timeline cleared']);
        exit;
    }

    echo json_encode(['status' => 'error', 'message' => 'Missing or empty message']);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid request']);