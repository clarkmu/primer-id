<?php

$IS_DEV = ! empty($argv[1]);
$TILDA = trim(shell_exec("echo ~"));

$ADMIN_EMAIL = "clarkmu@email.unc.edu";
$WEBSITE_URL = $IS_DEV ? "http://localhost:8080" : "https://primer-id.org";

$IS_TCSDR = true;
require "locations.php";

if( $IS_DEV ){
    shell_exec("mkdir -p $BASE/var/run/output");

    if( ! file_exists("$BASE/var/run/mail.php") ){
        shell_exec("cp $TILDA/code/tcs-dr/php/mail.php $BASE/var/run/mail.php");
    }

    if( strpos(shell_exec("gsutil -v"), "gsutil version") === false ){
        exit("Error: Missing gsutil in bash.  Please review requirements in README.md\n");
    }
}

require "$BASE/var/run/mail.php";

if( strpos(shell_exec("curl --silent $RUBY_SERVER"), "running") === false ){
    if(! $IS_DEV){
        $email = new PHPMailer();
        $email->isHTML(true);
        $email->SetFrom($GLOBALS["ADMIN_EMAIL"], "SwanLabWeb");
        $email->Subject = "Primer-ID Ruby Server Not Running";
        $email->Body = "See Subject";
        $email->Send();
    }
    exit("Error: Ruby server is not running\n");
}

if( file_exists($LOCK_FILE) ){
	exit;
}

touch($LOCK_FILE);

try{
	$pipelines = shell_exec("curl $API_URL");
    $pipelines = json_decode($pipelines, true);
}catch(Exception $e){
	$pipelines = [];
}

if( is_array($pipelines) && empty($pipelines['error']) ){
    foreach( $pipelines as $p ){
        $pipeline = new Pipeline($p);

        try{
            if( $pipeline->isFirstRun ){
                $pipeline->mlog("INIT PIPELINE RUN");
                $pipeline->init();
            }else if( $pipeline->isDoneWithDR ){
                if( $pipeline->isDR ){
                    if( ! $pipeline->ranSDRM ){
                        $pipeline->mlog("INIT PIPELINE SDRM");
                        $pipeline->processConcensus();
                        $pipeline->runSDRM();
                    }else if( $pipeline->isDoneWithSDRM ){
                        $pipeline->mlog("MAIL SDRM RESULTS");
                        $pipeline->mailResults();
                    }
                }else{
                    $pipeline->mlog("MAIL DR RESULTS");
                    $pipeline->processConcensus();
                    $pipeline->mailResults();
                }
            }else{
                $pipeline->checkForFail();
            }
        }catch(Exception $e){
            $pipeline->addError("PIPELINE PROCESSING ERROR:\n$e\n" . var_export($p,true), false);
        }
    }
}

unlink($LOCK_FILE);

class Pipeline {

    function __construct($data){

        $this->id = $data['_id'];
        $this->dir = "{$GLOBALS['SCRATCH_SPACE']}/{$this->id}";
        $this->pool = ! empty($data['pool']) ? $data['poolName'] : "TCSDR";
        $this->jobDir = "{$this->dir}/jobs";
        $this->DRDir = "{$this->jobDir}/{$this->pool}";
        $this->data = $data;

        $this->isFirstRun = $data['submit'];

        $this->isDR = count($data['primers']) === 0;

        $this->isHTSF = ! empty($data['htsf']);

        $this->isDoneWithDR = $this->doneWithDR();
        $this->isDoneWithSDRM = $this->doneWithSDRM();

        $this->ranSDRM = $this->getFile("ran_sdrm");

        if( file_exists("{$this->DRDir}/.tcs_error") ){
            $this->addError("TCS processing error:\n" . file_get_contents("{$this->DRDir}/.tcs_error") );
        }

        $this->command("mkdir -p {$this->DRDir}");
    }

