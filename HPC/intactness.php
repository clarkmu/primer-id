<?php

$IS_DEV = ! empty($argv[1]);
$TILDA = trim(shell_exec("echo ~"));

$ADMIN_EMAIL = "clarkmu@email.unc.edu";
$WEBSITE_URL = $IS_DEV ? "http://localhost:8080" : "https://primer-id.org";

$IS_INTACTNESS = true;
require "locations.php";

if( $IS_DEV ){
    shell_exec("mkdir -p $BASE/output");

    if( ! file_exists("$BASE/mail.php") ){
        shell_exec("cp $TILDA/code/tcs-dr/php/mail.php $BASE/mail.php");
    }

    if( strpos(shell_exec("gsutil -v"), "gsutil version") === false ){
        exit("Error: Missing gsutil in bash.  Please review requirements in README.md\n");
    }
}

require "$BASE/mail.php";

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

if( is_array($pipelines) ){
    foreach( $pipelines as $p ){
        $pipeline = new Pipeline($p);

        try{
            if ( $pipeline->hasError ){
                $pipeline->addError($pipeline->errorMessage, false);
            }else if( $pipeline->isFirstRun ){
                $pipeline->init();
            }else if( $pipeline->isDone ){
                $pipeline->mailResults();
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
        $this->data = $data;

        $this->isInitFile = ".init_intact";
        $this->isDoneFile = "intactness/execution_time.txt";
        $this->isErrorFile = "error.log";

        $this->isFirstRun = $data['submit'];

        $this->isDone = $this->getFile($this->isDoneFile) && file_get_contents("{$this->dir}/{$this->isDoneFile}") !== "init";

        $this->hasError = $this->getFile($this->isErrorFile);

        if($this->hasError){
            $this->errorMessage = file_get_contents("{$this->dir}/{$this->isErrorFile}");
        }

        // if( file_exists($this->isErrorFile) ){
        //     $this->addError("Intactness processing error:\n", false );
        // }
    }

    public function init(){

        $this->command("mkdir -p {$this->dir}");

        if( ! $this->mailReceipt() ){

            return;
        }

        $input_file = "{$this->dir}/seqs.fasta";

        file_put_contents($input_file, $this->data['sequences']);

        $cmd = "python3 -m intactness -in {$input_file} -email {$this->data['email']}";

        $this->mlog("CMD: $cmd");

        if( $GLOBALS['IS_DEV'] ){
            $this->command($cmd);
        }else{
            $cores = substr_count($this->data['sequences'], '>');
            if($cores > 8){
                $cores = 8;
            }
            $cmd = "conda run -n intactness --cwd {$GLOBALS['BASE']}/Intactness-Pipeline $cmd";
            $this->command("sbatch -o {$GLOBALS['LOG_DIR']}/{$this->id}.output --job-name=\"intact_{$this->id}\" --mem=20000 -t 1440 -n $cores --wrap=\"{$cmd}\"");
        }

        $this->getFile($this->isInitFile,1);

        $this->patchPipeline(["pending" => true, "submit" => false]);
    }

    private function generateReceipt($message, $link = ""){

        $lines = explode("\n", $this->data['sequences']);
        $namedLines = array_filter($lines, function($line) {
            return strpos($line, ">") === 0;
        });
        $nameLines = array_map(function($line) {
            return substr($line, 1);
        }, $namedLines);
        $sequenceNames = implode("<br>", $nameLines);

        $receipt = "<u>Sequences</u>:<br> {$sequenceNames}<br><br>";

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
        $email->Subject = "Intactness Submission";
        $email->AddAddress( $this->data['email'] );
        $email->AddAddress($GLOBALS["ADMIN_EMAIL"]);

        $time = "30-60 minutes, depending on number of sequences submitted";

        $email->Body = $this->generateReceipt("You will receive processed sequences via email in $time.<br><br>");

        return $email->Send();
    }

    private function mailNoResults($msg){
        $email = new PHPMailer();
        $email->isHTML(true);
        $email->SetFrom($GLOBALS["ADMIN_EMAIL"], "SwanLabWeb");
        $email->Subject = "Intactness Results";
        $email->AddAddress($this->data['email']);
        $email->Body = $this->generateReceipt($msg);
        $email->Send();

        $this->patchPipeline(["pending" => false, "submit" => false]);
        $this->getFile($this->isDoneFile,1);
    }

    public function mailResults(){

        if( $this->getFile("no_seqs_found.txt") ){
            $this->mailNoResults("All sequences were filtered out during Blast. No results will be generated.<br><br>");
            return;
        }

        if( $this->getFile("no_gaps.txt") ){
            $this->mailNoResults("No gapped position found given a position on the reference genome. No results will be generated.");
            return;
        }

        $error = "";

        $dev = $GLOBALS["IS_DEV"] ? "dev/" : "";

        $filename = "intactness-results_{$this->id}";
        if(!empty($this->data['jobID'])){
            $filename = $this->data['jobID'];
        }

        $extension = $this->data['resultsFormat'] === "tar" ? ".tar.gz" : ".zip";

        $compressedFileName = "$filename{$extension}";

        $location = "{$this->dir}/$compressedFileName";
        $gsLocation = "{$GLOBALS['BUCKET_URL']}/{$dev}{$this->id}/$compressedFileName";

        if(file_exists($location)){
            $this->command("rm $location");
        }

        if($this->data['resultsFormat'] === "zip"){
            $this->command("cd {$this->dir} && zip -r $compressedFileName $filename && cd -");
        }else{
            $this->command("tar -zcvf $location -C {$this->dir} .");
        }

        $this->command("gsutil cp $location $gsLocation");
        $this->command("rm $location");

        $signedURL = $this->command("gsutil signurl -d 7d {$GLOBALS['PRIVATE_KEY_FILE']} $gsLocation");

        $signedURL = strstr($signedURL, 'https://');

        $expiration = date('m/d/Y', strtotime('+7 days'));

        $downloadLink = "<a href='$signedURL' style='font-size: 18px;'>Download Results</a>" .
            "<br>" .
            "<small>The following links expire $expiration</small>";

        if( $this->getFile($this->isErrorFile) ){

            if( $error ){

                $error .= "<br><br>";
            }

            $error .= "There was an error processing SDRM results";
        }

        if( $error ){

            $error = "<div style='color: lightcoral; padding: 5px; font-weight: bold;'>" . $error . "</div><br>";
        }

        $email = new PHPMailer();
        $email->isHTML(true);
        $email->SetFrom($GLOBALS["ADMIN_EMAIL"], "SwanLabWeb");
        $email->Subject = "Intactness Results";
        $email->AddAddress($this->data['email']);
        $email->Body = $this->generateReceipt($downloadLink."<br><br>", $error);
        $email->Send();

        $this->patchPipeline(["pending" => false, "submit" => false]);
        $this->getFile($this->isDoneFile,1);
    }

    private function getFile($fileName, $set = false){

        if( $set )  $this->command("touch {$this->dir}/$fileName");
        else        return file_exists("{$this->dir}/$fileName");
    }

    public function addError($msg, $throw = true){

        $email = new PHPMailer();
        $email->isHTML(true);
        $email->SetFrom($GLOBALS["ADMIN_EMAIL"], "SwanLabWeb");
        $email->Subject = "Intactness ERROR";
        $email->AddAddress($GLOBALS["ADMIN_EMAIL"]);
        $email->AddAddress($this->data['email']);

        $email->Body = $msg;
        $email->Send();

        $this->patchPipeline([
            "processingError" => true,
            "pending" => false,
            "submit" => false
        ]);

        if($throw){
            $this->mlog("Error: \n\n$msg", true);
            throw new Exception("Error Processing Request", 1);
        }
    }

    public function mlog($msg, $error = false){

        $output = $GLOBALS['LOG_DIR'];

        `mkdir -p $output/{$this->id}`;

        $date = date("D M d, Y G:i");
        shell_exec("echo '[$date] $msg\n' >> $output/message_log");
        shell_exec("echo '[$date] $msg\n' >> $output/{$this->id}/message_log");
        if( $error ){
            shell_exec("echo '[$date] $msg\n' >> $output/error_log");
            shell_exec("echo '[$date] $msg\n' >> $output/error_{$this->id}/message_log");
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