<?php
// Only allow GET requests for this endpoint
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Extract the producer name and verification status from the request
    $producerName = $_GET['producerName'] ?? null;
    $verifiedStatus = filter_var($_GET['verifiedStatus'] ?? false, FILTER_VALIDATE_BOOLEAN);

    // Ensure the required data is provided
    if (!$producerName) {
        http_response_code(400); // Bad Request
        echo "Missing producerName";
        exit;
    }

    // Path to the JSON file
    $jsonFile = 'verifiedProducers.json';

    // Create the file if it doesn't exist
    if (!file_exists($jsonFile)) {
        file_put_contents($jsonFile, json_encode([], JSON_PRETTY_PRINT));
    }

    // Load the existing JSON data
    $data = json_decode(file_get_contents($jsonFile), true);
    if (!is_array($data)) {
        $data = [];
    }

    // Update the producer's verified status
    $data[$producerName] = $verifiedStatus;

    // Save the updated JSON data back to the file
    if (file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT))) {
        http_response_code(200); // OK
        echo "Producer added/updated successfully.";
    } else {
        http_response_code(500); // Internal Server Error
        echo "Failed to save producer to JSON.";
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo "Only GET requests are allowed.";
}
?>