    public function init(){

        $this->command("mkdir -p {$this->jobDir}");

        $this->command("mkdir -p {$GLOBALS['BASE']}/var/run/output/tcs-dr/{$this->id}");

        if( ! $this->mailReceipt() ){

            return;
        }

        if( ! empty($this->data['htsf']) ){

            $this->transferHTSFJob($this->data['htsf']);

        }else if( ! empty($this->data['dropbox']) ){

            $this->transferDropboxJobs($this->data['dropbox']);

        }else if( ! empty($this->data['uploads']) ){

            $this->transferUploadedJobs();
        }

        foreach( glob("{$this->DRDir}/*") AS $jobDir ){

            $this->mlog("JOBDIR: $jobDir");

            $name = $this->strAfterChar($jobDir);

            $this->mlog("NAME: $name");

            $cmd = $this->isDR ?
                "tcs -dr -i $jobDir" :
                "tcs -p {$this->generateJSONFile($jobDir, $name)}";

            $this->mlog("CMD: $cmd");

            if( $GLOBALS['IS_DEV'] ){
                $this->command($cmd);
            }else{
                $this->command("sbatch -o {$GLOBALS['BASE']}/var/run/output/tcs-dr/{$this->id}/{$name}.output --job-name=\"{$name}_init\" --mem=20000 -t 1440 --wrap=\"{$cmd}\"");
            }
        }

        $this->getFile("ran_dr",1);

        $this->patchPipeline(["pending" => true, "submit" => false]);
    }

    private function generateJSONFile($dir, $name){

        $primerPairs = [];

        if( ! empty($this->data['primers']) ){
            foreach($this->data['primers'] as $primer){
                array_push($primerPairs, [
                    "region" => $primer['region'],
                    "cdna" => $primer['cdna'],
                    "forward" => $primer['forward'],
                    "majority" => $primer['supermajority'],
                    "end_join" => $primer['endJoin'],
                    "end_join_option" => $primer['endJoinOption'],
                    "overlap" => $primer['endJoinOverlap'],
                    "TCS_QC" => $primer['qc'],
                    "ref_genome" => $primer['refGenome'],
                    "ref_start" => $primer['refStart'],
                    "ref_end" => $primer['refEnd'],
                    "indel" => $primer['allowIndels'],
                    "trim" => $primer['trim'],
                    "trim_ref" => $primer['trimGenome'],
                    "trim_ref_start" => $primer['trimStart'],
                    "trim_ref_end" => $primer['trimEnd']
                ]);
            }
        }

        $json = [
            'raw_sequence_dir' => $dir,
            "platform_error_rate" => $this->data['errorRate'],
            "platform_format" => $this->data['platformFormat'],
            "primer_pairs" => $primerPairs
        ];

        $jsonFile = $this->dir . "/params_{$name}.json";

        file_put_contents($jsonFile, json_encode($json));

        return $jsonFile;
    }

    private function doneWithDR(){

        if( $this->getFile("dr_done") ){

            return true;
        }

        if( count(glob("{$this->DRDir}/*/*.fastq*")) || count(glob("{$this->DRDir}/*/temp_seq")) ){

            return false;
        }

        $this->getFile("dr_done",1);

        return true;
    }

    private function doneWithSDRM(){

        return file_exists("{$this->jobDir}/temp_SDRM/.done");
    }

    public function processConcensus(){

        if( file_exists("{$this->DRDir}_log") ){

            return false;
        }

        $this->command("tcs_log {$this->DRDir}");

        if( file_exists("{$this->DRDir}_log") ){

            file_put_contents("{$this->DRDir}_log/receipt.html", $this->generateReceipt(""));
        }
    }

    public function runSDRM(){

        $temp = "{$this->jobDir}/temp";

        $this->command("mkdir -p $temp");

        $this->command("cp -R {$this->DRDir}_tcs/combined_TCS_per_lib/. $temp/");

        $cmd = "tcs_sdrm $temp";

        if($GLOBALS['IS_DEV']){
            $this->command($cmd);
        }else{
            $this->command("sbatch -o {$GLOBALS['BASE']}/var/run/output/tcs-dr/{$this->id}/SDRM.output --job-name=\"{$this->id}_SDRM\" --mem=10000 -t 720 --wrap=\"{$cmd}\"");
        }

        $this->getFile("ran_sdrm",1);
    }

