<?php

$LOCK_FILE = "./LOCK_API_CHECK";

require "./mail.php";

if( file_exists($LOCK_FILE) ){
    exit;
}

touch($LOCK_FILE);

$staleSubmissions = [
    // "key" => $msg,
];

$oneDayAgo = new DateTime('1 day ago');

# CHECK APIs
foreach (["tcsdr", "ogv", "intactness"] as $url) {
    try{
        $data = shell_exec("curl https://primer-id.org/api/$url");
        $data = json_decode($data, true);

        if( count($data) == 0 ){
            continue;
        }

        $filterStale = array_filter($data, function($item) {
            $updatedAt = DateTime::createFromFormat('Y-m-d H:i:s', $item['createdAt']);
            return $updatedAt < $oneDayAgo;
        });

        $c = count($filterStale);

        if( $c > 0 ){
            $staleSubmissions[$url] = "({$c}) Stale submissions at API endpoint {$url}.";
        }
    }catch(Exception $e){
        $staleSubmissions[$url] = "Failed to fetch $url";
    }
}

#CHECK CRONS
$cronList = shell_exec("squeue -u rc_swans.svc -t PENDING");
foreach (["cronTCS", "cronPhyl", "cronOGV", "cronInta"] as $cronName){
    if (strpos($cronList, $cronName) === false) {
        $staleSubmissions[$cronName] = "Cron is not running: {$cronName}";
    }
}

if( count($staleSubmissions) ){
    $email = new PHPMailer();
    $email->isHTML(true);
    $email->FromName = "SwansLabWeb";
    $email->SetFrom("clarkmu@unc.edu");
    $email->Subject = "API Stale Submissions";

    $body = "<h1>Stale Submissions</h1>";

    foreach ($staleSubmissions as $title => $msg) {
        $body .= "</br></br>{$msg}";
    }

    $email->Body = $body;

    $email->Send();
}

?>