    private function transferHTSFJob($htsf){

        if( ! file_exists($htsf) ){
            $this->addError("Invalid HTSF Location on job {$this->id}: $htsf");
            return;
        }

        if( substr($htsf, -1) !== "/" ){
            $htsf .= "/";
        }

        $htsfTmp = "{$this->dir}/htsftmp";

        $this->command("mkdir -p $htsfTmp");

        $this->command("cp -R {$htsf}. $htsfTmp");

        $this->sortFilesIntoJobDir($htsfTmp);

        $this->command("rm -rf $htsfTmp");
    }

    private function transferDropboxJobs($dropbox){

        $dropboxTmp = "{$this->dir}/dropboxTmp";
        $dropboxTmpFile = "$dropboxTmp/dropbox.zip";

        $this->command("mkdir -p $dropboxTmp");

        $this->command("curl -L -o $dropboxTmpFile $dropbox");

        if( file_exists($dropboxTmpFile) ){

            $this->command("unzip $dropboxTmpFile -d $dropboxTmp");

            $this->command("rm $dropboxTmpFile");

            $this->sortFilesIntoJobDir($dropboxTmp);

            if( count(glob("{$this->DRDir}/*/*.fastq*")) > 0){

                $this->command("rm -rf $dropboxTmp");
            }else{

                $this->addError("Could not download DropBox.  Please make sure url has public download access. $dropbox");
            }
        }else{

            $this->addError("Could not download DropBox.  Please make sure url has public download access. $dropbox");
        }
    }

    private function transferUploadedJobs(){

        $dev = $GLOBALS['IS_DEV'] ? "dev/" : "";

        $this->command("gsutil cp -r {$GLOBALS["BUCKET_URL"]}/$dev{$this->id}/* {$this->DRDir}");

        if( ! count(glob("{$this->DRDir}/*")) ){
            $this->addError("File uploads missing.  Uploaded files are held for 7 days.  Job ID: {$this->id}");
        }
    }

    private function sortFilesIntoJobDir($fromDir){

        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($fromDir));
        $allFiles = array_filter(iterator_to_array($iterator), function($file) {
            return $file->isFile();
        });

        $files = [];

        foreach ($allFiles as $key) {
            $files[] = $this->strAfterChar($key);
        }

        $files = implode(",", $files);
        $results = $this->command("curl -X POST {$GLOBALS['RUBY_SERVER']}/validate_file_names -H 'Content-Type: text/plain' -d '$files'", true);

        if( ! empty($results) && $results['allPass'] === true){
            foreach($allFiles as $file){
                $name = $this->strAfterChar($file);

                $pool = "";

                foreach($results['files'] as $f){
                    if($f["fileName"] === $name){
                        $pool = $f["libName"];
                        break;
                    }
                }

                $toDir = "{$this->DRDir}/$pool";

                $this->command("mkdir -p $toDir");
                $this->command("mv $file $toDir");
            }
        }else{
            $errors = "";

            foreach($results["files"] as $f){
                if( ! empty($f["errors"]) ){
                    $errors .= $f["fileName"] . "\n" . implode(", ", $f["errors"]) . "\n\n";
                }
            }

            $errors .= "Full error result: \n\n" . json_encode($results);

            $this->addError("You have the following file errors in this submission:\n\n{$errors}");
        }
    }

    private function generateReceipt($message, $link = ""){

        $receipt = "";

        if ( ! empty($this->data['htsf']) ) {
            $receipt .= "<u>HTSF Location</u>: {$this->data['htsf']}<br><u>Pool Name</u>: {$this->data['poolName']}";
        } else if ( ! empty($this->data['dropbox']) ) {
            $receipt .= "<u>DropBox URL</u>: {$this->data['dropbox']}";
        } else if ( ! empty($this->data['uploads']) ) {
            $receipt .= "<u>Uploaded Files</u>:<br>";
            foreach($this->data['uploads'] as $f){
                $receipt .= $f['fileName'] . "<br>";
            }
            $receipt .= "<br>";
        }

        $receipt .= "<br><br>";

        if( ! empty($this->data['primers']) ){
            $receipt .= "You are using the following primers.<br><br>";

            foreach($this->data['primers'] as $primer){
                $receipt .= "<u>{$primer['region']}</u><br>cDNA: {$primer['cdna']}<br>Forward: {$primer['forward']}<br><br>";
            }
        }

        $receipt = "<html><body>" .
            "Dear Primer-ID WebApp user,<br>" .
            "Thank you for using our WebApp.<br><br>" .
            "{{add_message}}" .
            $receipt .
            "{{file_download}}" .
            "If you have any questions, feel free to <a href=\"{$GLOBALS['WEBSITE_URL']}/contact\">contact us</a>.<br>" .
            "Primer-ID team @UNC" .
            "</body></html>";

        $receipt = str_replace("{{add_message}}", $message, $receipt);

        $receipt = str_replace("{{file_download}}", $link, $receipt);

        return $receipt;
    }

    private function patchPipeline($data){
        $json = json_encode([
            "_id" => $this->id,
            "patch" => $data
        ]);
        $this->command(
            "curl --request PATCH {$GLOBALS['API_URL']} " .
            '-H "Content-Type: application/json" '.
            "--data '{$json}'"
        );
    }

    private function mailReceipt(){
        $email = new PHPMailer();
        $email->isHTML(true);
        $email->FromName = "SwansLabWeb";
        $email->SetFrom($GLOBALS["ADMIN_EMAIL"], "SwanLabWeb");
        $email->Subject = "Primer-ID Submission";
        $email->AddAddress( $this->data['email'] );
        $email->AddAddress($GLOBALS["ADMIN_EMAIL"]);

        $time = empty($this->data['primers']) ? "1-2 hours" : "30-90 minutes";

        $email->Body = $this->generateReceipt("You will receive processed sequences via email in $time.<br><br>");

        return $email->Send();
    }

    public function mailResults(){

        $error = "";

        $dev = $GLOBALS["IS_DEV"] ? "dev/" : "";
        $tcsdr = count($this->data['primers']) ? "tcs" : "dr";

        $resultsID = $this->id;
        if(!empty($this->data['jobID'])){
            $resultsID = $this->data['jobID'];
        }else if(!empty($this->pool)){
            $resultsID = $this->pool;
        }

        $extension = $this->data['resultsFormat'] === "tar" ? ".tar.gz" : ".zip";
        $filename = "{$tcsdr}-results_{$resultsID}";
        $compressedFileName = "$filename{$extension}";

        $location = "{$this->dir}/$compressedFileName";
        $gsLocation = "{$GLOBALS['BUCKET_URL']}/{$dev}{$this->id}/$compressedFileName";

        if(file_exists($location)){
            $this->command("rm $location");
        }

        $this->command("rm -rf {$this->jobDir}/temp");

        $this->command("[ -f {$this->jobDir}/temp_SDRM ] && mv {$this->jobDir}/temp_SDRM {$this->DRDir}_SDRM");

        if($this->data['resultsFormat'] === "zip"){
            $this->command("cd {$this->dir} && mv jobs $filename && zip -r $compressedFileName $filename && cd -");
        }else{
            $this->command("tar -zcvf $location -C {$this->jobDir} .");
        }

        $this->command("gsutil cp $location $gsLocation");
        $this->command("rm $location");

        $signedURL = $this->command("gsutil signurl -d 7d {$GLOBALS['PRIVATE_KEY_FILE']} $gsLocation");

        $signedURL = strstr($signedURL, 'https://');

        $expiration = date('m/d/Y', strtotime('+7 days'));

        $downloadLink = "<a href='$signedURL' style='font-size: 18px;'>Download Results</a>" .
            "<br>" .
            "<small>The following links expire $expiration</small>";

        if( file_exists("{$this->DRDir}_tcs/log.html") ){
            $location = "{$this->DRDir}_tcs/log.html";
            $gsLocation = "gs://tcs-dr-reports/logs/{$this->id}/log.html";

            $this->command("gsutil cp $location $gsLocation");

            $signedURL = $this->command("gsutil signurl -d 7d {$GLOBALS['PRIVATE_KEY_FILE']} $gsLocation");
            $signedURL = strstr($signedURL, 'https://');

            $downloadLink = "<a href='{$signedURL}' style='font-size: 18px;'>View Report</a><br><br>{$downloadLink}";
        }

        if( file_exists("{$this->DRDir}_SDRM/.error") ){

            if( $error ){

                $error .= "<br><br>";
            }

            $error .= "There was an error processing SDRM results";
        }

        if( $this->getFile("error") ){

            if( $error ){

                $error .= "<br><br>";
            }

            $error .= file_get_contents("{$this->dir}/error");
        }

        if( $error ){

            $error = "<div style='color: lightcoral; padding: 5px; font-weight: bold;'>" . $error . "</div><br>";
        }

        $email = new PHPMailer();
        $email->isHTML(true);
        $email->SetFrom($GLOBALS["ADMIN_EMAIL"], "SwanLabWeb");
        $email->Subject = "Primer-ID Results";
        $email->AddAddress($this->data['email']);
        $email->Body = $this->generateReceipt($downloadLink."<br><br>", $error);
        $email->Send();

        $this->patchPipeline(["pending" => false, "submit" => false]);
        $this->getFile("ran_all",1);
    }

    public function checkForFail(){

        $this->mlog("NO ACTION FOR PIPELINE ID {$this->id}");

        /**
         * check each or current stage for job fail
         */

        // $jobStatus = $this->command("sacct --name {$this->slurmJobName}");
        // if( strpos($jobStatus, "FAILED") !== FALSE ){
        //     $this->addError(
        //         "This OGV-Dating submission has failed. The error output is available below.</br></br>" .
        //         file_get_contents($this->slurmOutput)
        //     );
        // }else{
        //     $this->mlog("NO ACTION FOR PIPELINE ID {$this->id}");
        // }
    }

    private function getFile($fileName, $set = false){

        if( $set )  $this->command("touch {$this->dir}/$fileName");
        else        return file_exists("{$this->dir}/$fileName");
    }

    public function addError($msg, $throw = true){

        $email = new PHPMailer();
        $email->isHTML(true);
        $email->SetFrom($GLOBALS["ADMIN_EMAIL"], "SwanLabWeb");
        $email->Subject = "Primer-ID ERROR";
        $email->AddAddress($GLOBALS["ADMIN_EMAIL"]);
        $email->AddAddress($this->data['email']);

        $email->Body = $msg;
        $email->Send();

        $this->patchPipeline(["processingError" => true]);

        if($throw){
            $this->mlog("Error: \n\n$msg", true);
            throw new Exception("Error Processing Request", 1);
        }
    }

    private function strAfterChar($str, $char = "/"){

        return substr($str, strrpos($str, $char) + 1);
    }

    public function mlog($msg, $error = false){

        $output = "{$GLOBALS['BASE']}/var/run/output/tcs-dr";

        `mkdir -p $output/{$this->id}`;

        $date = date("D M d, Y G:i");
        shell_exec("echo '[$date] $msg\n' >> $output/message_log");
        shell_exec("echo '[$date] $msg\n' >> $output/{$this->id}/message_log");
        if( $error ){
            shell_exec("echo '[$date] $msg\n' >> $output/error_log");
            shell_exec("echo '[$date] $msg\n' >> $output/{$this->id}/error_log");
        }
        echo $msg . "\n\n";
    }

    private function command($cmd, $decode = false){

        $this->mlog($cmd);
        $se = shell_exec($cmd);
        return $decode ? json_decode($se, true) : $se;
    }
}

?>